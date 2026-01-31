/**
 * Browser-based face detection using TensorFlow.js
 * Uses npm packages instead of CDN
 */

import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

let blazefaceModel: blazeface.BlazeFaceModel | null = null;
let modelLoading: Promise<blazeface.BlazeFaceModel> | null = null;

async function getBlazefaceModel(): Promise<blazeface.BlazeFaceModel> {
  if (blazefaceModel) return blazefaceModel;

  // Prevent multiple simultaneous loads
  if (modelLoading) {
    return modelLoading;
  }

  modelLoading = (async () => {
    try {
      console.log('[FaceDetection] Setting up TensorFlow.js backend...');
      await tf.ready();
      console.log('[FaceDetection] TensorFlow.js ready, backend:', tf.getBackend());

      console.log('[FaceDetection] Loading BlazeFace model...');
      blazefaceModel = await blazeface.load();
      console.log('[FaceDetection] BlazeFace model ready');

      return blazefaceModel;
    } catch (error) {
      console.error('[FaceDetection] Failed to load model:', error);
      modelLoading = null;
      throw error;
    }
  })();

  return modelLoading;
}

export interface FaceDetectionResult {
  hasFace: boolean;
  faceCount: number;
  confidence: number;
  boundingBox?: {
    topLeft: [number, number];
    bottomRight: [number, number];
  };
  landmarks?: {
    rightEye: [number, number];
    leftEye: [number, number];
    nose: [number, number];
    mouth: [number, number];
    rightEar: [number, number];
    leftEar: [number, number];
  };
  quality: {
    isCentered: boolean;
    isWellLit: boolean;
    isClear: boolean;
    faceSize: 'too_small' | 'good' | 'too_large';
  };
  score: number;
}

/**
 * Resize image if too large (for faster processing)
 */
