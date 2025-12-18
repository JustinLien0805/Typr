import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ClassificationQuestionConfig } from "../types";
import InfiniteMarquee from "./InfiniteMarquee";
import { useGoogleFonts } from "../hooks/useGoogleFonts"; // 引入 Hook

interface QuizClassificationProps {
  config: ClassificationQuestionConfig;
  onNext: () => void;
}

export default function QuizClassification({
  config,
  onNext,
}: QuizClassificationProps) {
  // 1. 使用 Hook 載入字體
  useGoogleFonts(config.requiredFonts || []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // *** 根據設計稿定義的錯誤顏色 ***
  const ERROR_COLOR = "#FD9798";
  const SUCCESS_COLOR = "#00A73D";
  // Handlers
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
    // 如果是單選題 (Classifier/Imposter)，檢查選到的那個是否正確
    ((config.subtype !== "grid" &&
      config.options.find((o) => o.id === selectedIds[0])?.isCorrect) ||
      // 如果是多選題 (Grid)，檢查選的數量和 ID 是否完全匹配正確答案
      (config.subtype === "grid" &&
        selectedIds.length ===
          config.options.filter((o) => o.isCorrect).length &&
        selectedIds.every(
          (id) => config.options.find((o) => o.id === id)?.isCorrect
        )));
  // --- Renderers ---

  // Type A: Classifier
  const renderClassifier = () => {
    // 判斷按鈕佈局：如果有 3 個以上按鈕，分為兩排 (參考 Q7 截圖)
    // 這裡做一個簡單的分割邏輯
    const topRowOptions = config.options.slice(0, 2);
    const bottomRowOptions = config.options.slice(2);
    const hasTwoRows = config.options.length > 3;

    return (
      <div className="flex flex-col items-center w-full max-w-4xl relative z-10">
        {/* Variant 1: Big Text Mode (如果 config 有 mainSubject) */}
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

        {/* Buttons Container */}
        <div className="flex flex-col gap-6 items-center w-full">
          {/* Row 1 */}
          <div className="flex gap-4 md:gap-8 justify-center flex-wrap">
            {topRowOptions.map((opt) => renderPillButton(opt))}
          </div>
          {/* Row 2 (如果有) */}
          {hasTwoRows && (
            <div className="flex gap-4 md:gap-8 justify-center flex-wrap">
              {bottomRowOptions.map((opt) => renderPillButton(opt))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 輔助函式：渲染藥丸按鈕 (Type A)
  const renderPillButton = (opt: any) => {
    const isSelected = selectedIds.includes(opt.id);
    let btnClass =
      "border border-gray-600 bg-gray-900/50 text-gray-300 backdrop-blur-sm hover:border-white hover:text-white";
    let styleObj = {};

    if (submitted) {
      if (opt.isCorrect) {
        // 正解：白色 (參考 Q7 Correct)
        btnClass = "bg-white text-black border-white opacity-100";
      } else if (isSelected && !opt.isCorrect) {
        // 選錯：紅色 #FD9798 (參考 Type B/C 的錯誤邏輯，或保持設計稿的灰色)
        // 設計稿 Q7 若選錯 (Typo)，按鈕似乎是變暗顯示正確答案
        // 這裡我們讓選錯的變暗，正確的亮起
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

  // Type B: Imposter (Reveal Logic)
  const renderImposter = () => (
    <div className="flex flex-row justify-center gap-8 md:gap-16 w-full max-w-5xl items-center relative z-10">
      {config.options.map((opt) => {
        const isSelected = selectedIds.includes(opt.id);

        // 1. 決定顯示文字 (Reveal Logic)
        // 如果提交了 且 (是這個選項被選錯 OR 我們想揭曉所有錯誤選項)，顯示 revealText
        // 根據截圖，點錯後，錯誤的那個會變名，其他的也會變暗
        const displayText =
          submitted && !opt.isCorrect ? opt.revealText || opt.text : opt.text;

        // 2. 決定顏色
        let color = "white";
        let opacity = 1;

        if (submitted) {
          if (opt.isCorrect) {
            color = "white"; // 正確選項保持白色
            opacity = 1;
          } else if (isSelected) {
            // *** 選錯的選項變紅 ***
            color = ERROR_COLOR;
            opacity = 1;
          } else {
            // 沒選的其他選項：變暗 (如 Screenshot Q10 Answer-Correct)
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
              fontFamily: opt.fontFamily, // 使用各個選項自己的字體
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

  // Type C: Grid (Multi-select)
  const renderGrid = () => (
    <div className="flex flex-col items-center w-full max-w-4xl relative z-10">
      <div className="grid grid-cols-3 gap-x-12 gap-y-20 mb-16 w-full text-center">
        {config.options.map((opt) => {
          const isSelected = selectedIds.includes(opt.id);

          let color = "white";
          let opacity = 1;

          if (submitted) {
            if (opt.isCorrect) {
              // *** 修改處：正確答案顯示綠色 (#00A73D) ***
              // 不管有沒有選到，都顯示綠色，讓使用者清楚知道哪些是對的
              color = SUCCESS_COLOR;
              opacity = 1;
            } else if (isSelected && !opt.isCorrect) {
              // 選錯的：顯示紅色
              color = ERROR_COLOR;
              opacity = 1;
            } else {
              // 沒選且是錯的：變暗淡出
              color = "white";
              opacity = 0.2;
            }
          } else {
            // 未提交：選中亮白，未選灰色
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

      {/* Grid Submit Button */}
      {!submitted && (
        <button
          onClick={handleGridSubmit}
          className="px-12 py-2 border border-gray-600 rounded-full text-white hover:bg-white hover:text-black transition-colors uppercase tracking-widest text-xs font-bold"
        >
          Submit
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* 標題區域 */}
      <div className="absolute top-16 md:top-24 text-center w-full z-20">
        {/* 根據設計稿，純問題版的標題就是主體，所以字體可以大一點 */}
        <div className="text-center text-xl md:text-2xl text-white font-light tracking-wide">
          {config.title}
        </div>
      </div>

      {/* 主內容區 */}
      <div className="grow flex items-center justify-center w-full">
        {config.subtype === "classifier" && renderClassifier()}
        {config.subtype === "imposter" && renderImposter()}
        {config.subtype === "grid" && renderGrid()}
      </div>

      {/* 結果回饋 (Result Text) */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-32 md:top-40 text-center w-full pointer-events-none z-20"
          >
            <p
              className={`text-lg font-bold uppercase tracking-widest ${
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
      {/* Marquee (如果有設定) */}
      {config.marquee && <InfiniteMarquee items={config.marquee} />}
    </div>
  );
}
