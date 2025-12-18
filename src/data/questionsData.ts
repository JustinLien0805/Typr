import React from "react";
import type { FontOption } from "../components/BaseQuiz";
import type {
  CanvasTextElement,
  MicroQuestionConfig,
  ClassificationQuestionConfig,
  FundamantalQuestionConfig,
} from "../types";

import posterBg from "../assets/technology.png";
import coffeeBg from "../assets/coffee.png";
const R33Svg = React.lazy(() => import("../assets/r33.svg?react"));
const R38Svg = React.lazy(() => import("../assets/r38.svg?react"));
const Ba33Svg = React.lazy(() => import("../assets/ba33.svg?react"));
const Ba38Svg = React.lazy(() => import("../assets/ba38.svg?react"));
const Q5Base = React.lazy(
  () => import("../assets/fundamantal/base1.svg?react")
);
const Q5Blue = React.lazy(
  () => import("../assets/fundamantal/blue1.svg?react")
);
const Q5Purple = React.lazy(
  () => import("../assets/fundamantal/purple1.svg?react")
);
const Q5Yellow = React.lazy(
  () => import("../assets/fundamantal/yellow1.svg?react")
);
const Q5Green = React.lazy(
  () => import("../assets/fundamantal/green1.svg?react")
);
const Q5Result = React.lazy(
  () => import("../assets/fundamantal/ans1.svg?react")
);
const Q4Base = React.lazy(
  () => import("../assets/fundamantal/base2.svg?react")
); // 白色 Typeface
const Q4Pink = React.lazy(
  () => import("../assets/fundamantal/pink2.svg?react")
); // Upper serif (T)
const Q4Blue = React.lazy(
  () => import("../assets/fundamantal/blue2.svg?react")
); // Bottom serif (y)
const Q4Green = React.lazy(
  () => import("../assets/fundamantal/green2.svg?react")
); // Bowl (a)
const Q4Yellow = React.lazy(
  () => import("../assets/fundamantal/yellow2.svg?react")
); // Terminal (f) - 正解
const Q4Result = React.lazy(
  () => import("../assets/fundamantal/ans2.svg?react")
);
export interface QuestionConfig {
  id: string;
  title: string;
  options: FontOption[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage: string;
  backgroundColor?: string;
  theme?: {
    backgroundColor: string;
    textColor: string;
    buttonBgColor: string;
    buttonTextColor: string;
    buttonHoverColor?: string;
  };
  lineAlignment?: string;
  posterWidthClass?: string;
  getElements: (
    currentFont: string,
    width: number,
    height: number
  ) => CanvasTextElement[];
}

export interface QuizCategory {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  questions: QuestionConfig[];
}

export const QUESTIONS: QuestionConfig[] = [
  {
    id: "q_poster",
    title:
      "which font matches the technical, clean aesthetic of the poster’s body text?",
    backgroundImage: posterBg,
    canvasWidth: 1280,
    canvasHeight: 1554,
    theme: {
      backgroundColor: "bg-black",
      textColor: "text-white",
      buttonBgColor: "bg-[#E6E6E6]",
      buttonTextColor: "text-black",
      buttonHoverColor: "hover:bg-white",
    },
    lineAlignment: "items-center",
    options: [
      {
        id: "1",
        name: "MONOTON",
        fontFamily: "Monoton",
        isCorrect: false,
      },
      {
        id: "2",
        name: "B621 Mono",
        fontFamily: "B612 Mono",
        isCorrect: false,
      },
      {
        id: "3",
        name: "JetBrains Mono",
        fontFamily: "JetBrains Mono",
        isCorrect: true,
      },
      {
        id: "4",
        name: "Quicksand",
        fontFamily: "Quicksand",
        isCorrect: false,
      },
    ],
    getElements: (font, w, h) => {
      const fontSize = w * 0.09;

      return [
        {
          id: "title",
          text: "THE FUTURE OF",
          x: w * 0.09,
          y: h * 0.23 - w * 0.11 * 1.05,
          fontFamily: font,
          fontSize: fontSize,
          fontWeight: 400,
          letterSpacing: "0em",
          anchor: "start",
          isDynamic: true,
        },
        {
          id: "main",
          text: "TECHNOLOGY",
          x: w * 0.09,
          y: h * 0.23,
          fontFamily: font,
          fontSize: fontSize,
          fontWeight: 400,
          letterSpacing: "0em",
          anchor: "start",
          isDynamic: true,
        },
      ];
    },
  },
  {
    id: "q_coffee",
    title: "Pick the font for this coffee shop branding",
    backgroundImage: coffeeBg,
    canvasWidth: 1000,
    canvasHeight: 1000,
    theme: {
      backgroundColor: "bg-black",
      textColor: "text-white",
      buttonBgColor: "bg-[#EAE5D9]",
      buttonTextColor: "text-black",
      buttonHoverColor: "hover:bg-[#F7F3E8]",
    },
    lineAlignment: "items-start",
    options: [
      {
        id: "1",
        name: "Georgia",
        fontFamily: "Georgia",
        isCorrect: false,
        styleAdjustment: { scale: 0.9 },
      },
      {
        id: "2",
        name: "Optima",
        fontFamily: "Optima",
        isCorrect: true,
      },
      {
        id: "3",
        name: "Crimson Text",
        fontFamily: "Crimson Text",
        isCorrect: false,
      },
      {
        id: "4",
        name: "Cormorant SC",
        fontFamily: "Cormorant SC",
        isCorrect: false,
      },
    ],
    getElements: (font, w, h) => {
      let yOffset = 0;
      let scale = 1;

      if (font.includes("Georgia")) {
        scale = 0.9;
      }
      if (font.includes("Cormorant")) {
        scale = 1.1;
      }

      return [
        {
          id: "coffee-title",
          text: "COFFEE",
          x: w / 2,
          y: h * 0.22 + yOffset,
          fontFamily: font,
          fontSize: w * 0.18 * scale,
          color: "#545F6C",
          anchor: "middle",
          letterSpacing: "0.02em",
          isDynamic: true,
        },
      ];
    },
  },
];

export const MICRO_QUESTIONS: MicroQuestionConfig[] = [
  // --- Case 1: afsd (Kerning) ---
  {
    type: "micro",
    id: "q_33",
    title: "what property was adjusted?",
    beforeText: "afsd",
    afterText: "af sd",
    options: ["weight", "kerning", "tracking", "leading"],
    correctOptions: ["kerning"],
    QuestionComponent: Ba33Svg,
    ResultComponent: R33Svg,
  },
  // --- Case 2: ek4f (Multi-change) ---
  {
    type: "micro",
    id: "q_38",
    title: "identify ALL modifications made",
    beforeText: "ek4f",
    afterText: "ek4f",
    options: ["kerning", "weight", "leading", "tracking", "font"],
    correctOptions: ["kerning", "weight", "font"],
    QuestionComponent: Ba38Svg,
    ResultComponent: R38Svg,
  },
];

export const findQuestionById = (questionId: string) => {
  for (const category of QUIZ_CATEGORIES) {
    const index = category.questions.findIndex((q: any) => q.id === questionId);
    if (index !== -1) {
      return {
        question: category.questions[index],
        category: category,
        nextQuestionId: category.questions[index + 1]?.id || null,
      };
    }
  }
  return null;
};

export const CLASSIFICATION_QUESTIONS: ClassificationQuestionConfig[] = [
  // --- Type A (Variant 1: Big Text) ---
  {
    type: "classification",
    subtype: "classifier",
    id: "q_8",
    title: "Is this font Serif or Sans-serif?", // 普通標題
    mainSubject: "Times New Roman", // *** 有這個欄位 = 顯示大字 ***
    mainSubjectFont: "Times New Roman, serif",
    requiredFonts: ["Times New Roman"],
    options: [
      { id: "opt1", text: "Serif", isCorrect: true },
      { id: "opt2", text: "Sans-serif", isCorrect: false },
    ],
    marquee: [
      {
        text: "Times New Roman",
        className: "text-green-500",
        fontFamily: "Times New Roman",
      },
      {
        text: "Times New Roman",
        className: "text-pink-500 italic",
        fontFamily: "Times New Roman",
      },
      {
        text: "Times New Roman",
        className: "text-white font-light",
        fontFamily: "Times New Roman",
      },
      {
        text: "Times New Roman",
        className: "text-yellow-500 font-bold",
        fontFamily: "Times New Roman",
      },
    ],
  },

  // --- Type A (Variant 2: Question Only) ---
  {
    type: "classification",
    subtype: "classifier",
    id: "q_7",
    // 標題中直接包含特殊樣式的字體
    title: React.createElement(
      "span",
      null,
      "What category is ",
      React.createElement(
        "span",
        {
          className: "font-brush text-2xl",
          style: { fontFamily: "Brush Script MT, cursive" },
        },
        "Brush Script"
      ),
      " ?"
    ),
    // mainSubject: undefined,  <-- 沒有這個欄位 = 純問題版
    requiredFonts: ["Brush Script MT"],
    options: [
      { id: "1", text: "Serif", isCorrect: false },
      { id: "2", text: "Sans-serif", isCorrect: false },
      { id: "3", text: "Script", isCorrect: true },
      { id: "4", text: "Display", isCorrect: false },
      { id: "5", text: "Monospace", isCorrect: false },
    ],
    marquee: [
      {
        text: "Brush Script",
        className: "text-white",
        fontFamily: "Brush Script MT, cursive",
      },
      {
        text: "Brush Script",
        className: "text-pink-500",
        fontFamily: "Brush Script MT, cursive",
      },
      {
        text: "Brush Script",
        className: "text-yellow-500",
        fontFamily: "Brush Script MT, cursive",
      },
      {
        text: "Brush Script",
        className: "text-blue-500",
        fontFamily: "Brush Script MT, cursive",
      },
    ],
  },

  // --- Type B: The Imposter (Reveal Logic) ---
  {
    type: "classification",
    subtype: "imposter",
    id: "q_10",
    title: "Identify the real Futura",
    requiredFonts: ["Futura", "Avenir", "Carrois Gothic"], // 確保載入這些字
    options: [
      // 錯誤選項：一開始顯示 Futura (用 Avenir 字體)，揭曉時顯示 "Avenir"
      {
        id: "opt1",
        text: "Futura",
        revealText: "Avenir",
        isCorrect: false,
        fontFamily: "Avenir, sans-serif",
      },
      // 正確選項
      {
        id: "opt2",
        text: "Futura",
        revealText: "Futura",
        isCorrect: true,
        fontFamily: "Futura, sans-serif",
      },
      // 錯誤選項
      {
        id: "opt3",
        text: "Futura",
        revealText: "Carrois",
        isCorrect: false,
        fontFamily: "'Carrois Gothic', sans-serif",
      },
    ],
    marquee: [
      {
        text: "Futura Future",
        className: "text-blue-400",
        fontFamily: "Futura",
      },
      {
        text: "Futura Future",
        className: "text-green-400 italic",
        fontFamily: "Futura",
      },
    ],
  },
  {
    type: "classification",
    subtype: "grid",
    id: "q_12",
    title: "which of these are monospace fonts?",

    // 這裡列出需要從 Google 下載的字體
    // Courier 和 Monaco 是系統字，不需要列在這裡 (且在 fonts.ts 裡被 skip 了)
    requiredFonts: ["Space Mono", "Inria Serif", "Kadwa", "IBM Plex Mono"],

    options: [
      // Row 1
      {
        id: "opt1",
        text: "courier",
        isCorrect: true,
        fontFamily: "'Courier New', Courier, monospace", // 系統等寬字
      },
      {
        id: "opt2",
        text: "monaco",
        isCorrect: true,
        fontFamily: "Monaco, Consolas, monospace", // macOS 經典等寬字
      },
      {
        id: "opt3",
        text: "space",
        isCorrect: true,
        fontFamily: "'Space Mono', monospace", // Google Font
      },

      // Row 2
      {
        id: "opt4",
        text: "inria",
        isCorrect: false,
        fontFamily: "'Inria Serif', serif", // Google Font (有襯線，非等寬)
      },
      {
        id: "opt5",
        text: "kadwa",
        isCorrect: false,
        fontFamily: "'Kadwa', serif", // Google Font (有襯線，非等寬)
      },
      {
        id: "opt6",
        text: "ibm plex",
        isCorrect: true,
        fontFamily: "'IBM Plex Mono', monospace", // Google Font
      },
    ],
  },
];

export const ANATOMY_QUESTIONS: FundamantalQuestionConfig[] = [
  {
    type: "fundamantal",
    id: "q_4",
    title: "which part is the terminal?",

    layers: [
      // 1. 底圖 (Base)
      { id: "base", Component: Q4Base, isCorrect: false, isBase: true },

      // 2. 錯誤選項: Pink (Upper serif)
      { id: "upper-serif", Component: Q4Pink, isCorrect: false },

      // 3. 錯誤選項: Blue (Bottom serif)
      { id: "bottom-serif", Component: Q4Blue, isCorrect: false },

      // 4. 錯誤選項: Green (Bowl)
      { id: "bowl", Component: Q4Green, isCorrect: false },

      // 5. 正確選項: Yellow (Terminal)
      // 使用者點擊黃色 f 的頂端算對
      { id: "terminal", Component: Q4Yellow, isCorrect: true },
    ],

    // 結果圖 (解答)
    ResultComponent: Q4Result,
  },
  {
    type: "fundamantal",
    id: "q_5",
    title: "identify the x-height in this word",

    // 這裡定義疊加順序 (由下而上)
    layers: [
      // 1. 底圖 (Base): 純展示，不可點
      { id: "base", Component: Q5Base, isCorrect: false, isBase: true },

      // 2. 錯誤選項 (Purple - Cap Height)
      { id: "cap-height", Component: Q5Purple, isCorrect: false },

      // 3. 錯誤選項 (Blue - Baseline)
      { id: "baseline", Component: Q5Blue, isCorrect: false },

      // 4. 正確選項 (Yellow - X-Height Arrow)
      // 使用者點擊黃色箭頭算對
      { id: "x-height-arrow", Component: Q5Yellow, isCorrect: true },

      // 5. 正確選項 (Green - Guidelines)
      // 假設點擊綠色虛線也算對 (視你的設計意圖而定，若綠色只是裝飾可設為 isBase)
      { id: "guidelines", Component: Q5Green, isCorrect: true },
    ],

    // 結果圖
    ResultComponent: Q5Result,
  },
];

export const QUIZ_CATEGORIES: any[] = [
  {
    id: "fundamantal",
    title: "Fundamantal",
    description: "Train your eye for spacing, weight, and font details.",
    coverImage: posterBg,
    questions: ANATOMY_QUESTIONS,
  },
  {
    id: "classification",
    title: "Classification",
    description: "Train your eye for spacing, weight, and font details.",
    coverImage: posterBg,
    questions: CLASSIFICATION_QUESTIONS,
  },
  {
    id: "micro",
    title: "Micro-Typography",
    description: "Train your eye for spacing, weight, and font details.",
    coverImage: posterBg,
    questions: MICRO_QUESTIONS,
  },
  {
    id: "poster",
    title: "Poster Logo",
    description: "Master the typography of posters and logos.",
    coverImage: posterBg,
    questions: QUESTIONS,
  },
];
