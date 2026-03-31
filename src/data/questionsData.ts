import React from "react";
import type { FontOption } from "../components/BaseQuiz";
import type {
  PosterTextElement,
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
  () => import("../assets/fundamantal/q_5/base.svg?react")
);
const Q5Result = React.lazy(
  () => import("../assets/fundamantal/q_5/ans.svg?react")
);
const Q4Base = React.lazy(
  () => import("../assets/fundamantal/q_4/base.svg?react")
);
const Q4Result = React.lazy(
  () => import("../assets/fundamantal/q_4/ans.svg?react")
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
  /** Declarative text elements using ratio values (0–1) relative to canvas size */
  elements: PosterTextElement[];
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
      "Which font matches the technical, clean aesthetic of the poster’s body text?",
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
    elements: [
      { id: "title", text: "THE FUTURE OF", x: 0.09, y: 0.135, fontSize: 0.09, fontWeight: 400, letterSpacing: "0em", anchor: "start" },
      { id: "main",  text: "TECHNOLOGY",    x: 0.09, y: 0.23,  fontSize: 0.09, fontWeight: 400, letterSpacing: "0em", anchor: "start" },
    ],
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
    elements: [
      { id: "coffee-title", text: "COFFEE", x: 0.5, y: 0.22, fontSize: 0.18, color: "#545F6C", anchor: "middle", letterSpacing: "0.02em" },
    ],
  },
];

export const MICRO_QUESTIONS: MicroQuestionConfig[] = [
  // --- Case 1: afsd (Kerning) ---
  {
    type: "micro",
    id: "q_33",
    title: "What property was adjusted?",
    options: ["weight", "kerning", "tracking", "leading"],
    correctOptions: ["kerning"],
    QuestionComponent: Ba33Svg,
    ResultComponent: R33Svg,
  },
  // --- Case 2: ek4f (Multi-change) ---
  {
    type: "micro",
    id: "q_38",
    title: "Identify ALL modifications made",
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
    mainSubject: "Times New Roman",
    mainSubjectFont: "Times New Roman, serif",
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
    title: "What category is {subject} ?",
    subject: "Brush Script",
    subjectFont: "Brush Script MT, cursive",
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
    title: "Which of these are monospace fonts?",
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
    id: "q_5",
    title: "Identify the x-height in this word",
    QuestionComponent: Q5Base,
    ResultComponent: Q5Result,
    options: [
      { id: "purple", color: "#C084FC", isCorrect: false }, // cap-height
      { id: "blue",   color: "#60A5FA", isCorrect: false }, // baseline
      { id: "yellow", color: "#FACC15", isCorrect: true  }, // x-height
      { id: "green",  color: "#4ADE80", isCorrect: false }, // guidelines
    ],
  },
  {
    type: "fundamantal",
    id: "q_4",
    title: "Which part is the terminal?",
    QuestionComponent: Q4Base,
    ResultComponent: Q4Result,
    options: [
      { id: "pink",   color: "#F472B6", isCorrect: false }, // upper serif
      { id: "blue",   color: "#60A5FA", isCorrect: false }, // bottom serif
      { id: "green",  color: "#4ADE80", isCorrect: false }, // bowl
      { id: "yellow", color: "#FACC15", isCorrect: true  }, // terminal
    ],
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

/** Returns all questions across all categories with categoryId attached */
export function getAllQuestions(): { question: any; categoryId: string }[] {
  const all: { question: any; categoryId: string }[] = [];
  for (const cat of QUIZ_CATEGORIES) {
    for (const q of cat.questions) {
      all.push({ question: q, categoryId: cat.id });
    }
  }
  return all;
}

/** Look up full question configs by an array of IDs */
export function getQuestionsByIds(ids: string[]): { question: any; categoryId: string }[] {
  const idSet = new Set(ids);
  return getAllQuestions().filter((entry) => idSet.has(entry.question.id));
}
