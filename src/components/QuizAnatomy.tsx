// src/components/QuizAnatomy.tsx

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { AnatomyQuestionConfig } from "../types";
interface QuizAnatomyProps {
  config: AnatomyQuestionConfig;
  onNext: () => void;
}

export default function QuizAnatomy({ config, onNext }: QuizAnatomyProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleLayerClick = (isLayerCorrect: boolean) => {
    if (submitted) return;
    setSubmitted(true);
    setIsCorrect(isLayerCorrect);
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center relative p-6">
      {/* Title */}
      <div className="absolute top-20 text-center w-full z-10">
        <p className="text-sm text-gray-500 mb-2">{config.title}</p>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full max-w-4xl aspect-4/3">
        {/* 1. 外層 Suspense：只負責「題目底圖」的初始載入
             如果題目還沒載好，顯示 Loading 文字
        */}
        <Suspense
          fallback={
            <div className="text-gray-600 flex justify-center items-center h-full">
              Loading Question...
            </div>
          }
        >
          {/* --- LAYER 1: QUESTION (永遠顯示) --- */}
          <div className="absolute inset-0 z-0">
            {config.layers.map((layer) => (
              <div
                key={layer.id}
                className={`absolute inset-0 w-full h-full ${
                  layer.isBase || submitted
                    ? "pointer-events-none"
                    : "pointer-events-none interactive-layer"
                }`}
                onClick={
                  !layer.isBase && !submitted
                    ? () => handleLayerClick(layer.isCorrect)
                    : undefined
                }
              >
                <layer.Component className="w-full h-full" />
              </div>
            ))}
          </div>

          {/* --- LAYER 2: RESULT (淡入覆蓋) --- */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                key="result"
                className="absolute inset-0 z-10" // 蓋在上面
                // *** Animation 設定 ***
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }} // 持續 0.8 秒 (調慢一點更有質感)
              >
                {/* 內層 Suspense: 
                    防止 lazy load 導致畫面閃爍。
                    fallback={null} 讓載入期間保持透明，
                    載入完成後因為外層 motion.div 的關係，會直接顯示(或淡入)。
                */}
                <Suspense fallback={null}>
                  <config.ResultComponent className="w-full h-full" />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>
      </div>

      {/* Result Feedback Text */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            // 修改 1: 動畫方向微調 (選用，讓它從上面輕輕滑下來)
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            // 修改 2: 位置從 bottom-24 改到 top-32 (標題下方)
            className="absolute top-32 md:top-40 text-center w-full pointer-events-none z-20"
          >
            <p
              className={`text-xs font-bold uppercase tracking-widest ${
                isCorrect ? "text-white" : "text-[#FD9798]"
              }`}
            >
              {isCorrect ? "Correct! +1" : "Oh no! The correct answers are:"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Button */}
      <div className="absolute bottom-12 z-30">
        <AnimatePresence>
          {submitted && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onNext}
              className="text-gray-400 hover:text-white text-xs uppercase tracking-[0.2em] border-b border-transparent hover:border-white transition-all pb-1"
            >
              Next Question →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
