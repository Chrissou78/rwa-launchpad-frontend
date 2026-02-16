'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Challenge = {
  id: string;
  instruction: string;
  icon: string;
  duration: number;
};

const CHALLENGES: Challenge[] = [
  { id: 'center', instruction: 'Look straight at the camera', icon: '👁️', duration: 3000 },
  { id: 'left', instruction: 'Turn your head left', icon: '👈', duration: 3000 },
  { id: 'right', instruction: 'Turn your head right', icon: '👉', duration: 3000 },
  { id: 'blink', instruction: 'Blink your eyes twice', icon: '😑', duration: 3000 },
  { id: 'smile', instruction: 'Smile naturally', icon: '😊', duration: 3000 },
];

function LivenessMobileContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [status, setStatus] = useState<'loading' | 'ready' | 'active' | 'complete' | 'error'>('loading');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus('ready');
    } catch (error: any) {
      console.error('Camera error:', error);
      let message = 'Failed to access camera';
      if (error.name === 'NotAllowedError') {
        message = 'Please allow camera access to continue';
      } else if (error.name === 'NotFoundError') {
        message = 'No front camera found';
      }
      setCameraError(message);
      setStatus('error');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start liveness check
  const startCheck = useCallback(() => {
    setShowCountdown(true);
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          setStatus('active');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Submit results to server
  const submitResults = useCallback(async (passed: boolean, score: number, completed: number) => {
    try {
      await fetch('/api/kyc/liveness-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          completed: true,
          passed,
          score,
          completedChallenges: completed,
        }),
      });
    } catch (error) {
      console.error('Failed to submit results:', error);
    }
  }, [sessionId]);

  // Handle challenge completion
  const handleChallengeComplete = useCallback(async () => {
    const challenge = CHALLENGES[currentChallengeIndex];
    const newCompleted = [...completedChallenges, challenge.id];
    setCompletedChallenges(newCompleted);

    if (currentChallengeIndex < CHALLENGES.length - 1) {
      setCurrentChallengeIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      // All complete
      const score = Math.round((newCompleted.length / CHALLENGES.length) * 100);
      setFinalScore(score);
      setStatus('complete');
      stopCamera();
      await submitResults(score >= 60, score, newCompleted.length);
    }
  }, [currentChallengeIndex, completedChallenges, stopCamera, submitResults]);

  // Initialize on mount
  useEffect(() => {
    if (!sessionId) {
      setCameraError('Invalid session. Please scan the QR code again.');
      setStatus('error');
      return;
    }

    initCamera();

    return () => {
      stopCamera();
    };
  }, [sessionId, initCamera, stopCamera]);

  // Challenge progress timer
  useEffect(() => {
    if (status !== 'active') return;

    const challenge = CHALLENGES[currentChallengeIndex];
    const startTime = Date.now();
    const duration = challenge.duration;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (elapsed >= duration) {
        clearInterval(progressInterval);
        handleChallengeComplete();
      }
    }, 50);

    return () => clearInterval(progressInterval);
  }, [status, currentChallengeIndex, handleChallengeComplete]);

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-3">Camera Error</h1>
          <p className="text-gray-400 mb-6">{cameraError}</p>
          <button
            onClick={initCamera}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Complete state
  if (status === 'complete') {
    const passed = finalScore >= 60;

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
            passed ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            <span className="text-5xl">{passed ? '✅' : '❌'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {passed ? 'Verification Complete!' : 'Verification Failed'}
          </h1>
          <p className="text-gray-400 mb-6">
            {passed 
              ? 'You can close this page and return to your computer.'
              : 'Please return to your computer and try again.'}
          </p>
          
          <div className="bg-gray-800 rounded-xl p-4 mb-6">
            <p className="text-gray-500 text-sm mb-1">Score</p>
            <p className={`text-3xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {finalScore}%
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {completedChallenges.length} of {CHALLENGES.length} challenges
            </p>
          </div>

          <p className="text-gray-500 text-sm">
            This page will not close automatically for your security.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 text-center border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-white">Liveness Check</h1>
        <p className="text-gray-400 text-sm">Follow the instructions</p>
      </div>

      {/* Video */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Face guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-64 border-4 border-dashed border-white/30 rounded-full" />
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white">Starting camera...</p>
            </div>
          </div>
        )}

        {/* Countdown */}
        {showCountdown && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl font-bold text-white mb-4">{countdown}</div>
              <p className="text-gray-300 text-xl">Get ready...</p>
            </div>
          </div>
        )}

        {/* Challenge instruction */}
        {status === 'active' && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-4xl">{CHALLENGES[currentChallengeIndex].icon}</span>
              <span className="text-white font-semibold text-xl">
                {CHALLENGES[currentChallengeIndex].instruction}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {CHALLENGES.map((challenge, index) => (
            <div
              key={challenge.id}
              className={`w-3 h-3 rounded-full transition-colors ${
                completedChallenges.includes(challenge.id)
                  ? 'bg-green-500'
                  : index === currentChallengeIndex && status === 'active'
                  ? 'bg-purple-500 animate-pulse'
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Start button */}
        {status === 'ready' && !showCountdown && (
          <button
            onClick={startCheck}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl"
          >
            Start Verification
          </button>
        )}

        {/* Status text */}
        {status === 'active' && (
          <p className="text-center text-gray-400">
            Challenge {currentChallengeIndex + 1} of {CHALLENGES.length}
          </p>
        )}
      </div>
    </div>
  );
}

export default function LivenessMobilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <LivenessMobileContent />
    </Suspense>
  );
}
