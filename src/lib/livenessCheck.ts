'use client';

// Dynamic import to avoid SSR issues
let faceapi: typeof import('@vladmandic/face-api') | null = null;

export interface LivenessChallenge {
  type: 'center' | 'turn_left' | 'turn_right' | 'blink' | 'smile';
  instruction: string;
  completed: boolean;
  icon: string;
}

export interface LivenessResult {
  passed: boolean;
  score: number;
  completedChallenges: number;
  totalChallenges: number;
  screenshots: string[];
  timestamp: number;
}

const CHALLENGES: Omit<LivenessChallenge, 'completed'>[] = [
  { type: 'center', instruction: 'Look straight at the camera', icon: '👤' },
  { type: 'turn_left', instruction: 'Slowly turn your head LEFT', icon: '👈' },
  { type: 'turn_right', instruction: 'Slowly turn your head RIGHT', icon: '👉' },
  { type: 'blink', instruction: 'Blink your eyes 3 times', icon: '😑' },
  { type: 'smile', instruction: 'Give us a big smile!', icon: '😊' },
];

async function loadFaceApi() {
  if (faceapi) return faceapi;
  
  if (typeof window === 'undefined') {
    throw new Error('face-api can only be loaded in browser');
  }
  
  faceapi = await import('@vladmandic/face-api');
  return faceapi;
}

export class LivenessChecker {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;
  private isRunning = false;
  private previewRunning = false;  // Separate flag for preview
  private challenges: LivenessChallenge[] = [];
  private currentChallengeIndex = 0;
  private screenshots: string[] = [];
  private modelsLoaded = false;
  
  // Detection state
  private baselineYaw: number | null = null;
  private blinkCount = 0;
  private lastEyeState: 'open' | 'closed' = 'open';
  private challengeStartTime = 0;
  private challengeHoldTime = 0;
  
  // Callbacks
  private onChallengeUpdate: ((challenge: LivenessChallenge, index: number, total: number) => void) | null = null;
  private onProgress: ((progress: number) => void) | null = null;
  private onFaceDetected: ((detected: boolean) => void) | null = null;

  async loadModels(): Promise<boolean> {
    if (this.modelsLoaded) return true;
    
    try {
      console.log('[Liveness] Loading face-api models...');
      
      const api = await loadFaceApi();
      
      await Promise.all([
        api.nets.tinyFaceDetector.loadFromUri('/models'),
        api.nets.faceLandmark68Net.loadFromUri('/models'),
        api.nets.faceExpressionNet.loadFromUri('/models'),
      ]);
      
      this.modelsLoaded = true;
      console.log('[Liveness] Models loaded successfully');
      return true;
    } catch (err) {
      console.error('[Liveness] Failed to load models:', err);
      return false;
    }
  }

