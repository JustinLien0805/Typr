import React, { Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";

interface MicroCanvasProps {
  // 接收兩個大圖元件
  QuestionComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  ResultComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  showResult: boolean;
}

export default function MicroCanvas({
  QuestionComponent,
  ResultComponent,
  showResult,
}: MicroCanvasProps) {
  // 畫布尺寸 (根據你的 Figma 設定，通常是 800x400)
  const width = 800;
  const height = 400;
  const LoadingPlaceholder = (
    <g>
      <br />
    </g>
  );
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-4xl overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 使用 mode="wait" 確保先淡出再淡入 */}
      <Suspense fallback={LoadingPlaceholder}>
        <AnimatePresence mode="wait">
          {/* ================= STAGE 1: QUESTION (ba.svg) ================= */}
          {!showResult && (
            <motion.g
              key="question-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                transition: { duration: 0.4, ease: "easeOut" },
              }}
            >
              {/* 直接滿版渲染 ba.svg */}
              <QuestionComponent x={0} y={0} width={width} height={height} />
            </motion.g>
          )}
          {/* ================= STAGE 2: RESULT ================= */}
          // src/components/MicroCanvas.tsx 修改 Result 的 motion.g
          {showResult && (
            <motion.g
              key="result-state"
              // 初始狀態：模糊且稍微透明
              initial={{ opacity: 0, filter: "blur(10px)", scale: 1.02 }}
              // 結束狀態：清晰且無縮放
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <ResultComponent x={0} y={0} width={width} height={height} />
            </motion.g>
          )}
        </AnimatePresence>
      </Suspense>
    </svg>
  );
}
