'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Download, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BoothPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);

  // Initialize Camera
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 }, 
          audio: false 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    }
    setupCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Helper: Draw Image with Center-Crop (Object-Fit: Cover behavior for Canvas)
  const drawImageCover = (ctx, img, dx, dy, dw, dh) => {
    const imgRatio = img.width / img.height;
    const targetRatio = dw / dh;
    let sx, sy, sw, sh;

    if (imgRatio > targetRatio) {
      sh = img.height;
      sw = img.height * targetRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = img.width / targetRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  };

  const capturePhoto = () => {
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
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        
        setPhotos(prev => [...prev, canvas.toDataURL('image/jpeg', 0.95)]);
        setIsCapturing(false);
      }
    }, 1000);
  };

  const exportStrip = async () => {
    const canvas = document.createElement('canvas');
    // EXACT GEOMETRY: 1200 x 900 (4:3 Aspect Ratio)
    const EXPORT_W = 1200;
    const EXPORT_H = 900;
    const LABEL_H = 120;
    const PHOTO_AREA_H = EXPORT_H - LABEL_H; // 780px
    const SLOT_H = PHOTO_AREA_H / 3; // 260px per slot
    
    canvas.width = EXPORT_W;
    canvas.height = EXPORT_H;
    const ctx = canvas.getContext('2d');

    // 1. Background (Pastel Purple/Pink Theme)
    const grad = ctx.createLinearGradient(0, 0, EXPORT_W, EXPORT_H);
    grad.addColorStop(0, '#fbcfe8'); // Pink-200
    grad.addColorStop(1, '#e9d5ff'); // Purple-200
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

    // 2. Render Label Area (Top)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '10px';
    ctx.fillText('LIVE PHOTOBOOTH', EXPORT_W / 2, LABEL_H / 2);
    ctx.font = '24px monospace';
    ctx.fillText(new Date().toLocaleDateString(), EXPORT_W / 2, (LABEL_H / 2) + 40);

    // 3. Process and Draw Photos
    const imgPromises = photos.map(src => {
      return new Promise((res) => {
        const img = new window.Image();
        img.onload = () => res(img);
        img.src = src;
      });
    });

    const loadedImages = await Promise.all(imgPromises);
    
    loadedImages.forEach((img, i) => {
      const dy = LABEL_H + (i * SLOT_H);
      // Draw centered with 20px padding from sides
      const padding = 40;
      const drawW = EXPORT_W - (padding * 2);
      const drawH = SLOT_H - 10; // Small gap between photos
      
      // Add white border/frame effect
      ctx.fillStyle = "white";
      ctx.fillRect(padding - 5, dy, drawW + 10, drawH);
      
      drawImageCover(ctx, img, padding, dy + 5, drawW, drawH - 10);
    });

    // 4. Download
    const link = document.createElement('a');
    link.download = `booth-strip-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    link.click();
  };

  return (
    <main className="min-h-screen photobooth-room flex flex-col items-center justify-center p-4">
      <div className="photobooth-shell flex flex-col items-center pt-8 pb-4 px-6">
        <div className="flex justify-between w-full mb-4 px-2">
          <button onClick={() => router.push('/')} className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="photobooth-title">STUDIO SESSION</h1>
          <div className="w-5" />
        </div>

        {/* Camera Window */}
        <div className="camera-window relative mb-8">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {countdown && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <span className="text-white text-8xl font-mono italic animate-ping">{countdown}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8 mb-8">
          <button 
            onClick={() => setPhotos([])}
            className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
            title="Reset"
          >
            <RefreshCw size={24} />
          </button>

          <button 
            onClick={capturePhoto}
            disabled={photos.length >= 3 || isCapturing}
            className={`shutter-button flex items-center justify-center active:scale-90 transition-transform ${photos.length >= 3 ? 'opacity-50 grayscale' : ''}`}
          >
            <Camera size={32} color="#333" />
          </button>

          <button 
            onClick={exportStrip}
            disabled={photos.length < 3}
            className={`p-3 bg-blue-400 rounded-full text-white hover:bg-blue-500 transition-all shadow-lg ${photos.length < 3 ? 'opacity-30' : 'animate-bounce'}`}
            title="Download Strip"
          >
            <Download size={24} />
          </button>
        </div>

        {/* Mini Preview Strip */}
        <div className="strip-slot w-full grid grid-cols-3 gap-2 h-24">
          {[0, 1, 2].map((i) => (
            <div key={i} className="strip-photo relative h-full w-full bg-black/20 overflow-hidden border-2 border-dashed border-black/10">
              {photos[i] && (
                <img src={photos[i]} alt={`Slot ${i}`} className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}