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

        <div
          className="absolute z-20"
          style={{
            left: "83.5%",
            top: "80%",
            transform: "translate(-50%, -50%)",
          }}
        >
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
