import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { FundamantalQuestionConfig } from "../types";
import type { AnswerResult } from "../types/storage";

interface QuizFundamantalProps {
  config: FundamantalQuestionConfig;
  onNext: () => void;
  onAnswer?: (result: AnswerResult) => void;
}

export default function QuizFundamantal({
  config,
  onNext,
  onAnswer,
}: QuizFundamantalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const submitted = selectedId !== null;
  const selectedOption = config.options.find((o) => o.id === selectedId);
  const isCorrect = selectedOption?.isCorrect ?? false;
  const correctOption = config.options.find((o) => o.isCorrect);

  const handleSelect = (optionId: string) => {
    if (submitted) return;
    setSelectedId(optionId);
    const option = config.options.find((o) => o.id === optionId);
    onAnswer?.({
      questionId: config.id,
      isCorrect: option?.isCorrect ?? false,
      selectedOptionIds: [optionId],
    });
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center relative">
      {/* Question title */}
      <p className="absolute top-24 text-center w-full px-6 z-10 text-base md:text-xl font-light tracking-wide">
        {config.title}
      </p>

      {/* SVG illustration */}
      <div className="relative w-full max-w-2xl aspect-4/3">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              Loading...
            </div>
          }
        >
          {/* Base illustration */}
          <div className="absolute inset-0">
            <config.QuestionComponent className="w-full h-full" />
          </div>

          {/* Answer overlay */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                key="result"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <config.ResultComponent className="w-full h-full" />
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>
      </div>

      {/* Color choices */}
      <div className="flex items-center gap-4 mt-8 z-10">
        {config.options.map((option) => {
          const isSelected = selectedId === option.id;
          const showResult = submitted;
          const isWrongPick = isSelected && !option.isCorrect;
          const isCorrectAnswer = showResult && option.isCorrect;

          return (
            <motion.button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={submitted}
              className="relative rounded-full cursor-pointer disabled:cursor-default"
              animate={{
                scale: isSelected ? 1.2 : 1,
                opacity: submitted && !isSelected && !option.isCorrect ? 0.3 : 1,
              }}
              transition={{ type: "tween", duration: 0.15 }}
            >
              {/* Outer ring — shows on correct answer after submit */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: isCorrectAnswer
                    ? `0 0 0 3px ${option.color}`
                    : isWrongPick
                    ? "0 0 0 3px #ef4444"
                    : "0 0 0 0px transparent",
                }}
                transition={{ duration: 0.2 }}
              />
              <div
                className="w-10 h-10 rounded-full"
                style={{ backgroundColor: option.color }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {submitted && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-5 text-sm font-bold uppercase tracking-wide z-10 ${
              isCorrect ? "text-white" : "text-[#FD9798]"
            }`}
          >
            {isCorrect ? "Correct!" : `Wrong — it's ${correctOption?.id}`}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Next button */}
      <div className="absolute bottom-12 z-10">
        <AnimatePresence>
          {submitted && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onNext}
              className="text-gray-400 hover:text-white text-xs uppercase tracking-[0.2em] border-b border-transparent hover:border-white transition-all pb-1 cursor-pointer"
            >
              Next →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
