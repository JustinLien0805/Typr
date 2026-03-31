import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QUIZ_CATEGORIES } from "../data/questionsData";

const VISUAL_CONFIG: Record<
  string,
  {
    subtitle: string;
    color: string;
    fontClass: string;
    fontName: string;
    section: "play" | "more";
    comingSoon?: boolean;
    // Desktop: position around center (percentage from center)
    desktop: { x: string; y: string; align: "left" | "right" };
  }
> = {
  micro: {
    subtitle: "Spacing & Weight",
    color: "#4ADE80",
    fontClass: "font-['Jura']",
    fontName: "Jura",
    section: "play",
    desktop: { x: "-44vw", y: "-30vh", align: "left" },
  },
  classification: {
    subtitle: "Serif vs Sans",
    color: "#60A5FA",
    fontClass: "font-['Montserrat'] font-thin tracking-wide",
    fontName: "Montserrat",
    section: "play",
    desktop: { x: "18vw", y: "-30vh", align: "left" },
  },
  poster: {
    subtitle: "Display Impact",
    color: "#FACC15",
    fontClass: "font-['Satisfy']",
    fontName: "Satisfy",
    section: "play",
    desktop: { x: "-44vw", y: "-4vh", align: "left" },
  },
  fundamantal: {
    subtitle: "Structure Details",
    color: "#C084FC",
    fontClass: "font-['DM_Serif_Display'] italic",
    fontName: "DM Serif",
    section: "play",
    desktop: { x: "18vw", y: "-4vh", align: "left" },
  },
  all: {
    subtitle: "Mixed Challenge",
    color: "#F472B6",
    fontClass: "font-['Space_Grotesk'] font-medium",
    fontName: "Space Grotesk",
    section: "play",
    desktop: { x: "18vw", y: "22vh", align: "left" },
  },
  multiplayer: {
    subtitle: "Competitive Mode",
    color: "#FB923C",
    fontClass: "font-['Chakra_Petch'] font-semibold",
    fontName: "Chakra Petch",
    section: "more",
    comingSoon: true,
    desktop: { x: "-44vw", y: "22vh", align: "left" },
  },
  history: {
    subtitle: "Stats & Records",
    color: "#94A3B8",
    fontClass: "font-['Libre_Baskerville'] italic",
    fontName: "Libre Baskerville",
    section: "more",
    comingSoon: true,
    desktop: { x: "-10vw", y: "32vh", align: "left" },
  },
};

interface SelectItem {
  id: string;
  title: string;
  questions: any[];
  subtitle: string;
  color: string;
  fontClass: string;
  fontName: string;
  section: "play" | "more";
  comingSoon?: boolean;
  desktop: { x: string; y: string; align: "left" | "right" };
}

const SELECT_ITEMS: SelectItem[] = [
  ...QUIZ_CATEGORIES.map((cat) => {
    const config = VISUAL_CONFIG[cat.id];
    if (!config) return null;
    return { ...cat, ...config } as SelectItem;
  }).filter((item): item is SelectItem => item !== null),
  {
    id: "all",
    title: "All",
    questions: [],
    ...VISUAL_CONFIG["all"],
  },
  {
    id: "multiplayer",
    title: "Multiplayer",
    questions: [],
    ...VISUAL_CONFIG["multiplayer"],
  },
  {
    id: "history",
    title: "History",
    questions: [],
    ...VISUAL_CONFIG["history"],
  },
];

const playItems = SELECT_ITEMS.filter((i) => i.section === "play");
const moreItems = SELECT_ITEMS.filter((i) => i.section === "more");

