import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QUIZ_CATEGORIES } from "../data/questionsData";

const VISUAL_CONFIG: Record<
  string,
  {
    subtitle: string;
    color: string;
    position: string;
    lineOrigin: { x: number; y: number };
    lineEnd: { x: number; y: number };
    fontClass: string;
    fontName: string;
  }
> = {
  micro: {
    subtitle: "Spacing & Weight",
    color: "#4ADE80",
    position: "top-0 left-0 md:top-20 md:left-20",
    lineOrigin: { x: 20, y: 30 },
    lineEnd: { x: 15, y: 20 },
    fontClass: "font-['Jura'] font-bold",
    fontName: "Jura",
  },
  poster: {
    subtitle: "Display Impact",
    color: "#FACC15",
    position: "bottom-0 left-0 md:bottom-20 md:left-20",
    lineOrigin: { x: 32, y: 80 },
    lineEnd: { x: 15, y: 90 },
    fontClass: "font-['Satisfy'] font-normal",
    fontName: "Satisfy",
  },
  classification: {
    subtitle: "Serif vs Sans",
    color: "#60A5FA",
    position: "top-0 right-0 md:top-24 md:right-24",
    lineOrigin: { x: 65, y: 30 },
    lineEnd: { x: 80, y: 15 },
    fontClass: "font-['Montserrat'] font-thin tracking-widest",
    fontName: "Montserrat",
  },
  fundamantal: {
    subtitle: "Structure Details",
    color: "#C084FC",
    position: "bottom-0 right-0 md:bottom-32 md:right-32",
    lineOrigin: { x: 88, y: 55 },
    lineEnd: { x: 95, y: 75 },
    fontClass: "font-['DM_Serif_Display'] italic",
    fontName: "DM Serif",
  },
};

