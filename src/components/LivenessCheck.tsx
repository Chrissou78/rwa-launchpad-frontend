'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getLivenessChecker, LivenessChallenge, LivenessResult } from '@/lib/livenessCheck';

interface LivenessCheckProps {
  onComplete: (result: LivenessResult) => void;
  onCancel: () => void;
}

export function LivenessCheck({ onComplete, onCancel }: LivenessCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [status, setStatus] = useState<'loading' | 'ready' | 'running' | 'complete' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge | null>(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [totalChallenges, setTotalChallenges] = useState(5);
  const [progress, setProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [result, setResult] = useState<LivenessResult | null>(null);

  const checkerRef = useRef(getLivenessChecker());

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      // Wait a tick for refs to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!mounted || !videoRef.current || !canvasRef.current) {
        console.log('[LivenessCheck] Component unmounted or refs not ready');
        return;
      }
      
      try {
        const success = await checkerRef.current.initialize(
          videoRef.current,
          canvasRef.current,
          {
            onChallengeUpdate: (challenge, index, total) => {
              if (mounted) {
                setCurrentChallenge(challenge);
                setChallengeIndex(index);
                setTotalChallenges(total);
              }
            },
            onProgress: (prog) => {
              if (mounted) setProgress(prog);
            },
            onFaceDetected: (detected) => {
              if (mounted) setFaceDetected(detected);
            },
          }
        );

        if (!mounted) return;
        
        if (success) {
          setStatus('ready');
          // Start face detection preview loop
          checkerRef.current.startPreview();
        } else {
          setStatus('error');
          setErrorMessage('Failed to initialize camera or load models');
        }
      } catch (err) {
        console.error('Init error:', err);
        if (mounted) {
          setStatus('error');
          setErrorMessage('Camera access denied. Please allow camera permissions.');
        }
      }
    };

    init();

    return () => {
      mounted = false;
      checkerRef.current.stopPreview();
      checkerRef.current.stop();
    };
  }, []);

  const startCheck = useCallback(async () => {
    // Stop preview before starting actual check
    checkerRef.current.stopPreview();
    
    setStatus('running');
    setProgress(0);
    
    const livenessResult = await checkerRef.current.start();
    
    setResult(livenessResult);
    setStatus('complete');
    
    // Auto-close after showing result
    setTimeout(() => {
      onComplete(livenessResult);
    }, 2000);
  }, [onComplete]);

  const handleCancel = useCallback(() => {
    checkerRef.current.stopPreview();
    checkerRef.current.stop();
    onCancel();
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-xl w-full border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <span className="text-xl">🥇</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gold Tier Liveness Check</h2>
              <p className="text-gray-400 text-sm">Prove you're a real person</p>
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

        {/* Content */}
        <div className="p-4">
          {status === 'error' ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-red-400 mb-4">{errorMessage}</p>
              <button
                onClick={handleCancel}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          ) : status === 'complete' && result ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">{result.passed ? '✅' : '❌'}</div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {result.passed ? 'Liveness Verified!' : 'Verification Failed'}
              </h3>
              <p className="text-gray-400 mb-4">
                {result.passed 
                  ? `Score: ${result.score}% (${result.completedChallenges}/${result.totalChallenges} challenges)`
                  : 'Please try again with better lighting'}
              </p>
              <div className="flex items-center justify-center gap-2 text-purple-400">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Continuing...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Video feed */}
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
                
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-40 h-52 border-4 border-dashed rounded-full transition-colors ${
                    faceDetected ? 'border-green-500' : 'border-gray-500'
                  }`} />
                </div>

                {/* Face detection indicator */}
                <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
                  faceDetected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-red-500'}`} />
                  {faceDetected ? 'Face detected' : 'No face detected'}
                </div>

                {/* Loading overlay */}
                {status === 'loading' && (
                  <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-400">Loading camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Challenge info */}
              {status === 'running' && currentChallenge && (
                <div className="mb-4">
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-400 text-sm">Challenge {challengeIndex + 1}/{totalChallenges}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm">{Math.round(progress)}%</span>
                  </div>
                  
                  {/* Current challenge */}
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                    <div className="text-4xl mb-2">{currentChallenge.icon}</div>
                    <p className="text-purple-300 text-lg font-medium">{currentChallenge.instruction}</p>
                  </div>
                </div>
              )}

              {/* Instructions for ready state */}
              {status === 'ready' && (
                <div className="bg-gray-700/50 rounded-xl p-4 mb-4">
                  <h4 className="text-white font-medium mb-2">Instructions:</h4>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• Position your face in the oval guide</li>
                    <li>• Ensure good lighting on your face</li>
                    <li>• Follow the on-screen prompts</li>
                    <li>• You'll need to: look center, turn left/right, blink, and smile</li>
                  </ul>
                </div>
              )}

              {/* Action button */}
              {status === 'ready' && (
                <button
                  onClick={startCheck}
                  disabled={!faceDetected}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors"
                >
                  {faceDetected ? 'Start Liveness Check' : 'Position your face in the oval'}
                </button>
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
      </div>
    </div>
  );
}

export default LivenessCheck;