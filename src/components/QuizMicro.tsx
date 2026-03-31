import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { MicroQuestionConfig } from "../types";
import type { AnswerResult } from "../types/storage";
import MicroCanvas from "./MicroCanvas";

interface QuizMicroProps {
  config: MicroQuestionConfig;
  onNext: () => void;
  onAnswer?: (result: AnswerResult) => void;
  onRegisterSubmit?: (fn: () => void) => void;
}

export default function QuizMicro({ config, onNext, onAnswer, onRegisterSubmit }: QuizMicroProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const toggleOption = (option: string) => {
    if (isSubmitted) return;
    if (selectedOptions.includes(option)) {
      setSelectedOptions((prev) => prev.filter((o) => o !== option));
    } else {
      setSelectedOptions((prev) => [...prev, option]);
    }
  };

  const handleSubmit = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    const isCorrect =
      selectedOptions.length === config.correctOptions.length &&
      selectedOptions.every((o) => config.correctOptions.includes(o));
    onAnswer?.({ questionId: config.id, isCorrect, selectedOptionIds: selectedOptions });
  };

  // Register submit fn with parent so timer can trigger it on timeout
  useEffect(() => {
    onRegisterSubmit?.(() => handleSubmit());
  }, [selectedOptions, isSubmitted]);

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center relative">
      <div className="z-10 w-full max-w-5xl flex flex-col items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <p className="text-xl md:text-2xl text-white font-light tracking-wide">
            {config.title}
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full flex justify-center items-center mb-16"
        >
          <MicroCanvas
            QuestionComponent={config.QuestionComponent}
            ResultComponent={config.ResultComponent}
            showResult={isSubmitted}
          />
        </motion.div>

        <div className="flex flex-wrap gap-4 justify-center mb-12">
          {config.options.map((opt) => {
            const isSelected = selectedOptions.includes(opt);
            const isCorrect = config.correctOptions.includes(opt);

            let baseClasses =
              "rounded-full px-8 py-3 text-sm font-medium tracking-wide capitalize transition-all duration-200 border";

            let stateClasses = "";

            if (isSubmitted) {
              if (isCorrect) {
                stateClasses = "bg-green-600 border-green-600 text-white";
              } else if (isSelected && !isCorrect) {
                stateClasses = "bg-red-600 border-red-600 text-white";
              } else {
                stateClasses = "border-gray-800 text-gray-600 opacity-30";
              }
            } else if (isSelected) {
              stateClasses = "bg-white border-white text-black";
            } else {
              stateClasses =
                "bg-transparent border-gray-600 text-gray-400 hover:border-white hover:text-white";
            }

            return (
              <motion.button
                key={opt}
                onClick={() => toggleOption(opt)}
                whileTap={{ scale: 0.95 }}
                disabled={isSubmitted}
                className={`${baseClasses} ${stateClasses}`}
              >
                {opt}
              </motion.button>
            );
          })}
        </div>

        {!isSubmitted && selectedOptions.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSubmit}
            className="px-10 py-3 bg-white text-black rounded-lg font-bold tracking-wide uppercase text-xs hover:bg-gray-200 transition-colors"
          >
            Submit
          </motion.button>
        )}
      </div>

      <div className="absolute bottom-12 z-30">
        <AnimatePresence>
          {isSubmitted && (
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
    </div>
  );
}