export default function SelectTopic() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const navigate = useNavigate();
  const categoriesWithStyle = QUIZ_CATEGORIES.map((cat) => {
    const config = VISUAL_CONFIG[cat.id];
    if (!config) return null;
    return { ...cat, ...config };
  }).filter((item) => item !== null);

  const activeTopic = categoriesWithStyle.find((t) => t.id === activeId);
  const currentFontClass = activeTopic ? activeTopic.fontClass : "font-sans";
  const handleNavigate = (topicId: string) => {
    const topic = categoriesWithStyle.find((t) => t.id === topicId);
    if (topic && topic.questions && topic.questions.length > 0) {
      navigate(`/quiz/${topic.questions[0].id}`);
    }
  };
  return (
    <div
      className={`min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center transition-all duration-300 ${currentFontClass}`}
    >
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

      <div className="relative z-10 w-[300px] h-[150px] md:w-[600px] md:h-[300px]">
        <svg className="absolute inset-0 w-full h-full pointer-events-none visible overflow-visible">
          {categoriesWithStyle.map((topic) => {
            const isActive = activeId === topic.id;
            return (
              <motion.line
                key={topic.id}
                x1={`${topic.lineOrigin.x}%`}
                y1={`${topic.lineOrigin.y}%`}
                x2={`${topic.lineOrigin.x}%`}
                y2={`${topic.lineOrigin.y}%`}
                animate={{
                  x2: isActive
                    ? `${topic.lineEnd.x}%`
                    : `${topic.lineOrigin.x}%`,
                  y2: isActive
                    ? `${topic.lineEnd.y}%`
                    : `${topic.lineOrigin.y}%`,
                  stroke: topic.color,
                  strokeWidth: isActive ? 4 : 0,
                  opacity: isActive ? 1 : 0,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <motion.h1
            className="text-[8rem] md:text-[14rem] font-bold tracking-tighter leading-none italic relative mix-blend-lighten transition-all duration-300"
            animate={{
              scale: activeId ? 1.05 : 1,
              x: activeId ? [0, -2, 2, 0] : 0,
            }}
            transition={{ duration: 0.2 }}
          >
            <span
              className={`transition-colors duration-200 ${
                activeId === "micro" ? "text-[#4ADE80]" : "text-white"
              }`}
            >
              t
            </span>
            <span
              className={`transition-colors duration-200 ${
                activeId === "poster" ? "text-[#FACC15]" : "text-white"
              }`}
            >
              y
            </span>
            <span
              className={`transition-colors duration-200 ${
                activeId === "classification" ? "text-[#60A5FA]" : "text-white"
              }`}
            >
              p
            </span>
            <span
              className={`transition-colors duration-200 ${
                activeId === "fundamantal" ? "text-[#C084FC]" : "text-white"
              }`}
            >
              r
            </span>
          </motion.h1>
        </div>

        <div
          className="absolute top-[10%] left-[10%] w-[20%] h-[50%] cursor-pointer z-20"
          onMouseEnter={() => setActiveId("micro")}
          onMouseLeave={() => setActiveId(null)}
          onClick={() => handleNavigate("micro")}
        />

        <div
          className="absolute bottom-[10%] left-[25%] w-[20%] h-[50%] cursor-pointer z-20"
          onMouseEnter={() => setActiveId("poster")}
          onMouseLeave={() => setActiveId(null)}
          onClick={() => handleNavigate("poster")}
        />

        <div
          className="absolute top-[20%] right-[35%] w-[20%] h-[50%] cursor-pointer z-20"
          onMouseEnter={() => setActiveId("classification")}
          onMouseLeave={() => setActiveId(null)}
          onClick={() => handleNavigate("classification")}
        />

        <div
          className="absolute bottom-[10%] right-[15%] w-[20%] h-[50%] cursor-pointer z-20"
          onMouseEnter={() => setActiveId("fundamantal")}
          onMouseLeave={() => setActiveId(null)}
          onClick={() => handleNavigate("fundamantal")}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        {categoriesWithStyle.map((topic) => (
          <MenuItem
            key={topic.id}
            topic={topic}
            isActive={activeId === topic.id}
            onHover={() => setActiveId(topic.id)}
            onLeave={() => setActiveId(null)}
          />
        ))}
      </div>

      <div className="absolute bottom-10 text-center w-full opacity-50 uppercase tracking-[0.3em] text-xs font-sans">
        Select a mode to <span className="text-white font-bold">Reshape</span>{" "}
        the interface
      </div>
    </div>
  );
}

function MenuItem({
  topic,
  isActive,
  onHover,
  onLeave,
}: {
  topic: any;
  isActive: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const firstQuestionId = topic.questions?.[0]?.id;
  const linkTarget = firstQuestionId ? `/quiz/${firstQuestionId}` : "#";

  return (
    <div
      className={`absolute ${topic.position} pointer-events-auto flex flex-col items-center md:items-start`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <Link to={linkTarget} className="block">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 20 }}
          animate={{
            opacity: isActive ? 1 : 0.9,
            scale: isActive ? 1.1 : 0.9,
            rotate: isActive ? -2 : 0,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative group cursor-pointer"
        >
          <motion.div
            className="absolute inset-0 -skew-x-12 bg-black"
            animate={{
              border: isActive ? `2px solid ${topic.color}` : "1px solid #444",
              boxShadow: isActive
                ? `4px 4px 0px ${topic.color}`
                : "0px 0px 0px transparent",
            }}
          />

          <div className="relative px-8 py-5 z-10 flex items-center gap-4">
            <motion.div
              className="w-2 h-10 bg-white"
              animate={{ backgroundColor: isActive ? topic.color : "#555" }}
            />

            <div className="flex flex-col">
              <h2
                className={`text-2xl font-bold uppercase leading-none ${
                  isActive ? "text-white" : "text-gray-400"
                }`}
              >
                {topic.title}
              </h2>
              <span className="text-[10px] tracking-widest text-gray-500 mt-1">
                {topic.subtitle || topic.description}
              </span>

              {isActive && (
                <span className="text-[9px] text-white/60 absolute top-2 right-2 font-mono">
                  {topic.questions.length} Qs
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </div>
  );
}