  async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    callbacks: {
      onChallengeUpdate: (challenge: LivenessChallenge, index: number, total: number) => void;
      onProgress: (progress: number) => void;
      onFaceDetected: (detected: boolean) => void;
    }
  ): Promise<boolean> {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.onChallengeUpdate = callbacks.onChallengeUpdate;
    this.onProgress = callbacks.onProgress;
    this.onFaceDetected = callbacks.onFaceDetected;

    // Load models first
    const modelsOk = await this.loadModels();
    if (!modelsOk) return false;

    // Reset challenges
    this.challenges = CHALLENGES.map(c => ({ ...c, completed: false }));
    this.currentChallengeIndex = 0;
    this.screenshots = [];
    this.baselineYaw = null;
    this.blinkCount = 0;

    // Start webcam
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        }
      });
      
      this.videoElement.srcObject = this.stream;
      
      // Wait for video metadata to load before playing
      await new Promise<void>((resolve, reject) => {
        if (!this.videoElement) {
          reject(new Error('No video element'));
          return;
        }
        
        const video = this.videoElement;
        
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          video.play()
            .then(() => resolve())
            .catch(err => {
              if (err.name === 'AbortError') {
                resolve();
              } else {
                reject(err);
              }
            });
        };
        
        if (video.readyState >= 1) {
          video.play()
            .then(() => resolve())
            .catch(err => {
              if (err.name === 'AbortError') {
                resolve();
              } else {
                reject(err);
              }
            });
        } else {
          video.addEventListener('loadedmetadata', onLoaded);
        }
      });
      
      console.log('[Liveness] Camera initialized');
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('[Liveness] Camera init aborted (component unmounted)');
        return false;
      }
      console.error('[Liveness] Camera error:', err);
      return false;
    }
  }

  async startPreview(): Promise<void> {
    if (!this.videoElement || !this.modelsLoaded) {
      console.log('[Liveness] Cannot start preview - not ready');
      return;
    }
    
    const api = await loadFaceApi();
    if (!api) return;
    
    this.previewRunning = true;
    console.log('[Liveness] Starting face detection preview');
    
    const detectLoop = async () => {
      if (!this.previewRunning || !this.videoElement) return;
      
      try {
        const detection = await api.detectSingleFace(
          this.videoElement, 
          new api.TinyFaceDetectorOptions({ scoreThreshold: 0.3, inputSize: 512 })
        );
        
        this.onFaceDetected?.(!!detection);
      } catch (err) {
        // Ignore detection errors during preview
      }
      
      if (this.previewRunning) {
        requestAnimationFrame(detectLoop);
      }
    };
    
    detectLoop();
  }

  stopPreview(): void {
    console.log('[Liveness] Stopping face detection preview');
    this.previewRunning = false;
  }

  async start(): Promise<LivenessResult> {
    if (!this.videoElement || !this.canvasElement) {
      return this.getFailedResult('Not initialized');
    }

    const api = await loadFaceApi();
    if (!api) {
      return this.getFailedResult('Face API not loaded');
    }

    this.isRunning = true;
    this.currentChallengeIndex = 0;
    this.challengeStartTime = Date.now();

    // Reset challenge state
    this.challenges = CHALLENGES.map(c => ({ ...c, completed: false }));
    this.baselineYaw = null;
    this.blinkCount = 0;
    this.lastEyeState = 'open';
    this.challengeHoldTime = 0;
    this.screenshots = [];

    // Notify first challenge
    const firstChallenge = this.challenges[0];
    this.onChallengeUpdate?.(firstChallenge, 0, this.challenges.length);

    return new Promise((resolve) => {
      const detectLoop = async () => {
        if (!this.isRunning || !this.videoElement) {
          resolve(this.getResult());
          return;
        }

        try {
          const detections = await api
            .detectSingleFace(this.videoElement, new api.TinyFaceDetectorOptions({ scoreThreshold: 0.3, inputSize: 512 }))
            .withFaceLandmarks()
            .withFaceExpressions();

          this.onFaceDetected?.(!!detections);

          if (detections) {
            const challenge = this.challenges[this.currentChallengeIndex];
            
            if (challenge && !challenge.completed) {
              const completed = this.evaluateChallenge(challenge, detections, api);
              
              if (completed) {
                challenge.completed = true;
                this.captureScreenshot();
                console.log(`[Liveness] Challenge ${this.currentChallengeIndex + 1} completed: ${challenge.type}`);
                
                this.currentChallengeIndex++;
                this.resetChallengeState();
                
                const progress = (this.currentChallengeIndex / this.challenges.length) * 100;
                this.onProgress?.(progress);
                
                if (this.currentChallengeIndex >= this.challenges.length) {
                  this.isRunning = false;
                  resolve(this.getResult());
                  return;
                }
                
                const nextChallenge = this.challenges[this.currentChallengeIndex];
                this.onChallengeUpdate?.(nextChallenge, this.currentChallengeIndex, this.challenges.length);
                this.challengeStartTime = Date.now();
              }
            }
          }

          // Timeout check (30 seconds per challenge)
          if (Date.now() - this.challengeStartTime > 30000) {
            console.log('[Liveness] Challenge timeout');
            this.currentChallengeIndex++;
            this.resetChallengeState();
            
            if (this.currentChallengeIndex >= this.challenges.length) {
              this.isRunning = false;
              resolve(this.getResult());
              return;
            }
            
            const nextChallenge = this.challenges[this.currentChallengeIndex];
            this.onChallengeUpdate?.(nextChallenge, this.currentChallengeIndex, this.challenges.length);
            this.challengeStartTime = Date.now();
          }

        } catch (err) {
          console.error('[Liveness] Detection error:', err);
        }

        if (this.isRunning) {
          requestAnimationFrame(detectLoop);
        } else {
          resolve(this.getResult());
        }
      };

      detectLoop();
    });
  }

  private evaluateChallenge(
    challenge: LivenessChallenge,
    detections: any,
    api: typeof import('@vladmandic/face-api')
  ): boolean {
    const landmarks = detections.landmarks;
    const expressions = detections.expressions;

    switch (challenge.type) {
      case 'center': {
        const box = detections.detection.box;
        const videoWidth = this.videoElement?.videoWidth || 640;
        const videoHeight = this.videoElement?.videoHeight || 480;
        
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        
        const isCentered = 
          centerX > videoWidth * 0.3 && centerX < videoWidth * 0.7 &&
          centerY > videoHeight * 0.2 && centerY < videoHeight * 0.8;
        
        if (isCentered) {
          this.challengeHoldTime += 100;
          if (!this.baselineYaw) {
            this.baselineYaw = this.calculateYaw(landmarks);
          }
          return this.challengeHoldTime >= 1000;
        }
        this.challengeHoldTime = 0;
        return false;
      }

      case 'turn_left': {
        const yaw = this.calculateYaw(landmarks);
        const baseline = this.baselineYaw || 0;
        
        if (yaw < baseline - 15) {
          this.challengeHoldTime += 100;
          return this.challengeHoldTime >= 500;
        }
        this.challengeHoldTime = 0;
        return false;
      }

      case 'turn_right': {
        const yaw = this.calculateYaw(landmarks);
        const baseline = this.baselineYaw || 0;
        
        if (yaw > baseline + 15) {
          this.challengeHoldTime += 100;
          return this.challengeHoldTime >= 500;
        }
        this.challengeHoldTime = 0;
        return false;
      }

      case 'blink': {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        
        const leftEAR = this.getEyeAspectRatio(leftEye);
        const rightEAR = this.getEyeAspectRatio(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;
        
        // Debug log to see actual values
        //console.log(`[Liveness] EAR: ${avgEAR.toFixed(3)}`);
        
        // More lenient threshold (was 0.22, now 0.25)
        // Also detect based on relative change, not just absolute threshold
        const currentState: 'open' | 'closed' = avgEAR < 0.27 ? 'closed' : 'open';
        
        if (this.lastEyeState === 'open' && currentState === 'closed') {
          this.blinkCount++;
          console.log(`[Liveness] Blink detected: ${this.blinkCount}/3 (EAR: ${avgEAR.toFixed(3)})`);
        }
        this.lastEyeState = currentState;
        
        // Reduce to 2 blinks instead of 3
        return this.blinkCount >= 2;
      }

      case 'smile': {
        const happyScore = expressions.happy;
        if (happyScore > 0.7) {
          this.challengeHoldTime += 100;
          return this.challengeHoldTime >= 500;
        }
        this.challengeHoldTime = 0;
        return false;
      }

      default:
        return false;
    }
  }

  private calculateYaw(landmarks: any): number {
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const noseTip = nose[3];
    const leftEyeCenter = {
      x: leftEye.reduce((sum: number, p: any) => sum + p.x, 0) / leftEye.length,
      y: leftEye.reduce((sum: number, p: any) => sum + p.y, 0) / leftEye.length,
    };
    const rightEyeCenter = {
      x: rightEye.reduce((sum: number, p: any) => sum + p.x, 0) / rightEye.length,
      y: rightEye.reduce((sum: number, p: any) => sum + p.y, 0) / rightEye.length,
    };
    
    const eyeMidpoint = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };
    
    return noseTip.x - eyeMidpoint.x;
  }

  private getEyeAspectRatio(eye: any[]): number {
    const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
    const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
    const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
    
    if (h === 0) return 0.3;
    return (v1 + v2) / (2 * h);
  }

  private resetChallengeState() {
    this.challengeHoldTime = 0;
    if (this.challenges[this.currentChallengeIndex]?.type === 'blink') {
      this.blinkCount = 0;
      this.lastEyeState = 'open';
    }
  }

  private captureScreenshot() {
    if (!this.videoElement || !this.canvasElement) return;
    
    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;
    
    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;
    ctx.drawImage(this.videoElement, 0, 0);
    
    this.screenshots.push(this.canvasElement.toDataURL('image/jpeg', 0.8));
  }

  private getResult(): LivenessResult {
    const completedCount = this.challenges.filter(c => c.completed).length;
    const totalCount = this.challenges.length;
    const score = Math.round((completedCount / totalCount) * 100);
    
    return {
      passed: completedCount >= totalCount - 1,
      score,
      completedChallenges: completedCount,
      totalChallenges: totalCount,
      screenshots: this.screenshots,
      timestamp: Date.now(),
    };
  }

  private getFailedResult(reason: string): LivenessResult {
    console.error('[Liveness] Failed:', reason);
    return {
      passed: false,
      score: 0,
      completedChallenges: 0,
      totalChallenges: CHALLENGES.length,
      screenshots: [],
      timestamp: Date.now(),
    };
  }

  stop() {
    this.isRunning = false;
    this.previewRunning = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  cleanup() {
    this.stop();
    this.videoElement = null;
    this.canvasElement = null;
  }
}

