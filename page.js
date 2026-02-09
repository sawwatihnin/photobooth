'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export default function BoothNamePage() {
  const [name, setName] = useState('');
  const [gestureProgress, setGestureProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const videoRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const router = useRouter();

  const handleNext = () => {
    router.push(`/?name=${encodeURIComponent(name || 'My Booth')}`);
  };

  useEffect(() => {
    if (!hasStarted) return; 

    async function setup() {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');

      handsRef.current = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      handsRef.current.onResults((results) => {
        if (results.multiHandLandmarks?.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          const distance = Math.sqrt(
            Math.pow(landmarks[4].x - landmarks[8].x, 2) + 
            Math.pow(landmarks[4].y - landmarks[8].y, 2)
          );

          if (distance < 0.05) { 
            setGestureProgress((prev) => {
              if (prev >= 100) {
                handleNext();
                return 100;
              }
              return prev + 5; 
            });
          } else {
            setGestureProgress(0); 
          }
        }
      });

      if (videoRef.current) {
        cameraRef.current = new window.Camera(videoRef.current, {
          onFrame: async () => {
            await handsRef.current.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });
        cameraRef.current.start();
      }
    }

    setup();
    return () => {
      handsRef.current?.close();
      cameraRef.current?.stop();
    };
  }, [hasStarted]);

  // --- 1. THE LANDING VIEW (Full Screen Clickable Image) ---
  if (!hasStarted) {
    return (
      <main 
        className="w-screen h-screen bg-black flex items-center justify-center cursor-pointer overflow-hidden"
        onClick={() => setHasStarted(true)}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Using object-cover to fill the screen */}
          <img 
            src="/photobooth.png" 
            alt="Start" 
            className="w-full h-full object-cover md:object-contain transition-transform duration-500 hover:scale-[1.02]"
          />
          
          {/* Overlay text for clarity */}
          <div className="absolute bottom-12 w-full text-center pointer-events-none">
            <p className="text-white/60 font-mono text-xl tracking-widest animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              — CLICK ANYWHERE TO START —
            </p>
          </div>
        </div>
      </main>
    );
  }

  // --- 2. THE RACCOON NAMING VIEW ---
  return (
    <main className="w-screen h-screen relative flex items-center justify-center overflow-hidden bg-black">
      <video ref={videoRef} className="hidden" />
      <div className="absolute inset-0 bg-[url('/raccon.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-black/40" />

      <div className="relative z-10 w-[90%] max-w-3xl px-4">
        <div className="flex gap-4 bg-[#f3d6e6]/95 backdrop-blur-md border-4 border-[#c08bb8] rounded-xl p-5 shadow-2xl">
          <div className="w-20 h-20 border-4 border-[#c08bb8] rounded-lg bg-[url('/closeup.png')] bg-cover bg-center" />
          <div className="flex-1">
            <p className="font-mono text-sm text-[#5a2d4a] mb-3">
              What do you want to name this photobooth? (Pinch fingers to confirm!)
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vivienne’s bday <3"
              className="w-full mb-3 px-3 py-2 font-mono text-sm rounded-md bg-[#f9eaf2] text-[#5a2d4a] border-2 border-[#c08bb8]"
            />
            <div className="flex justify-end relative">
              <div 
                className="absolute inset-0 bg-[#5a2d4a]/20 rounded-md transition-all duration-100" 
                style={{ width: `${gestureProgress}%` }} 
              />
              <button
                onClick={handleNext}
                className="relative z-10 px-6 py-2 font-mono text-sm bg-[#d96aa7] text-white rounded-md hover:bg-[#c05592] transition"
              >
                {gestureProgress > 0 ? `Loading... ${gestureProgress}%` : "Let's go!"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function loadScript(src) {
  return new Promise(res => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    document.body.appendChild(s);
  });
}