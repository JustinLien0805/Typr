import React from "react";
import { Link } from "react-router-dom";
import HeroBackground from "../components/HeroBackground";

export default function Home() {
  return (
    <div className="w-screen h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      
      {/* 背景裝飾 (維持不變) */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* 主視覺容器 */}
      <div className="relative aspect-1440/1024 h-full w-auto max-w-full">
        
        {/* 底層 SVG */}
        <div className="absolute inset-0 z-0 -top-24">
            <HeroBackground />
        </div>

        {/* 頂層按鈕 */}
        <div 
            className="absolute z-20"
            style={{ 
                left: "83.5%", 
                top: "80%", 
                transform: "translate(-50%, -50%)"
            }}
        >
            {/* 簡潔風格按鈕：
              - 圓角 (rounded-full)
              - 邊框 (border)
              - Hover 時背景變白、文字變黑
            */}
            <Link 
              to="/select"
              className="
                block px-12 py-3
                rounded-full
                border border-white/40
                text-white text-sm font-mono tracking-[0.2em] uppercase
                hover:bg-white hover:text-black hover:border-white
                transition-all duration-300 ease-out
                bg-black/50 backdrop-blur-sm
              "
            >
              Play
            </Link>
        </div>

      </div>
    </div>
  );
}