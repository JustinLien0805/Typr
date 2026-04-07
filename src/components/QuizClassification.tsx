import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ClassificationQuestionConfig } from "../types";
import type { AnswerResult } from "../types/storage";
import InfiniteMarquee from "./InfiniteMarquee";
import { useGoogleFonts } from "../hooks/useGoogleFonts";

interface QuizClassificationProps {
  config: ClassificationQuestionConfig;
  onNext: () => void;
  onAnswer?: (result: AnswerResult) => void;
  onRegisterSubmit?: (fn: () => void) => void;
}

export default function QuizClassification({
  config,
  onNext,
  onAnswer,
  onRegisterSubmit,
}: QuizClassificationProps) {
  // Derive fonts from options + optional subjectFont — no requiredFonts needed
  const fontFamilies = [
    ...config.options.map((o) => o.fontFamily).filter((f): f is string => !!f),
    ...(config.subjectFont ? [config.subjectFont] : []),
    ...(config.mainSubjectFont ? [config.mainSubjectFont] : []),
  ];
  useGoogleFonts(fontFamilies);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isAllCorrect, setIsAllCorrect] = useState(false);

  const ERROR_COLOR = "#FD9798";
  const SUCCESS_COLOR = "#86EFAC";
  const GRID_HOVER_GRADIENTS = [
    "from-violet-400/25 to-transparent",
    "from-orange-400/25 to-transparent",
    "from-rose-400/25 to-transparent",
    "from-sky-400/25 to-transparent",
    "from-purple-400/25 to-transparent",
    "from-red-400/25 to-transparent",
  ] as const;

  const handleSingleSelect = (id: string) => {
    if (submitted) return;
    const correct = config.options.find((o) => o.id === id)?.isCorrect ?? false;
    setSelectedIds([id]);
    setSubmitted(true);
    setIsAllCorrect(correct);
    onAnswer?.({ questionId: config.id, isCorrect: correct, selectedOptionIds: [id] });
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
    if (submitted) return;
    const correctIds = config.options.filter((o) => o.isCorrect).map((o) => o.id);
    const correct =
      selectedIds.length === correctIds.length &&
      selectedIds.every((id) => correctIds.includes(id));
    setSubmitted(true);
    setIsAllCorrect(correct);
    onAnswer?.({ questionId: config.id, isCorrect: correct, selectedOptionIds: selectedIds });
  };

  // Register submit fn with parent so timer can trigger it on timeout
  useEffect(() => {
    if (config.subtype === "grid") {
      onRegisterSubmit?.(() => handleGridSubmit());
    }
  }, [selectedIds, submitted]);

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

    let stateClasses = "";
    if (submitted) {
      if (opt.isCorrect) {
        stateClasses = "border-[#86EFAC] text-[#86EFAC]";
      } else if (isSelected && !opt.isCorrect) {
        stateClasses = "border-[#FD9798] text-[#FD9798]";
      } else {
        stateClasses = "border-gray-800 text-gray-600 opacity-30";
      }
    } else if (isSelected) {
      stateClasses = "bg-white border-white text-black";
    } else {
      stateClasses = "bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white";
    }

    return (
      <button
        key={opt.id}
        onClick={() => handleSingleSelect(opt.id)}
        className={`rounded-full px-8 py-3 text-sm font-medium tracking-wide capitalize transition-all duration-200 border ${stateClasses}`}
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
            color = SUCCESS_COLOR;
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
      <div className="grid grid-cols-2 gap-5 mb-16 w-full text-center md:grid-cols-3 md:gap-x-8 md:gap-y-10">
        {config.options.map((opt, index) => {
          const isSelected = selectedIds.includes(opt.id);
          const baseClasses =
            "group relative overflow-hidden rounded-[28px] px-4 py-6 text-slate-300 transition-all duration-300 backdrop-blur-md md:px-6 md:py-8";
          const hoverGradientClass =
            GRID_HOVER_GRADIENTS[index % GRID_HOVER_GRADIENTS.length];
          let stateClasses =
            "bg-white/5 text-slate-300 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.22)]";
          let scale = 1;
          let textColor: string | undefined = isSelected ? "#ffffff" : "#cbd5e1";

          if (submitted) {
            if (opt.isCorrect) {
              stateClasses =
                "bg-gradient-to-b from-green-300/20 to-green-300/8 text-[#86EFAC] shadow-[0_18px_50px_rgba(134,239,172,0.08)]";
              textColor = undefined;
            } else if (isSelected && !opt.isCorrect) {
              stateClasses =
                "bg-gradient-to-b from-rose-300/20 to-rose-300/8 text-[#FD9798] shadow-[0_18px_50px_rgba(253,151,152,0.08)]";
              textColor = undefined;
            } else {
              stateClasses =
                "bg-gradient-to-b from-white/[0.035] to-white/[0.012] text-gray-500 opacity-40 shadow-[0_12px_30px_rgba(0,0,0,0.16)]";
              textColor = undefined;
            }
          } else if (isSelected) {
            stateClasses =
              "bg-white/10 text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.05),0_20px_55px_rgba(0,0,0,0.24)]";
            scale = 1.015;
          }

          return (
            <motion.button
              key={opt.id}
              onClick={() => handleGridToggle(opt.id)}
              className={`${baseClasses} ${stateClasses}`}
              style={{
                scale,
                transformPerspective: 1000,
                fontFamily: opt.fontFamily,
              }}
              whileHover={
                submitted
                  ? undefined
                  : {
                      scale,
                      boxShadow:
                        "inset 0 -1px 0 rgba(255,255,255,0.06), 0 22px 60px rgba(0,0,0,0.26)",
                    }
              }
              whileTap={{ scale: 0.95 }}
              disabled={submitted}
            >
              {!submitted && (
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span
                    className={`absolute inset-0 bg-linear-to-br ${hoverGradientClass}`}
                  />
                </span>
              )}
              {!submitted && isSelected && (
                <span className="absolute right-3 top-3 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/85 text-[11px] font-bold text-black shadow-[0_6px_18px_rgba(255,255,255,0.18)]">
                  ✓
                </span>
              )}
              <span
                className="mt-3 block text-2xl md:text-3xl leading-none transition-all duration-200"
                style={{
                  color: textColor,
                  textShadow: isSelected && !submitted ? "0 1px 10px rgba(255,255,255,0.08)" : "none",
                }}
              >
                {opt.text}
              </span>
            </motion.button>
          );
        })}
      </div>

      {!submitted && (
        <button
          onClick={handleGridSubmit}
          className="px-10 py-3 bg-white text-black rounded-lg font-bold tracking-wide uppercase text-xs hover:bg-gray-200 transition-colors"
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
          {config.subject
            ? config.title.split("{subject}").map((part, i) =>
                i === 0 ? (
                  <span key={i}>{part}</span>
                ) : (
                  <span key={i}>
                    <span style={{ fontFamily: config.subjectFont }}>{config.subject}</span>
                    {part}
                  </span>
                )
              )
            : config.title}
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
