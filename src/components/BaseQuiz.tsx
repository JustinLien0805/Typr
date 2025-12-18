import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGoogleFonts } from "../hooks/useGoogleFonts";

export type FontOption = {
  id: string;
  name: string;
  fontFamily: string;
  isCorrect: boolean;
  styleAdjustment?: {
    yOffset?: number;
    xOffset?: number;
    scale?: number;
  };
};

interface BaseQuizProps {
  questionTitle: string;
  options: FontOption[];
  onNextStep?: () => void;
  renderCanvas: (currentFont: string) => React.ReactNode;

  // --- 1. 樣式主題 (Theming) ---
  theme?: {
    backgroundColor: string; // e.g., "bg-black" or "bg-[#F3F0E6]"
    textColor: string; // e.g., "text-white" or "text-gray-900"

    // 按鈕樣式 (通常跟背景色要有對比)
    buttonBgColor?: string; // e.g., "bg-[#E6E6E6]" or "bg-white"
    buttonTextColor?: string; // e.g., "text-black"
    buttonHoverColor?: string; // hover 時的顏色
  };
  posterWidth?: string;
  lineAlignment?: string;
}

export default function BaseQuiz({
  questionTitle,
  options,
  posterWidth = "md:w-[35vw]",
  renderCanvas,
  onNextStep,
  theme = {
    backgroundColor: "bg-black",
    textColor: "text-white",
    buttonBgColor: "bg-[#E6E6E6]",
    buttonTextColor: "text-black",
    buttonHoverColor: "hover:bg-white",
  },
  lineAlignment = "items-center",
}: BaseQuizProps) {
  const [hoveredFont, setHoveredFont] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<FontOption | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const correctOption = options.find((o) => o.isCorrect);
  const correctFont = correctOption?.fontFamily || "sans-serif";

  const successPhrases = [
    "That is correct! +1",
    "Fantastic! +1",
    "Excellent! +1",
    "Perfect Match! +1",
  ];

  const handleSelect = (option: FontOption) => {
    setSelectedOption(option);
    setHoveredFont(null);
    setIsSubmitted(true);
    setSuccessMessage(
      successPhrases[Math.floor(Math.random() * successPhrases.length)]
    );
  };

  const displayFont = isSubmitted
    ? correctFont
    : hoveredFont || "var(--font-sans)";

  const fontList = options.map((opt) => opt.fontFamily);
  const fontsLoaded = useGoogleFonts(fontList);
  if (!fontsLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading Fonts...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      <div className="w-full max-w-4xl text-center mb-8 relative z-20 h-12 flex items-end justify-center">
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.h1
              key="question"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              className="text-xl md:text-2xl font-sans font-light tracking-wide text-white"
            >
              {questionTitle}
            </motion.h1>
          ) : (
            <motion.div
              key="result-title"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-lg font-bold uppercase tracking-widest ${
                selectedOption?.isCorrect ? "text-white" : "text-[#FD9798]"
              }`}
            >
              {selectedOption?.isCorrect
                ? successMessage
                : "Oh no! The correct answer is:"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-center gap-8 relative z-10">
        <motion.div
          layout
          className={`w-full ${posterWidth} relative z-10 flex flex-col ${lineAlignment}`}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {renderCanvas(displayFont)}
        </motion.div>

        <div className="flex-1 w-full max-w-md min-h-[400px] flex flex-col justify-center relative pl-0 md:pl-0">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key="options"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.3 } }}
                className="space-y-6 w-full pl-8"
              >
                {options.map((option) => (
                  <button
                    key={option.id}
                    onMouseEnter={() => setHoveredFont(option.fontFamily)}
                    onMouseLeave={() => setHoveredFont(null)}
                    onClick={() => handleSelect(option)}
                    className="w-full h-16 bg-[#E6E6E6] text-black rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-white hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  >
                    <span
                      className="text-xl md:text-2xl"
                      style={{
                        fontFamily: option.fontFamily,
                        fontWeight: "400",
                      }}
                    >
                      {option.name}
                    </span>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex items-center w-full"
              >
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 80, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                  className="h-px bg-white mr-6 shrink-0"
                />

                <div className="flex flex-col items-start">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-4xl md:text-5xl text-white uppercase whitespace-nowrap"
                    style={{ fontFamily: correctFont }}
                  >
                    {correctOption?.name}
                  </motion.div>

                  <motion.button
                    onClick={() => {
                      if (onNextStep) {
                        onNextStep();
                      } else {
                        window.location.reload();
                      }
                    }}
                    className={`mt-8 text-xs uppercase tracking-widest border px-4 py-2 transition-colors
        ${
          theme.textColor === "text-black"
            ? "border-black text-black hover:bg-black hover:text-white"
            : "border-gray-600 text-gray-400 hover:border-white hover:text-white"
        }
      `}
                  >
                    Next Question →
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