function resizeImageIfNeeded(
  image: HTMLImageElement,
  maxSize: number = 1024
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  let { naturalWidth: width, naturalHeight: height } = image;

  // Resize if too large
  if (width > maxSize || height > maxSize) {
    const scale = maxSize / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
}

/**
 * Detect faces in an image
 */
export async function detectFaces(
  imageSource: HTMLImageElement | HTMLCanvasElement | string
): Promise<FaceDetectionResult> {
  try {
    console.log('[FaceDetection] Starting face detection...');

    const model = await getBlazefaceModel();

    let imageElement: HTMLImageElement;
    if (typeof imageSource === 'string') {
      console.log('[FaceDetection] Loading image from data URL...');
      imageElement = await loadImage(imageSource);
    } else if (imageSource instanceof HTMLCanvasElement) {
      // Convert canvas to image
      const dataUrl = imageSource.toDataURL();
      imageElement = await loadImage(dataUrl);
    } else {
      imageElement = imageSource;
    }

    const { naturalWidth, naturalHeight } = imageElement;
    console.log(`[FaceDetection] Image size: ${naturalWidth}x${naturalHeight}`);

    // Resize for faster processing
    let processCanvas: HTMLCanvasElement;
    if (naturalWidth > 1024 || naturalHeight > 1024) {
      console.log('[FaceDetection] Resizing image for processing...');
      processCanvas = resizeImageIfNeeded(imageElement, 1024);
    } else {
      processCanvas = resizeImageIfNeeded(imageElement, Math.max(naturalWidth, naturalHeight));
    }

    console.log('[FaceDetection] Running face detection...');
    const predictions = await model.estimateFaces(processCanvas, false);
    console.log(`[FaceDetection] Found ${predictions.length} face(s)`);

    if (predictions.length === 0) {
      return {
        hasFace: false,
        faceCount: 0,
        confidence: 0,
        quality: {
          isCentered: false,
          isWellLit: false,
          isClear: false,
          faceSize: 'too_small',
        },
        score: 0,
      };
    }

    // Get the face with highest confidence
    const face = predictions.reduce((best, current) => {
      const bestProb = Array.isArray(best.probability) ? best.probability[0] : best.probability;
      const currentProb = Array.isArray(current.probability) ? current.probability[0] : current.probability;
      return (currentProb as number) > (bestProb as number) ? current : best;
    });

    const confidence = Array.isArray(face.probability) 
      ? face.probability[0] as number 
      : face.probability as number;
    
    console.log(`[FaceDetection] Best face confidence: ${(confidence * 100).toFixed(1)}%`);

    const topLeft = face.topLeft as [number, number];
    const bottomRight = face.bottomRight as [number, number];

    // Scale bounding box back to original size
    const scaleX = naturalWidth / processCanvas.width;
    const scaleY = naturalHeight / processCanvas.height;

    const scaledTopLeft: [number, number] = [topLeft[0] * scaleX, topLeft[1] * scaleY];
    const scaledBottomRight: [number, number] = [bottomRight[0] * scaleX, bottomRight[1] * scaleY];

    const faceWidth = scaledBottomRight[0] - scaledTopLeft[0];
    const faceHeight = scaledBottomRight[1] - scaledTopLeft[1];
    const faceCenterX = scaledTopLeft[0] + faceWidth / 2;
    const faceCenterY = scaledTopLeft[1] + faceHeight / 2;

    const isCentered =
      Math.abs(faceCenterX - naturalWidth / 2) < naturalWidth * 0.25 &&
      Math.abs(faceCenterY - naturalHeight / 2) < naturalHeight * 0.3;

    const faceArea = faceWidth * faceHeight;
    const imageArea = naturalWidth * naturalHeight;
    const faceRatio = faceArea / imageArea;

    console.log(`[FaceDetection] Face ratio: ${(faceRatio * 100).toFixed(1)}% of image`);

    let faceSize: 'too_small' | 'good' | 'too_large';
    if (faceRatio < 0.02) {
      faceSize = 'too_small';
    } else if (faceRatio > 0.7) {
      faceSize = 'too_large';
    } else {
      faceSize = 'good';
    }

    const isWellLit = checkBrightness(processCanvas);
    const isClear = confidence > 0.7;

    let score = confidence * 100;
    if (!isCentered) score -= 10;
    if (faceSize !== 'good') score -= 15;
    if (!isWellLit) score -= 10;
    if (predictions.length > 1) score -= 5;

    score = Math.max(0, Math.min(100, score));

    // Parse landmarks
    const landmarks = face.landmarks as number[][] | undefined;
    let parsedLandmarks;

    if (landmarks && landmarks.length >= 6) {
      parsedLandmarks = {
        rightEye: [landmarks[0][0] * scaleX, landmarks[0][1] * scaleY] as [number, number],
        leftEye: [landmarks[1][0] * scaleX, landmarks[1][1] * scaleY] as [number, number],
        nose: [landmarks[2][0] * scaleX, landmarks[2][1] * scaleY] as [number, number],
        mouth: [landmarks[3][0] * scaleX, landmarks[3][1] * scaleY] as [number, number],
        rightEar: [landmarks[4][0] * scaleX, landmarks[4][1] * scaleY] as [number, number],
        leftEar: [landmarks[5][0] * scaleX, landmarks[5][1] * scaleY] as [number, number],
      };
    }

    console.log(`[FaceDetection] Final score: ${Math.round(score)}%`);

    return {
      hasFace: true,
      faceCount: predictions.length,
      confidence,
      boundingBox: { topLeft: scaledTopLeft, bottomRight: scaledBottomRight },
      landmarks: parsedLandmarks,
      quality: {
        isCentered,
        isWellLit,
        isClear,
        faceSize,
      },
      score: Math.round(score),
    };
  } catch (error) {
    console.error('[FaceDetection] Error:', error);
    return {
      hasFace: false,
      faceCount: 0,
      confidence: 0,
      quality: {
        isCentered: false,
        isWellLit: false,
        isClear: false,
        faceSize: 'too_small',
      },
      score: 0,
    };
  }
}

/**
 * Compare two faces for similarity
 */
export async function compareFaces(
  image1: HTMLImageElement | HTMLCanvasElement | string,
  image2: HTMLImageElement | HTMLCanvasElement | string
): Promise<{
  match: boolean;
  similarity: number;
  face1Detected: boolean;
  face2Detected: boolean;
}> {
  console.log('[FaceDetection] Comparing faces...');

  const [result1, result2] = await Promise.all([
    detectFaces(image1),
    detectFaces(image2),
  ]);

  console.log(`[FaceDetection] Face 1 detected: ${result1.hasFace}, Face 2 detected: ${result2.hasFace}`);

  if (!result1.hasFace || !result2.hasFace) {
    return {
      match: false,
      similarity: 0,
      face1Detected: result1.hasFace,
      face2Detected: result2.hasFace,
    };
  }

  if (!result1.landmarks || !result2.landmarks) {
    // If no landmarks, use confidence as rough similarity
    const avgConfidence = (result1.confidence + result2.confidence) / 2;
    return {
      match: avgConfidence > 0.8,
      similarity: avgConfidence,
      face1Detected: true,
      face2Detected: true,
    };
  }

  const similarity = calculateLandmarkSimilarity(
    result1.landmarks,
    result1.boundingBox!,
    result2.landmarks,
    result2.boundingBox!
  );

  console.log(`[FaceDetection] Face similarity: ${(similarity * 100).toFixed(1)}%`);

  return {
    match: similarity > 0.65,
    similarity,
    face1Detected: true,
    face2Detected: true,
  };
}

function calculateLandmarkSimilarity(
  landmarks1: NonNullable<FaceDetectionResult['landmarks']>,
  box1: NonNullable<FaceDetectionResult['boundingBox']>,
  landmarks2: NonNullable<FaceDetectionResult['landmarks']>,
  box2: NonNullable<FaceDetectionResult['boundingBox']>
): number {
  const normalize = (
    point: [number, number],
    box: { topLeft: [number, number]; bottomRight: [number, number] }
  ): [number, number] => {
    const width = box.bottomRight[0] - box.topLeft[0];
    const height = box.bottomRight[1] - box.topLeft[1];
    if (width === 0 || height === 0) return [0.5, 0.5];
    return [
      (point[0] - box.topLeft[0]) / width,
      (point[1] - box.topLeft[1]) / height,
    ];
  };

  const points1 = [
    normalize(landmarks1.rightEye, box1),
    normalize(landmarks1.leftEye, box1),
    normalize(landmarks1.nose, box1),
    normalize(landmarks1.mouth, box1),
  ];

  const points2 = [
    normalize(landmarks2.rightEye, box2),
    normalize(landmarks2.leftEye, box2),
    normalize(landmarks2.nose, box2),
    normalize(landmarks2.mouth, box2),
  ];

  let totalDistance = 0;
  for (let i = 0; i < points1.length; i++) {
    const dx = points1[i][0] - points2[i][0];
    const dy = points1[i][1] - points2[i][1];
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }

  const avgDistance = totalDistance / points1.length;
  const similarity = Math.max(0, 1 - avgDistance * 1.5);
  return similarity;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log(`[FaceDetection] Image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
      resolve(img);
    };
    img.onerror = (e) => {
      console.error('[FaceDetection] Image load error:', e);
      reject(new Error('Failed to load image'));
    };
    img.src = src;
  });
}

function checkBrightness(canvas: HTMLCanvasElement): boolean {
  try {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalBrightness = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const avgBrightness = totalBrightness / pixelCount;
    console.log(`[FaceDetection] Average brightness: ${avgBrightness.toFixed(1)}`);

    return avgBrightness > 50 && avgBrightness < 220;
  } catch (error) {
    console.error('[FaceDetection] Brightness check error:', error);
    return true;
  }
}

/**
 * Validate image quality for KYC
 */
export async function validateKYCImage(
  imageSource: string,
  type: 'id' | 'selfie'
): Promise<{
  valid: boolean;
  issues: string[];
  faceDetection?: FaceDetectionResult;
}> {
  const issues: string[] = [];

  console.log(`[FaceDetection] Validating ${type} image...`);

  let image: HTMLImageElement;
  try {
    image = await loadImage(imageSource);
  } catch (error) {
    console.error('[FaceDetection] Failed to load image:', error);
    return { valid: false, issues: ['Image failed to load'] };
  }

  // Check minimum dimensions
  if (image.naturalWidth < 200 || image.naturalHeight < 200) {
    issues.push('Image resolution too low (minimum 200x200)');
  }

  // For selfie, check face detection
  if (type === 'selfie') {
    const faceResult = await detectFaces(image);

    if (!faceResult.hasFace) {
      issues.push('No face detected in the image');
    } else {
      if (faceResult.faceCount > 2) {
        issues.push('Too many faces detected - please use a photo with only your face');
      }
      if (!faceResult.quality.isCentered) {
        issues.push('Face is not centered in the image');
      }
      if (faceResult.quality.faceSize === 'too_small') {
        issues.push('Face is too small - please move closer to the camera');
      }
      if (faceResult.quality.faceSize === 'too_large') {
        issues.push('Face is too close - please move back from the camera');
      }
      if (!faceResult.quality.isWellLit) {
        issues.push('Image appears too dark or too bright');
      }
      if (faceResult.confidence < 0.5) {
        issues.push('Face detection confidence is low - please use a clearer photo');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      faceDetection: faceResult,
    };
  }

  // For ID documents, just basic checks
  return {
    valid: issues.length === 0,
    issues,
  };
}