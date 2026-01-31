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
export async function detectFace(img: HTMLImageElement): Promise<{ faceDetected: boolean; confidence: number } | null> {
  try {
    const api = await loadFaceApi();
    
    if (!api.nets.tinyFaceDetector.isLoaded) {
      await api.nets.tinyFaceDetector.loadFromUri('/models');
    }
    
    if (!img.complete) {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    }
    
    const maxSize = 800;
    let detectTarget: HTMLImageElement | HTMLCanvasElement = img;
    
    if (img.width > maxSize || img.height > maxSize) {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        detectTarget = canvas as any;
        console.log('🔍 Resized to:', canvas.width, 'x', canvas.height);
      }
    }
    
    const detection = await api.detectSingleFace(
      detectTarget, 
      new api.TinyFaceDetectorOptions({ scoreThreshold: 0.3, inputSize: 512 })
    );
    
    console.log('🔍 Detection result:', detection);
    
    if (detection) {
      return {
        faceDetected: true,
        confidence: detection.score
      };
    }
    
    return { faceDetected: false, confidence: 0 };
  } catch (error) {
    console.error('[detectFace] Error:', error);
    return null;
  }
}
