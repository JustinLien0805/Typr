import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { FundamantalQuestionConfig } from "../types";
interface QuizFundamantalProps {
  config: FundamantalQuestionConfig;
  onNext: () => void;
}

export default function QuizFundamantal({
  config,
  onNext,
}: QuizFundamantalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleLayerClick = (isLayerCorrect: boolean) => {
    if (submitted) return;
    setSubmitted(true);
    setIsCorrect(isLayerCorrect);
  };

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center relative p-6">
      <div className="absolute top-20 text-center w-full z-10">
        <p className="text-xl md:text-2xl text-white font-light tracking-wide mb-2">
          {config.title}
        </p>
      </div>

      <div className="relative w-full max-w-4xl aspect-4/3">
        <Suspense
          fallback={
            <div className="text-gray-600 flex justify-center items-center h-full">
              Loading Question...
            </div>
          }
        >
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

          <AnimatePresence>
            {submitted && (
              <motion.div
                key="result"
                className="absolute inset-0 z-10"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
              >
                <Suspense fallback={null}>
                  <config.ResultComponent className="w-full h-full" />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>
      </div>
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center absolute top-32 md:top-40 w-full pointer-events-none z-20"
          >
            <p
              className={`text-lg font-bold uppercase tracking-widest ${
                isCorrect ? "text-white" : "text-[#FD9798]"
              }`}
            >
              {isCorrect ? "Correct! +1" : "Oh no! The correct answers are:"}
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
    </div>
  );
}
