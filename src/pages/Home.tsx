import { Link } from "react-router-dom";
import HeroBackground from "../components/HeroBackground";

export default function Home() {
  return (
    <div className="w-screen h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[50px_50px]" />

      <div className="relative aspect-1440/1024 h-full w-auto max-w-full">
        <div className="absolute inset-0 z-0 -top-24">
          <HeroBackground />
        </div>

        {/* PLAY button is inside SVG via HeroBackground for perfect alignment */}
      </div>
    </div>
  );
}
