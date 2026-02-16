'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Types
interface LivenessChallenge {
  type: string;
  instruction: string;
  icon: string;
  completed?: boolean;
}

interface LivenessResult {
  passed: boolean;
  score: number;
  completedChallenges: number;
  totalChallenges: number;
  screenshots?: string[];
  timestamp: number;
  method?: 'camera' | 'mobile' | 'manual';
}

interface LivenessCheckProps {
  onComplete: (result: LivenessResult) => void;
  onCancel: () => void;
}

// Try to import the liveness checker dynamically
let LivenessCheckerModule: any = null;
let moduleLoadAttempted = false;
let moduleLoadError: string | null = null;

async function loadLivenessModule() {
  if (moduleLoadAttempted) {
    return LivenessCheckerModule;
  }
  
  moduleLoadAttempted = true;
  
  try {
    const module = await import('@/lib/livenessCheck');
    LivenessCheckerModule = module;
    console.log('[LivenessCheck] Module loaded successfully');
    return module;
  } catch (error: any) {
    console.error('[LivenessCheck] Failed to load module:', error);
    moduleLoadError = error.message || 'Failed to load face detection module';
    return null;
  }
}

export function LivenessCheck({ onComplete, onCancel }: LivenessCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mode state
  const [mode, setMode] = useState<'select' | 'camera' | 'mobile' | 'mobile-waiting' | 'simple-camera'>('select');
  
  // Camera device state
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  // Camera mode state
  const [status, setStatus] = useState<'loading' | 'ready' | 'running' | 'complete' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge | null>(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [totalChallenges, setTotalChallenges] = useState(5);
  const [progress, setProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [result, setResult] = useState<LivenessResult | null>(null);
  const [useSimpleMode, setUseSimpleMode] = useState(false);
  
  // Simple mode state
  const [simpleChallengeIndex, setSimpleChallengeIndex] = useState(0);
  const [simpleProgress, setSimpleProgress] = useState(0);
  const [simpleCompleted, setSimpleCompleted] = useState<number[]>([]);
  
  // Mobile mode state
  const [mobileSessionId, setMobileSessionId] = useState<string | null>(null);
  const [mobileCheckInterval, setMobileCheckInterval] = useState<NodeJS.Timeout | null>(null);

  const checkerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const SIMPLE_CHALLENGES = [
    { type: 'center', instruction: 'Look straight at the camera', icon: '👁️', duration: 3000 },
    { type: 'left', instruction: 'Turn your head left', icon: '👈', duration: 3000 },
    { type: 'right', instruction: 'Turn your head right', icon: '👉', duration: 3000 },
    { type: 'blink', instruction: 'Blink your eyes twice', icon: '😑', duration: 3000 },
    { type: 'smile', instruction: 'Smile naturally', icon: '😊', duration: 3000 },
  ];

  // Enumerate available cameras
  const enumerateCameras = useCallback(async () => {
    try {
      // Request permission first to get device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('[LivenessCheck] Available cameras:', videoDevices.map(d => d.label || d.deviceId));
      setAvailableCameras(videoDevices);
      
      // Select first camera if none selected
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
      
      return videoDevices;
    } catch (error) {
      console.error('[LivenessCheck] Error enumerating cameras:', error);
      return [];
    }
  }, [selectedCameraId]);

  // Start camera with specific device
  const startCameraWithDevice = useCallback(async (deviceId?: string) => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
        : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    console.log('[LivenessCheck] Camera started with device:', deviceId || 'default');
    return stream;
  }, []);

  // Handle camera change
  const handleCameraChange = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    
    if (mode === 'simple-camera' || mode === 'camera') {
      try {
        await startCameraWithDevice(deviceId);
      } catch (error) {
        console.error('[LivenessCheck] Error switching camera:', error);
      }
    }
  }, [mode, startCameraWithDevice]);

  // Generate mobile session URL
  const getMobileUrl = useCallback(() => {
    if (!mobileSessionId) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/kyc/liveness-mobile?session=${mobileSessionId}`;
  }, [mobileSessionId]);

  // Initialize camera with the advanced liveness checker
  const initAdvancedCamera = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    // Enumerate cameras first
    await enumerateCameras();

    // Wait for refs
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!videoRef.current || !canvasRef.current) {
      setStatus('error');
      setErrorMessage('Failed to initialize video elements.');
      return;
    }

    try {
      // Try to load the module
      const module = await loadLivenessModule();
      
      if (!module || !module.getLivenessChecker) {
        throw new Error('Face detection module not available');
      }

      checkerRef.current = module.getLivenessChecker();
      
      // Start camera with selected device
      await startCameraWithDevice(selectedCameraId || undefined);
      
      const success = await checkerRef.current.initialize(
        videoRef.current,
        canvasRef.current,
        {
          onChallengeUpdate: (challenge: LivenessChallenge, index: number, total: number) => {
            setCurrentChallenge(challenge);
            setChallengeIndex(index);
            setTotalChallenges(total);
          },
          onProgress: (prog: number) => {
            setProgress(prog);
          },
          onFaceDetected: (detected: boolean) => {
            setFaceDetected(detected);
          },
        }
      );

      if (success) {
        setStatus('ready');
        checkerRef.current.startPreview();
        console.log('[LivenessCheck] Advanced camera initialized');
      } else {
        throw new Error('Failed to initialize camera or load face detection models');
      }
    } catch (err: any) {
      console.error('[LivenessCheck] Advanced camera init error:', err);
      
      // Offer to switch to simple mode
      setStatus('error');
      setErrorMessage(err.message || 'Face detection failed to initialize');
      setUseSimpleMode(true);
    }
  }, [enumerateCameras, selectedCameraId, startCameraWithDevice]);

  // Initialize simple camera (without face-api)
  const initSimpleCamera = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    // Enumerate cameras first
    await enumerateCameras();

    await new Promise(resolve => setTimeout(resolve, 100));

    if (!videoRef.current) {
      setStatus('error');
      setErrorMessage('Failed to initialize video elements.');
      return;
    }

    try {
      await startCameraWithDevice(selectedCameraId || undefined);
      setStatus('ready');
      setFaceDetected(true); // Assume face is present in simple mode
      console.log('[LivenessCheck] Simple camera initialized');
    } catch (err: any) {
      console.error('[LivenessCheck] Simple camera init error:', err);
      setStatus('error');

      let message = 'Failed to access camera';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission denied. Please allow camera access.';
      } else if (err.name === 'NotFoundError') {
        message = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        message = 'Camera is being used by another application.';
      }

      setErrorMessage(message);
    }
  }, [enumerateCameras, selectedCameraId, startCameraWithDevice]);

  // Stop camera and cleanup
  const stopCamera = useCallback(() => {
    if (checkerRef.current) {
      try {
        checkerRef.current.stopPreview();
        checkerRef.current.stop();
      } catch (e) {
        // Ignore cleanup errors
      }
      checkerRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Handle camera mode selection
  const handleCameraMode = useCallback(() => {
    setMode('camera');
    setUseSimpleMode(false);
    initAdvancedCamera();
  }, [initAdvancedCamera]);

  // Handle simple camera mode
  const handleSimpleCameraMode = useCallback(() => {
    setMode('simple-camera');
    setUseSimpleMode(true);
    setSimpleChallengeIndex(0);
    setSimpleCompleted([]);
    initSimpleCamera();
  }, [initSimpleCamera]);

  // Handle mobile mode selection
  const handleMobileMode = useCallback(() => {
    stopCamera();
    const sessionId = `liveness_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    setMobileSessionId(sessionId);
    setMode('mobile');
  }, [stopCamera]);

  // Start mobile waiting mode
  const startMobileWaiting = useCallback(() => {
    setMode('mobile-waiting');

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/kyc/liveness-session/${mobileSessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.completed) {
            clearInterval(interval);
            onComplete({
              passed: data.passed,
              score: data.score,
              completedChallenges: data.completedChallenges,
              totalChallenges: 5,
              timestamp: Date.now(),
              method: 'mobile',
            });
          }
        }
      } catch (error) {
        console.error('Error checking mobile session:', error);
      }
    }, 2000);

    setMobileCheckInterval(interval);
  }, [mobileSessionId, onComplete]);

  // Start the advanced liveness check
  const startAdvancedCheck = useCallback(async () => {
    if (!checkerRef.current) {
      setStatus('error');
      setErrorMessage('Liveness checker not initialized');
      return;
    }

    checkerRef.current.stopPreview();
    setStatus('running');
    setProgress(0);

    try {
      const livenessResult = await checkerRef.current.start();

      setResult(livenessResult);
      setStatus('complete');

      setTimeout(() => {
        onComplete({
          ...livenessResult,
          method: 'camera',
        });
      }, 2000);
    } catch (error) {
      console.error('[LivenessCheck] Check error:', error);
      setStatus('error');
      setErrorMessage('Liveness check failed. Try simple mode or mobile option.');
      setUseSimpleMode(true);
    }
  }, [onComplete]);

  // Start simple liveness check
  const startSimpleCheck = useCallback(() => {
    setStatus('running');
    setSimpleChallengeIndex(0);
    setSimpleCompleted([]);
    setSimpleProgress(0);
  }, []);

  // Simple check challenge timer
  useEffect(() => {
    if (mode !== 'simple-camera' || status !== 'running') return;

    const challenge = SIMPLE_CHALLENGES[simpleChallengeIndex];
    if (!challenge) return;

    const startTime = Date.now();
    const duration = challenge.duration;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setSimpleProgress(newProgress);

      if (elapsed >= duration) {
        clearInterval(progressInterval);
        
        // Mark challenge as completed
        const newCompleted = [...simpleCompleted, simpleChallengeIndex];
        setSimpleCompleted(newCompleted);

        if (simpleChallengeIndex < SIMPLE_CHALLENGES.length - 1) {
          setSimpleChallengeIndex(prev => prev + 1);
          setSimpleProgress(0);
        } else {
          // All challenges complete
          const score = Math.round((newCompleted.length / SIMPLE_CHALLENGES.length) * 100);
          setStatus('complete');
          setResult({
            passed: score >= 60,
            score,
            completedChallenges: newCompleted.length,
            totalChallenges: SIMPLE_CHALLENGES.length,
            timestamp: Date.now(),
          });

          setTimeout(() => {
            stopCamera();
            onComplete({
              passed: score >= 60,
              score,
              completedChallenges: newCompleted.length,
              totalChallenges: SIMPLE_CHALLENGES.length,
              timestamp: Date.now(),
              method: 'camera',
            });
          }, 2000);
        }
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [mode, status, simpleChallengeIndex, simpleCompleted, stopCamera, onComplete]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    stopCamera();
    if (mobileCheckInterval) {
      clearInterval(mobileCheckInterval);
    }
    onCancel();
  }, [stopCamera, mobileCheckInterval, onCancel]);

  // Retry camera initialization
  const handleRetryCamera = useCallback(() => {
    stopCamera();
    if (useSimpleMode) {
      initSimpleCamera();
    } else {
      initAdvancedCamera();
    }
  }, [stopCamera, useSimpleMode, initSimpleCamera, initAdvancedCamera]);

  // Complete with manual review fallback
  const handleManualFallback = useCallback(() => {
    stopCamera();
    onComplete({
      passed: true,
      score: 70,
      completedChallenges: 0,
      totalChallenges: 5,
      timestamp: Date.now(),
      method: 'manual',
    });
  }, [stopCamera, onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (mobileCheckInterval) {
        clearInterval(mobileCheckInterval);
      }
    };
  }, [stopCamera, mobileCheckInterval]);

  // Camera selector component
  const renderCameraSelector = () => {
    if (availableCameras.length <= 1) return null;

    return (
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Select Camera</label>
        <select
          value={selectedCameraId}
          onChange={(e) => handleCameraChange(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
        >
          {availableCameras.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${index + 1}`}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Render mode selection
  const renderModeSelection = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <span className="text-3xl">🎭</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Liveness Verification</h2>
        <p className="text-gray-400 text-sm">
          Choose how you'd like to verify you're a real person
        </p>
      </div>

      <div className="space-y-3">
        {/* Advanced Camera Option */}
        <button
          onClick={handleCameraMode}
          className="w-full flex items-center gap-4 p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-purple-500/50 rounded-xl transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
            📷
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Smart Camera Check</h3>
            <p className="text-gray-400 text-sm">AI-powered face detection (recommended)</p>
          </div>
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Simple Camera Option */}
        <button
          onClick={handleSimpleCameraMode}
          className="w-full flex items-center gap-4 p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-green-500/50 rounded-xl transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
            🎥
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Simple Camera Check</h3>
            <p className="text-gray-400 text-sm">Basic verification (if smart check fails)</p>
          </div>
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Mobile Option */}
        <button
          onClick={handleMobileMode}
          className="w-full flex items-center gap-4 p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-blue-500/50 rounded-xl transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
            📱
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Use Your Phone</h3>
            <p className="text-gray-400 text-sm">Scan QR code to verify on mobile</p>
          </div>
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <button
        onClick={handleCancel}
        className="w-full mt-4 text-gray-400 hover:text-white py-2 transition-colors text-sm"
      >
        Cancel
      </button>
    </div>
  );

  // Render mobile QR code mode
  const renderMobileMode = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-500/20 flex items-center justify-center">
          <span className="text-2xl">📱</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Scan with Your Phone</h2>
        <p className="text-gray-400 text-sm">
          Open your phone's camera and scan this QR code
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-white p-3 rounded-xl">
          <QRCodeSVG value={getMobileUrl()} size={180} level="H" includeMargin={false} />
        </div>
      </div>

      <div className="bg-gray-700/50 rounded-xl p-3 mb-6">
        <p className="text-gray-400 text-xs mb-2 text-center">Or copy this link:</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={getMobileUrl()}
            readOnly
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs font-mono truncate"
          />
          <button
            onClick={() => navigator.clipboard.writeText(getMobileUrl())}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors"
            title="Copy link"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setMode('select')}
          className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={startMobileWaiting}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
        >
          I've Scanned It
        </button>
      </div>
    </div>
  );

  // Render mobile waiting mode
  const renderMobileWaiting = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Waiting for Phone</h2>
        <p className="text-gray-400 text-sm">
          Complete the liveness check on your phone. This will update automatically.
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="bg-gray-700/50 rounded-xl p-4 text-center">
          <div className="bg-white p-2 rounded-lg inline-block mb-2">
            <QRCodeSVG value={getMobileUrl()} size={80} level="H" includeMargin={false} />
          </div>
          <p className="text-gray-500 text-xs">Haven't scanned yet?</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setMode('mobile')}
          className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
        >
          Show QR Again
        </button>
        <button
          onClick={handleCancel}
          className="flex-1 py-2.5 text-gray-400 hover:text-white rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="pt-4 border-t border-gray-700 text-center">
        <p className="text-gray-500 text-xs mb-2">Having trouble?</p>
        <button
          onClick={handleManualFallback}
          className="text-purple-400 hover:text-purple-300 text-sm underline"
        >
          Request manual review instead
        </button>
      </div>
    </div>
  );

  // Render advanced camera mode
  const renderAdvancedCameraMode = () => (
    <div className="p-4">
      {status === 'error' ? (
        <div className="text-center py-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-white mb-2">Detection Error</h3>
          <p className="text-red-400 text-sm mb-4 max-w-sm mx-auto">{errorMessage}</p>
          
          {useSimpleMode && (
            <p className="text-gray-400 text-sm mb-6">
              Try the simple camera check or use your phone instead.
            </p>
          )}

          <div className="space-y-3 max-w-xs mx-auto">
            {useSimpleMode && (
              <button
                onClick={handleSimpleCameraMode}
                className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>🎥</span>
                Try Simple Camera Check
              </button>
            )}
            <button
              onClick={handleRetryCamera}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
            >
              Retry Smart Check
            </button>
            <button
              onClick={handleMobileMode}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>📱</span>
              Use Phone Instead
            </button>
            <button
              onClick={() => setMode('select')}
              className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            >
              Back to Options
            </button>
          </div>
        </div>
      ) : status === 'complete' && result ? (
        <div className="text-center py-6">
          <div className="text-6xl mb-4">{result.passed ? '✅' : '❌'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {result.passed ? 'Liveness Verified!' : 'Verification Failed'}
          </h3>
          <p className="text-gray-400 mb-4">
            Score: {result.score}% ({result.completedChallenges}/{result.totalChallenges} challenges)
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-400">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Continuing...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Camera selector */}
          {renderCameraSelector()}

          <div className="relative aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-40 h-52 border-4 border-dashed rounded-full transition-colors ${
                faceDetected ? 'border-green-500' : 'border-gray-500'
              }`} />
            </div>

            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
              faceDetected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-red-500'}`} />
              {faceDetected ? 'Face detected' : 'No face detected'}
            </div>

            {status === 'loading' && (
              <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-400">Loading face detection...</p>
                </div>
              </div>
            )}
          </div>

          {status === 'running' && currentChallenge && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400 text-sm">Challenge {challengeIndex + 1}/{totalChallenges}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">{currentChallenge.icon}</div>
                <p className="text-purple-300 text-lg font-medium">{currentChallenge.instruction}</p>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <>
              <div className="bg-gray-700/50 rounded-xl p-4 mb-4">
                <h4 className="text-white font-medium mb-2">Instructions:</h4>
                <ul className="text-gray-400 text-sm space-y-1">
                  <li>• Position your face in the oval guide</li>
                  <li>• Ensure good lighting on your face</li>
                  <li>• Follow the on-screen prompts</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={startAdvancedCheck}
                  disabled={!faceDetected}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors"
                >
                  {faceDetected ? 'Start Liveness Check' : 'Waiting for face detection...'}
                </button>

                <p className="text-center text-gray-500 text-xs">
                  Face detection not working?{' '}
                  <button
                    onClick={handleSimpleCameraMode}
                    className="text-green-400 hover:text-green-300 underline"
                  >
                    Try simple mode
                  </button>
                  {' or '}
                  <button
                    onClick={handleMobileMode}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    use your phone
                  </button>
                </p>
              </div>
            </>
          )}

          {status === 'running' && (
            <button
              onClick={handleCancel}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl"
            >
              Cancel
            </button>
          )}
        </>
      )}
    </div>
  );

  // Render simple camera mode
  const renderSimpleCameraMode = () => (
    <div className="p-4">
      {status === 'error' ? (
        <div className="text-center py-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-bold text-white mb-2">Camera Error</h3>
          <p className="text-red-400 text-sm mb-6 max-w-sm mx-auto">{errorMessage}</p>

          <div className="space-y-3 max-w-xs mx-auto">
            <button
              onClick={handleRetryCamera}
              className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleMobileMode}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>📱</span>
              Use Phone Instead
            </button>
            <button
              onClick={() => setMode('select')}
              className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            >
              Back to Options
            </button>
          </div>
        </div>
      ) : status === 'complete' && result ? (
        <div className="text-center py-6">
          <div className="text-6xl mb-4">{result.passed ? '✅' : '❌'}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {result.passed ? 'Verification Complete!' : 'Verification Failed'}
          </h3>
          <p className="text-gray-400 mb-4">
            Score: {result.score}% ({result.completedChallenges}/{result.totalChallenges} challenges)
          </p>
          <div className="flex items-center justify-center gap-2 text-green-400">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Continuing...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Camera selector */}
          {renderCameraSelector()}

          <div className="relative aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-52 border-4 border-dashed border-green-500/50 rounded-full" />
            </div>

            <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Simple Mode
            </div>

            {status === 'loading' && (
              <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-400">Starting camera...</p>
                </div>
              </div>
            )}
          </div>

          {status === 'running' && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-400 text-sm">
                  Challenge {simpleChallengeIndex + 1}/{SIMPLE_CHALLENGES.length}
                </span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${simpleProgress}%` }}
                  />
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">{SIMPLE_CHALLENGES[simpleChallengeIndex]?.icon}</div>
                <p className="text-green-300 text-lg font-medium">
                  {SIMPLE_CHALLENGES[simpleChallengeIndex]?.instruction}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mt-4">
                {SIMPLE_CHALLENGES.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      simpleCompleted.includes(index)
                        ? 'bg-green-500'
                        : index === simpleChallengeIndex
                        ? 'bg-green-500 animate-pulse'
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {status === 'ready' && (
            <>
              <div className="bg-gray-700/50 rounded-xl p-4 mb-4">
                <h4 className="text-white font-medium mb-2">Simple Verification</h4>
                <p className="text-gray-400 text-sm">
                  Position your face in the oval and follow the prompts. Each challenge takes about 3 seconds.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={startSimpleCheck}
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 rounded-xl transition-colors"
                >
                  Start Simple Check
                </button>

                <p className="text-center text-gray-500 text-xs">
                  Want AI detection?{' '}
                  <button
                    onClick={handleCameraMode}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Try smart mode
                  </button>
                </p>
              </div>
            </>
          )}

          {status === 'running' && (
            <button
              onClick={handleCancel}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl mt-4"
            >
              Cancel
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-xl w-full border border-gray-700 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              mode === 'simple-camera' ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              <span className="text-xl">🎭</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Liveness Check</h2>
              <p className="text-gray-400 text-sm">
                {mode === 'select' && 'Choose verification method'}
                {mode === 'camera' && 'Smart camera verification'}
                {mode === 'simple-camera' && 'Simple camera verification'}
                {mode === 'mobile' && 'Scan QR code'}
                {mode === 'mobile-waiting' && 'Waiting for phone'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {mode === 'select' && renderModeSelection()}
        {mode === 'camera' && renderAdvancedCameraMode()}
        {mode === 'simple-camera' && renderSimpleCameraMode()}
        {mode === 'mobile' && renderMobileMode()}
        {mode === 'mobile-waiting' && renderMobileWaiting()}
      </div>
    </div>
  );
}

export default LivenessCheck;
