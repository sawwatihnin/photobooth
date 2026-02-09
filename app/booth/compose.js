'use client';
import { useRouter } from 'next/navigation';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Download, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="photobooth-room cursor-pointer" onClick={() => router.push('/name')}>
      <div className="flex flex-col items-center">
        <h1 className="pixel-text text-white mb-8 text-4xl">
          Welcome to your photobooth
        </h1>
        {/* Photobooth Pixel Art Illustration */}
        <div className="w-[400px] h-[300px] bg-[url('/photobooth_illustration.png')] bg-contain bg-no-repeat bg-center" />
        <p className="pixel-text text-white mt-8 animate-bounce">Click anywhere to start</p>
      </div>
    </main>
  );
}
export default function UnifiedBooth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boothName = searchParams.get('name') || 'STUDIO SESSION';
  
  const videoRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [gestureProgress, setGestureProgress] = useState(0);

  // 1. CENTER-CROP HELPER (Prevents image distortion on export)
  const drawImageCover = (ctx, img, dx, dy, dw, dh) => {
    const imgRatio = img.width / img.height;
    const targetRatio = dw / dh;
    let sx, sy, sw, sh;
    if (imgRatio > targetRatio) {
      sw = img.height * targetRatio; sh = img.height;
      sx = (img.width - sw) / 2; sy = 0;
    } else {
      sw = img.width; sh = img.width / targetRatio;
      sx = 0; sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  };

  // 2. STABLE CAPTURE LOGIC
  const capturePhoto = useCallback(() => {
    if (photos.length >= 3 || isCapturing) return;
    setIsCapturing(true);
    let count = 3;
    setCountdown(count);
    
    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(timer);
        setCountdown(null);
        if (videoRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1); // Natural mirror mode
          ctx.drawImage(videoRef.current, 0, 0);
          setPhotos(prev => [...prev, canvas.toDataURL('image/jpeg', 0.95)]);
        }
        setIsCapturing(false);
      }
    }, 1000);
  }, [photos.length, isCapturing]);

  // 3. GESTURE CONTROL LOOP (Mediapipe)
  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    hands.onResults((results) => {
      // THE LOCK: Ignore gestures if busy or full
      if (isCapturing || photos.length >= 3) {
        if (gestureProgress !== 0) setGestureProgress(0);
        return;
      }

      if (results.multiHandLandmarks?.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const thumb = landmarks[4];
        const index = landmarks[8];
        
        // Calculate Pinch Distance
        const dist = Math.sqrt(
          Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2)
        );

        if (dist < 0.05) { 
          setGestureProgress(p => {
            if (p >= 100) {
              capturePhoto(); 
              return 0; // Immediate reset to prevent multi-triggering
            }
            return p + 5; // Balanced fill speed
          });
        } else {
          setGestureProgress(0);
        }
      } else {
        setGestureProgress(0);
      }
    });

    if (videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => {
          if (!isCapturing && photos.length < 3) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });
      camera.start();
    }

    return () => hands.close();
  }, [capturePhoto, isCapturing, photos.length]);

  // 4. PROFESSIONAL 4:3 EXPORT (1200x900)
  const exportStrip = async () => {
    const canvas = document.createElement('canvas');
    const W = 1200, H = 900, LABEL_H = 120, SLOT_H = (H - LABEL_H) / 3;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Branding & Design
    ctx.fillStyle = '#f3d6e6'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5a2d4a'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center';
    ctx.fillText(boothName.toUpperCase(), W / 2, 75);

    const loadedImages = await Promise.all(photos.map(src => {
      return new Promise((res) => {
        const img = new Image(); img.onload = () => res(img); img.src = src;
      });
    }));

    loadedImages.forEach((img, i) => {
      const dy = LABEL_H + (i * SLOT_H), padding = 60;
      ctx.fillStyle = "white"; 
      ctx.fillRect(padding - 10, dy, W - (padding * 2) + 20, SLOT_H - 10);
      drawImageCover(ctx, img, padding, dy + 5, W - (padding * 2), SLOT_H - 20);
    });

    const link = document.createElement('a');
    link.download = `${boothName}-strip.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    link.click();
  };

  return (
    <main className="photobooth-room w-screen h-screen flex items-center justify-center bg-black">
      <div className="photobooth-shell flex flex-col items-center p-6 bg-[#2a2a2a] rounded-[48px] border-[10px] border-[#3a3a3a]">
        
        <div className="flex justify-between w-full mb-4 px-4">
          <button onClick={() => router.back()} className="text-white/40"><ArrowLeft size={20} /></button>
          <h1 className="photobooth-title text-[#f3d6e6] font-mono tracking-widest">{boothName}</h1>
          <div className="w-5" />
        </div>

        <div className="camera-window relative mb-8 overflow-hidden rounded-2xl border-4 border-[#555] bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
          
          {/* GESTURE FEEDBACK BAR */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 h-3 bg-white/10 rounded-full">
            <div 
              className="h-full bg-pink-500 rounded-full transition-all duration-75" 
              style={{ width: `${gestureProgress}%` }} 
            />
          </div>

          {countdown && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-9xl font-mono italic animate-pulse">
              {countdown}
            </div>
          )}
        </div>

        <div className="flex items-center gap-8 mb-8">
          <button onClick={() => setPhotos([])} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"><RefreshCw size={24} /></button>
          <button onClick={capturePhoto} className="shutter-button w-20 h-20 bg-red-600 border-8 border-white rounded-full shadow-2xl active:scale-95 transition-transform" />
          <button onClick={exportStrip} disabled={photos.length < 3} className="p-4 bg-blue-500 rounded-full text-white disabled:opacity-20 transition-all"><Download size={24} /></button>
        </div>

        <div className="w-full grid grid-cols-3 gap-2 h-24 bg-white/5 p-2 rounded-xl border border-white/5">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-black/40 rounded-lg overflow-hidden border border-white/10">
              {photos[i] && <img src={photos[i]} alt="slot" className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}