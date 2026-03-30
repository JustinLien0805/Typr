import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ClassificationQuestionConfig } from "../types";
import InfiniteMarquee from "./InfiniteMarquee";
import { useGoogleFonts } from "../hooks/useGoogleFonts";

interface QuizClassificationProps {
  config: ClassificationQuestionConfig;
  onNext: () => void;
}

export default function QuizClassification({
  config,
  onNext,
}: QuizClassificationProps) {
  useGoogleFonts(config.requiredFonts || []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const ERROR_COLOR = "#FD9798";
  const SUCCESS_COLOR = "#00A73D";

  const handleSingleSelect = (id: string) => {
    if (submitted) return;
    setSelectedIds([id]);
    setSubmitted(true);
  };

  const handleGridToggle = (id: string) => {
    if (submitted) return;
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleGridSubmit = () => {
    setSubmitted(true);
  };
  const isAllCorrect =
    submitted &&
    ((config.subtype !== "grid" &&
      config.options.find((o) => o.id === selectedIds[0])?.isCorrect) ||
      (config.subtype === "grid" &&
        selectedIds.length ===
          config.options.filter((o) => o.isCorrect).length &&
        selectedIds.every(
          (id) => config.options.find((o) => o.id === id)?.isCorrect
        )));

  const renderClassifier = () => {
    const topRowOptions = config.options.slice(0, 2);
    const bottomRowOptions = config.options.slice(2);
    const hasTwoRows = config.options.length > 3;

    return (
      <div className="flex flex-col items-center w-full max-w-4xl relative z-10">
        {config.mainSubject && (
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-6xl md:text-8xl mb-24 text-white text-center"
            style={{ fontFamily: config.mainSubjectFont }}
          >
            {config.mainSubject}
          </motion.h1>
        )}

        <div className="flex flex-col gap-6 items-center w-full">
          <div className="flex gap-4 md:gap-8 justify-center flex-wrap">
            {topRowOptions.map((opt) => renderPillButton(opt))}
          </div>
          {hasTwoRows && (
            <div className="flex gap-4 md:gap-8 justify-center flex-wrap">
              {bottomRowOptions.map((opt) => renderPillButton(opt))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPillButton = (opt: any) => {
    const isSelected = selectedIds.includes(opt.id);
    let btnClass =
      "border border-gray-600 bg-gray-900/50 text-gray-300 backdrop-blur-sm hover:border-white hover:text-white";
    let styleObj = {};

    if (submitted) {
      if (opt.isCorrect) {
        btnClass = "bg-white text-black border-white opacity-100";
      } else if (isSelected && !opt.isCorrect) {
        btnClass = "border-gray-800 text-gray-600 opacity-30";
      } else {
        btnClass = "border-gray-800 text-gray-600 opacity-30";
      }
    } else if (isSelected) {
      btnClass = "bg-white text-black border-white";
    }

    return (
      <button
        key={opt.id}
        onClick={() => handleSingleSelect(opt.id)}
        className={`rounded-full px-8 py-3 min-w-[120px] text-sm md:text-base font-medium transition-all duration-300 ${btnClass}`}
        style={styleObj}
        disabled={submitted}
      >
        {opt.text}
      </button>
    );
  };

  const renderImposter = () => (
    <div className="flex flex-row justify-center gap-8 md:gap-16 w-full max-w-5xl items-center relative z-10">
      {config.options.map((opt) => {
        const isSelected = selectedIds.includes(opt.id);

        const displayText =
          submitted && !opt.isCorrect ? opt.revealText || opt.text : opt.text;

        let color = "white";
        let opacity = 1;

        if (submitted) {
          if (opt.isCorrect) {
            color = "white";
            opacity = 1;
          } else if (isSelected) {
            color = ERROR_COLOR;
            opacity = 1;
          } else {
            color = "#333";
            opacity = 0.3;
          }
        }

        return (
          <motion.div
            key={opt.id}
            onClick={() => handleSingleSelect(opt.id)}
            className="text-4xl md:text-6xl cursor-pointer transition-all duration-500"
            style={{
              fontFamily: opt.fontFamily,
              color: color,
              opacity: opacity,
            }}
            layout
          >
            {displayText}
          </motion.div>
        );
      })}
    </div>
  );

  const renderGrid = () => (
    <div className="flex flex-col items-center w-full max-w-4xl relative z-10">
      <div className="grid grid-cols-3 gap-x-12 gap-y-20 mb-16 w-full text-center">
        {config.options.map((opt) => {
          const isSelected = selectedIds.includes(opt.id);

          let color = "white";
          let opacity = 1;

          if (submitted) {
            if (opt.isCorrect) {
              color = SUCCESS_COLOR;
              opacity = 1;
            } else if (isSelected && !opt.isCorrect) {
              color = ERROR_COLOR;
              opacity = 1;
            } else {
              color = "white";
              opacity = 0.2;
            }
          } else {
            color = isSelected ? "white" : "#9ca3af";
            opacity = 1;
          }

          return (
            <motion.button
              key={opt.id}
              onClick={() => handleGridToggle(opt.id)}
              className="text-2xl md:text-3xl transition-all duration-300 hover:text-white"
              style={{
                fontFamily: opt.fontFamily,
                color: color,
                opacity: opacity,
              }}
              whileTap={{ scale: 0.95 }}
              disabled={submitted}
            >
              {opt.text}
            </motion.button>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={handleGridSubmit}
          className="px-12 py-2 border border-gray-600 rounded-full text-white hover:bg-white hover:text-black transition-colors uppercase tracking-wide text-xs font-bold"
        >
          Submit
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden p-6">
      <div className="absolute top-16 md:top-24 text-center w-full z-20">
        <div className="text-center text-xl md:text-2xl text-white font-light tracking-wide">
          {config.title}
        </div>
      </div>

      <div className="grow flex items-center justify-center w-full">
        {config.subtype === "classifier" && renderClassifier()}
        {config.subtype === "imposter" && renderImposter()}
        {config.subtype === "grid" && renderGrid()}
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-32 md:top-40 text-center w-full pointer-events-none z-20"
          >
            <p
              className={`text-lg font-bold uppercase tracking-wide ${
                isAllCorrect ? "text-white" : "text-[#FD9798]"
              }`}
            >
              {isAllCorrect ? "Correct! +1" : "Oh no! The correct answer is:"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute bottom-24 z-30">
        <AnimatePresence>
          {submitted && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onNext}
              className="text-gray-400 hover:text-white text-xs uppercase tracking-[0.2em] border-b border-transparent hover:border-white transition-all pb-1 cursor-pointer"
            >
              Next Question →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {config.marquee && <InfiniteMarquee items={config.marquee} />}
    </div>
  );
}