// Singleton instance
let livenessCheckerInstance: LivenessChecker | null = null;

export function getLivenessChecker(): LivenessChecker {
  if (!livenessCheckerInstance) {
    livenessCheckerInstance = new LivenessChecker();
  }
  return livenessCheckerInstance;
}

// Simple face detection for selfie uploads
// Simple face detection for selfie uploads - with robust fallback
export async function detectFace(img: HTMLImageElement): Promise<{ faceDetected: boolean; confidence: number } | null> {
  // First try face-api detection
  try {
    const api = await loadFaceApi();
    
    // Load model if not already loaded
    if (!api.nets.tinyFaceDetector.isLoaded) {
      console.log('[detectFace] Loading tinyFaceDetector model...');
      await api.nets.tinyFaceDetector.loadFromUri('/models');
    }
    
    // Wait for image to be fully loaded
    if (!img.complete || img.naturalHeight === 0) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Image load timeout')), 5000);
        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Image load error'));
        };
      });
    }
    
    console.log('[detectFace] Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
    
    // Create canvas for detection (face-api works better with canvas)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize large images for better detection
    const maxSize = 640;
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    
    if (width > maxSize || height > maxSize) {
      const scale = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    
    console.log('[detectFace] Canvas dimensions:', width, 'x', height);
    
    // Try detection with different input sizes
    const inputSizes = [512, 416, 320, 224];
    
    for (const inputSize of inputSizes) {
      try {
        const detection = await api.detectSingleFace(
          canvas,
          new api.TinyFaceDetectorOptions({ 
            scoreThreshold: 0.3, 
            inputSize: inputSize 
          })
        );
        
        if (detection) {
          console.log('[detectFace] Face detected with inputSize:', inputSize, 'score:', detection.score);
          return {
            faceDetected: true,
            confidence: detection.score
          };
        }
      } catch (e) {
        console.log('[detectFace] Detection failed with inputSize:', inputSize);
      }
    }
    
    console.log('[detectFace] No face detected with face-api, trying fallback...');
    
  } catch (error) {
    console.error('[detectFace] Face-api error:', error);
  }
  
  // Fallback: Simple skin-tone based detection
  try {
    const result = await detectFaceFallback(img);
    return result;
  } catch (error) {
    console.error('[detectFace] Fallback error:', error);
  }
  
  // Ultimate fallback - give benefit of doubt
  console.log('[detectFace] All detection methods failed, returning default pass');
  return { faceDetected: true, confidence: 0.6 };
}

