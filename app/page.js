'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function BoothContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boothName = searchParams.get('name') || "STUDIO SESSION";

  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const handsRef = useRef(null);

  const [shots, setShots] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [aiBackground, setAiBackground] = useState(null);
  const capturing = useRef(false);

  // --- STRIP COLOR STATES ---
  const [stripColor, setStripColor] = useState('#f3d6e6'); 
  const colorOptions = [
    { name: 'Classic Pink', hex: '#f3d6e6' },
    { name: 'Soft Blue', hex: '#d6e4f3' },
    { name: 'Mint', hex: '#d6f3e9' },
    { name: 'Lavender', hex: '#e9d6f3' },
    { name: 'Noir', hex: '#1a1a1a' }
  ];

  // Helper to determine if text should be white or dark based on background brightness
  const isDarkColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
  };

  // REDIRECT LOGIC: If no name, go to naming page
  useEffect(() => {
    if (!searchParams.get('name')) {
      router.push('/booth/name');
    }
  }, [searchParams, router]);

  // AI BACKGROUND LOGIC: Fetch the background based on name
  useEffect(() => {
    async function getBackground() {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: boothName }),
        });
        const data = await res.json();
        if (data.imageUrl) setAiBackground(data.imageUrl);
      } catch (err) {
        console.error("AI fetch failed:", err);
      }
    }
    if (boothName && boothName !== "STUDIO SESSION") getBackground();
  }, [boothName]);

  const filters = [
      {
  name: 'Blurred Pinlk',
  class: 'brightness(1.12) contrast(0.95) saturate(1.35) hue-rotate(-10deg) blur(0.4px)'
   },


  {
  name: '2020',
  class: `
    brightness(0.85)
    contrast(0.9)
    saturate(1.45)
    hue-rotate(12deg)
    sepia(0.08)
    blur(0.25px)
   drop-shadow(0 0 6px rgba(255,220,220,0.35))
  `
   },


  // 3. Soft flash glam (smooth skin, pastel glow)
  {
  name: 'Flash Noir',
  class: `
    grayscale(1)
    contrast(1.9)
    brightness(0.65)
    saturate(0)
    sepia(0.05)
    blur(0.2px)
  `
   },

  // 4. Pink bathroom / soft feminine tint
  {
  name: 'Dreamy',
  class: `
    brightness(0.88)
    contrast(0.92)
    saturate(1.15)
    sepia(0.08)
    hue-rotate(-5deg)
    blur(0.6px)
  `
   },


  // 5. Greenish film grain / moody bedroom
  {
  name: 'Sun-Kissed',
  class: `
    brightness(0.83)
    contrast(1.05)
    saturate(1.18)
    sepia(0.18)
    hue-rotate(-12deg)
    blur(0.2px)
  `
   },

  // 6. Cool flash / indie night shot
  {
  name: '1990s',
  class: `
    brightness(0.82)
   contrast(1.2)
   saturate(0.88)
   sepia(0.1)
   hue-rotate(-6deg)
   blur(0.2px)
  `
   },

  // 7. Warm editorial glow (last reference)
  {
    name: 'Golden Room',
    class: 'brightness(1.1) contrast(1.15) saturate(1.35) hue-rotate(-20deg)'
  },

    { name: 'Normal', class: 'none' }
  ];

  useEffect(() => {
    let stream;
    let running = true;

    async function setup() {
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await new Promise(res => { videoRef.current.onloadeddata = res; });

      handsRef.current = new window.Hands({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });
      handsRef.current.onResults(onResults);

      const loop = async () => {
        if (!running) return;
        if (videoRef.current?.readyState === 4 && !capturing.current && shots.length < 4) {
          await handsRef.current.send({ image: videoRef.current });
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    }
    setup();
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach(t => t.stop());
      handsRef.current?.close();
    };
  }, [shots.length]);

  function onResults(res) {
    if (!res.multiHandLandmarks?.length) return;
    const lm = res.multiHandLandmarks[0];
    const dist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
    if (dist < 0.035 && !capturing.current && shots.length < 4) {
      capturing.current = true;
      startCountdown();
    }
  }

  function startCountdown() {
    let t = 3;
    setCountdown(t);
    const i = setInterval(() => {
      t--;
      if (t === 0) {
        clearInterval(i);
        setCountdown(null);
        capture();
        capturing.current = false;
      } else {
        setCountdown(t);
      }
    }, 1000);
  }

  function capture() {
    const v = videoRef.current;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    ctx.filter = selectedFilter;
    ctx.drawImage(v, 0, 0);
    setShots(s => [...s, c.toDataURL('image/jpeg')]);
  }

  async function exportStrip() {
    if (shots.length === 0) return;
    const W = 1200;
    const H = 3600; 
    const HEADER_H = 250;
    const FOOTER_H = 200;
    const SLOT_H = (H - HEADER_H - FOOTER_H) / 4;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // DRAW SELECTED COLOR BACKGROUND
    ctx.fillStyle = stripColor;
    ctx.fillRect(0, 0, W, H);

    // Dynamic Title Color based on background brightness
    ctx.fillStyle = isDarkColor(stripColor) ? 'white' : '#5a2d4a';
    ctx.font = 'bold 60px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(boothName.toUpperCase(), W / 2, HEADER_H / 2 + 20);

    const imgs = await Promise.all(
      shots.slice(0, 4).map(src => new Promise(res => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = src;
      }))
    );

    imgs.forEach((img, i) => {
      const px = 80; const py = 40;
      const dy = HEADER_H + i * SLOT_H;
      ctx.fillStyle = 'white';
      ctx.fillRect(px - 20, dy + py - 20, W - (px * 2) + 40, SLOT_H - (py * 2) + 40);
      drawImageCover(ctx, img, px, dy + py, W - px * 2, SLOT_H - py * 2);
    });

    // Dynamic Footer Color
    ctx.fillStyle = isDarkColor(stripColor) ? 'white' : '#5a2d4a';
    ctx.font = '40px serif';
    ctx.fillText(new Date().getFullYear().toString(), W / 2, H - 80);

    const link = document.createElement('a');
    link.download = `${boothName}-strip.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  }

  if (!searchParams.get('name')) return <div className="loading-screen">Redirecting to naming booth...</div>;

  return (
    <div className="photobooth-room">
      <div className="studio-layout">
        <div className="studio-strip pixel-border-white">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="strip-photo">
              {shots[i] && <img src={shots[i]} alt="Capture" />}
            </div>
          ))}
        </div>

        <div className="photobooth-shell pixel-border-purple">
          <div className="photobooth-title">{boothName}</div>
          <div className="camera-window pixel-border-white">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              style={{ filter: selectedFilter, transform: 'scaleX(-1)' }} 
            />
            {countdown && <div className="pixel-countdown">{countdown}</div>}
          </div>

          <div className="photobooth-controls">
            <button className="pixel-btn redo-btn pixel-border-white" onClick={() => setShots([])}>♻️</button>
            <div className="heart-shutter" onClick={() => !capturing.current && shots.length < 4 && startCountdown()}>❤️</div>
            <button onClick={exportStrip} className="download-text-btn">DOWNLOAD STRIP</button>
          </div>
        </div>

        <div className="filters-sidebar pixel-border-pink">
          <div className="filters-title">FILTERS</div>
          <div className="filters-title">DOUBLE CLICK TO LOCK</div>
          <div className="filter-grid">
            {filters.map((f, i) => (
              <div key={i} className="filter-item">
                <div 
                  className={`heart-filter ${selectedFilter === f.class ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(f.class)}
                  style={{ '--filter-val': f.class }}
                />
                <span className="filter-label">{f.name}</span>
              </div>
            ))}
          </div>

          {/* SEPARATE STRIP COLOR BOX (Horizontal Rectangle) */}
          <div 
            className="pixel-border-pink" 
            style={{ 
              marginTop: '20px', 
              padding: '12px', 
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div className="filters-title" style={{ fontSize: '12px', marginBottom: '8px' }}>
              STRIP COLOR
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Preset Row */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {colorOptions.map((c) => (
                  <div 
                    key={c.hex} 
                    onClick={() => setStripColor(c.hex)} 
                    style={{ 
                      backgroundColor: c.hex, 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      cursor: 'pointer',
                      border: stripColor === c.hex ? '3px solid #5a2d4a' : '1px solid white',
                      boxShadow: '1px 1px 3px rgba(0,0,0,0.1)'
                    }} 
                  />
                ))}
              </div>

              {/* Vertical Divider */}
              <div style={{ width: '1px', height: '24px', backgroundColor: '#c08bb8', opacity: 0.4 }} />

              {/* Color Wheel */}
              <div style={{ position: 'relative', width: '28px', height: '28px' }}>
                <input 
                  type="color" 
                  value={stripColor}
                  onChange={(e) => setStripColor(e.target.value)}
                  style={{ 
                    position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 2 
                  }}
                />
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  border: '1px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                }}>🌈</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading Studio...</div>}>
      <BoothContent />
    </Suspense>
  );
}

function drawImageCover(ctx, img, dx, dy, dw, dh) {
  const imgRatio = img.width / img.height;
  const targetRatio = dw / dh;
  let sx, sy, sw, sh;
  if (imgRatio > targetRatio) {
    sh = img.height; sw = sh * targetRatio; sx = (img.width - sw) / 2; sy = 0;
  } else {
    sw = img.width; sh = sw / targetRatio; sx = 0; sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function loadScript(src) {
  return new Promise(res => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    document.body.appendChild(s);
  });
}