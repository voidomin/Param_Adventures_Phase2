"use client";

import React from "react";

export const FilmGrain = () => (
  <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.035] mix-blend-overlay overflow-hidden">
    <svg viewBox="0 0 512 512" width="100%" height="100%">
      <filter id="noiseFilter">
        <feTurbulence 
          type="fractalNoise" 
          baseFrequency="0.65" 
          numOctaves="3" 
          stitchTiles="stitch" 
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  </div>
);

export const LightLeak = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-1">
    <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse decoration-amber-500/20" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[100px] rounded-full animate-bounce [animation-duration:15s]" />
    <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-amber-400/5 blur-[80px] rounded-full [animation:pulse_10s_infinite]" />
  </div>
);