export default function SelectTopic() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const navigate = useNavigate();

  const activeTopic = SELECT_ITEMS.find((t) => t.id === activeId);
  const currentFontClass = activeTopic ? activeTopic.fontClass : "font-sans";

  const handleNavigate = (item: SelectItem) => {
    if (item.comingSoon || item.questions.length === 0) return;
    navigate(`/quiz/${item.questions[0].id}`);
  };

  return (
    <div
      className={`min-h-screen bg-black text-white relative overflow-hidden transition-all duration-300 ${currentFontClass}`}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

        <AnimatePresence mode="wait">
          {activeTopic && (
            <motion.div
              key={activeTopic.id}
              initial={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
              animate={{ opacity: 0.1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
              className="absolute inset-0 flex items-center justify-center z-0"
            >
              <h1 className="text-[20vw] font-bold text-white uppercase opacity-20 whitespace-nowrap">
                {activeTopic.fontName}
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeTopic && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: "0%" }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="absolute inset-0 z-0 mix-blend-overlay"
              style={{
                background: `linear-gradient(120deg, transparent 20%, ${activeTopic.color} 100%)`,
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ====== MOBILE: vertical list ====== */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16 md:hidden">
        <motion.h1
          className="text-5xl font-bold tracking-tighter leading-none italic mb-16 relative z-10 select-none"
          animate={{
            color: activeTopic ? activeTopic.color : "#ffffff",
            scale: activeId ? 1.03 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          typr
        </motion.h1>

        <div className="relative z-10 w-full max-w-2xl">
          <SectionLabel text="Play" />
          <div className="flex flex-col mb-10">
            {playItems.map((item) => (
              <SelectRow
                key={item.id}
                item={item}
                isActive={activeId === item.id}
                onHover={() => setActiveId(item.id)}
                onLeave={() => setActiveId(null)}
                onClick={() => handleNavigate(item)}
              />
            ))}
          </div>

          <SectionLabel text="More" />
          <div className="flex flex-col">
            {moreItems.map((item) => (
              <SelectRow
                key={item.id}
                item={item}
                isActive={activeId === item.id}
                onHover={() => setActiveId(item.id)}
                onLeave={() => setActiveId(null)}
                onClick={() => handleNavigate(item)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ====== DESKTOP: scattered around center ====== */}
      <div className="hidden md:flex items-center justify-center min-h-screen relative">
        {/* Central "typr" — P5 style with red offset */}
        <div className="relative z-10 select-none">
          {/* Colored offset shadow */}
          <motion.h1
            className="text-[10rem] lg:text-[14rem] font-black tracking-tighter leading-none italic absolute"
            animate={{
              x: activeId ? 6 : 0,
              y: activeId ? 6 : 0,
              opacity: activeId ? 1 : 0,
              color: activeTopic ? activeTopic.color : "#E60012",
            }}
            transition={{ type: "tween", duration: 0.1 }}
          >
            typr
          </motion.h1>
          {/* Main text */}
          <motion.h1
            className="text-[10rem] lg:text-[14rem] font-black tracking-tighter leading-none italic relative"
            animate={{
              color: "#ffffff",
              scale: activeId ? 1.05 : 1,
            }}
            transition={{ type: "tween", duration: 0.1 }}
          >
            typr
          </motion.h1>
        </div>

        {/* Floating items around center */}
        {SELECT_ITEMS.map((item) => (
          <FloatingItem
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            anyActive={activeId !== null}
            onHover={() => setActiveId(item.id)}
            onLeave={() => setActiveId(null)}
            onClick={() => handleNavigate(item)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Desktop: floating item around center ── */

function FloatingItem({
  item,
  isActive,
  anyActive,
  onHover,
  onLeave,
  onClick,
}: {
  item: SelectItem;
  isActive: boolean;
  anyActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const { desktop } = item;

  return (
    <motion.div
      className={`absolute z-20 p-10 ${item.comingSoon ? "cursor-default" : "cursor-pointer"}`}
      style={{
        left: "50%",
        top: "50%",
        x: desktop.x,
        y: desktop.y,
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      initial={{ opacity: 0, x: desktop.x, scale: 0.8 }}
      animate={{
        opacity: anyActive ? (isActive ? 1 : 0.35) : 0.85,
        scale: isActive ? 1.15 : anyActive ? 0.95 : 1,
        rotate: isActive ? -6 : 0,
      }}
      transition={{ type: "tween", duration: 0.15, ease: "easeOut" }}
    >
      <div className="relative group">
        {/* Colored offset shadow layer */}
        <motion.div
          className="absolute inset-0 -skew-x-[16deg]"
          animate={{
            backgroundColor: isActive ? item.color : "transparent",
            x: isActive ? 8 : 0,
            y: isActive ? 8 : 0,
          }}
          transition={{ type: "tween", duration: 0.1 }}
        />

        {/* Main skewed box */}
        <motion.div
          className="absolute inset-0 -skew-x-[16deg]"
          animate={{
            backgroundColor: isActive ? "white" : "black",
            border: isActive
              ? "3px solid white"
              : "2px solid #333",
          }}
          transition={{ type: "tween", duration: 0.1 }}
        />

        {/* Content */}
        <div className="relative px-8 py-5 z-10 flex items-center gap-4">
          <motion.div
            className="w-[6px] h-12"
            animate={{
              backgroundColor: isActive ? item.color : "#444",
            }}
            transition={{ duration: 0.1 }}
          />

          <div className="flex flex-col">
            <motion.h2
              className="text-2xl lg:text-3xl font-black uppercase leading-none"
              animate={{
                color: isActive ? "#000" : "#666",
              }}
              transition={{ duration: 0.1 }}
            >
              {item.title}
            </motion.h2>

            <motion.span
              className="text-[10px] font-bold uppercase tracking-[0.15em] mt-1.5"
              animate={{
                color: isActive ? item.color : "#555",
              }}
              transition={{ duration: 0.1 }}
            >
              {item.subtitle}
            </motion.span>

            {isActive && (
              <span className="text-[9px] text-black/50 absolute top-2 right-3 font-mono font-bold">
                {item.comingSoon
                  ? "SOON"
                  : item.questions.length > 0
                    ? `${item.questions.length} Qs`
                    : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Mobile: section label ── */

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-mono">
        {text}
      </span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  );
}

/* ── Mobile: row item ── */

function SelectRow({
  item,
  isActive,
  onHover,
  onLeave,
  onClick,
}: {
  item: SelectItem;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  return (
    <motion.div
      className={`flex items-center gap-4 py-4 px-2 cursor-pointer relative ${
        item.comingSoon ? "cursor-default" : ""
      }`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Accent bar */}
      <motion.div
        className="w-[2px] h-8 rounded-full shrink-0"
        animate={{
          backgroundColor: isActive ? item.color : "#333",
          width: isActive ? 4 : 2,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Title + subtitle */}
      <motion.div
        className="flex-1 flex items-baseline gap-4"
        animate={{ x: isActive ? 8 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <span
          className={`text-lg font-bold uppercase leading-none transition-colors duration-200 ${
            isActive ? "text-white" : "text-gray-500"
          }`}
        >
          {item.title}
        </span>
        <span
          className={`text-[11px] tracking-wide transition-colors duration-200 ${
            isActive ? "text-gray-400" : "text-gray-700"
          }`}
        >
          {item.subtitle}
        </span>
      </motion.div>

      {/* Right badge */}
      <AnimatePresence>
        {isActive && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="text-[9px] font-mono tracking-widest text-gray-500 shrink-0"
          >
            {item.comingSoon
              ? "SOON"
              : item.questions.length > 0
                ? `${item.questions.length} Qs`
                : ""}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-800/50" />
    </motion.div>
  );
}