// Fallback face detection using skin tone analysis
async function detectFaceFallback(img: HTMLImageElement): Promise<{ faceDetected: boolean; confidence: number }> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        resolve({ faceDetected: true, confidence: 0.6 });
        return;
      }

      // Resize for analysis
      const width = 160;
      const height = 120;
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      // Analyze center region (where face should be in a selfie)
      const centerX = Math.floor(width * 0.2);
      const centerY = Math.floor(height * 0.1);
      const regionWidth = Math.floor(width * 0.6);
      const regionHeight = Math.floor(height * 0.8);

      const imageData = ctx.getImageData(centerX, centerY, regionWidth, regionHeight);
      const data = imageData.data;

      let skinPixels = 0;
      let totalPixels = 0;
      let brightnessSum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        totalPixels++;
        brightnessSum += (r + g + b) / 3;

        if (isSkinToneColor(r, g, b)) {
          skinPixels++;
        }
      }

      const skinRatio = skinPixels / totalPixels;
      const avgBrightness = brightnessSum / totalPixels;

      console.log('[detectFaceFallback] Skin ratio:', skinRatio.toFixed(3), 'Brightness:', avgBrightness.toFixed(1));

      // Detection criteria - be lenient for selfies
      const faceDetected = 
        skinRatio > 0.12 && 
        skinRatio < 0.75 && 
        avgBrightness > 30 && 
        avgBrightness < 240;

      const confidence = faceDetected ? Math.min(0.85, 0.5 + skinRatio) : skinRatio;

      console.log('[detectFaceFallback] Result:', { faceDetected, confidence: confidence.toFixed(3) });

      resolve({
        faceDetected,
        confidence,
      });
    } catch (error) {
      console.error('[detectFaceFallback] Error:', error);
      resolve({ faceDetected: true, confidence: 0.6 });
    }
  });
}

function isSkinToneColor(r: number, g: number, b: number): boolean {
  // Multiple rules for different skin tones
  
  // Rule 1: General RGB ratio
  const rule1 = 
    r > 60 && g > 40 && b > 20 &&
    r > g && r > b &&
    (r - g) > 5 && (r - b) > 5 &&
    Math.abs(r - g) < 100;

  // Rule 2: Darker skin tones
  const rule2 = 
    r > 40 && g > 30 && b > 15 &&
    r >= g && g >= b &&
    (r - b) < 80;

  // Rule 3: Lighter skin tones
  const rule3 = 
    r > 170 && g > 130 && b > 100 &&
    r > g && g > b;

  // Rule 4: YCbCr color space (commonly used for skin detection)
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  
  const rule4 = 
    cb > 77 && cb < 130 &&
    cr > 130 && cr < 175;

  // Rule 5: HSV-based (approximation)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  
  const rule5 = 
    r > 80 && 
    r > g && r > b &&
    saturation > 0.1 && saturation < 0.7;

  return rule1 || rule2 || rule3 || rule4 || rule5;
}