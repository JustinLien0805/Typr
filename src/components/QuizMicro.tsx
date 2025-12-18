// src/components/QuizMicro.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { MicroQuestionConfig } from "../types";
import MicroCanvas from "./MicroCanvas";

interface QuizMicroProps {
  config: MicroQuestionConfig;
  onNext: () => void;
}

export default function QuizMicro({ config, onNext }: QuizMicroProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentOptions = config.options || [
    "weight",
    "kerning",
    "tracking",
    "leading",
  ];

  const toggleOption = (option: string) => {
    if (isSubmitted) return;
    if (selectedOptions.includes(option)) {
      setSelectedOptions((prev) => prev.filter((o) => o !== option));
    } else {
      setSelectedOptions((prev) => [...prev, option]);
    }
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center relative">
      {/* 內容層 */}
      <div className="z-10 w-full max-w-5xl flex flex-col items-center px-4">
        {/* 標題區域 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <p className="text-xl md:text-2xl text-white font-light tracking-wide">
            {config.title}
          </p>
        </motion.div>

        {/* 畫布區域 */}
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
          {currentOptions.map((opt) => {
            const isSelected = selectedOptions.includes(opt);
            const isCorrect = config.correctOptions.includes(opt);

            // --- 樣式邏輯重寫 ---
            // 基礎：Pill 形狀, 邊框, 過渡效果
            let baseClasses =
              "rounded-full px-8 py-3 text-sm font-medium tracking-wide capitalize transition-all duration-200 border";

            let stateClasses = "";

            if (isSubmitted) {
              // 結果狀態 (扁平色塊)
              if (isCorrect) {
                // 正解：綠色實心
                stateClasses = "bg-green-600 border-green-600 text-white";
              } else if (isSelected && !isCorrect) {
                // 選錯：紅色實心
                stateClasses = "bg-red-600 border-red-600 text-white";
              } else {
                // 未選且無關：變暗淡
                stateClasses = "border-gray-800 text-gray-600 opacity-30";
              }
            } else if (isSelected) {
              // 選取中：白底黑字 (經典樣式)
              stateClasses = "bg-white border-white text-black";
            } else {
              // 預設：透明底 + 白邊框 (Hover 時變亮)
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

        {/* Submit 按鈕 */}
        {!isSubmitted && selectedOptions.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSubmit}
            className="px-10 py-3 bg-white text-black rounded-full font-bold tracking-widest uppercase text-xs hover:bg-gray-200 transition-colors"
          >
            Submit
          </motion.button>
        )}
      </div>

      {/* Next Button */}
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
