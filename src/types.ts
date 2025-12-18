export type TextAnchor = "start" | "middle" | "end";

export interface CanvasTextElement {
  id: string;
  text: string | React.ReactNode;
  x: number | string;
  y: number | string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: number | string;
  color?: string;
  anchor?: TextAnchor;
  letterSpacing?: string;
  lineHeight?: number;
  opacity?: number;
  isDynamic?: boolean;
  initialOpacity?: number;
  targetOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
}

export interface CanvasImageConfig {
  src: string;
  width: number;
  height: number;
  opacity?: number;
}

type SvgComponentType =
  | React.FC<React.SVGProps<SVGSVGElement>>
  | React.LazyExoticComponent<React.FC<React.SVGProps<SVGSVGElement>>>;

export interface MicroQuestionConfig {
  type: "micro";
  id: string;
  title: string;
  beforeText: string;
  afterText: string;

  options: string[];

  correctOptions: string[];
  QuestionComponent: SvgComponentType;
  ResultComponent: SvgComponentType;
}

// src/types.ts
import React from "react";

export interface MarqueeItem {
  text: string;
  className: string; // Tailwind classes for styling (color, italic, bold)
  fontFamily?: string;
}

export interface ClassificationOption {
  id: string;
  text: string;
  revealText?: string; // Type B 專用：揭曉時顯示的真名
  isCorrect: boolean;
  fontFamily?: string; // 選項專屬字體
}

export interface ClassificationQuestionConfig {
  type: "classification";
  subtype: "classifier" | "imposter" | "grid";
  id: string;

  // 標題 (支援 HTML/JSX 以便對 "Brush Script" 做特殊造型)
  title: React.ReactNode;

  // Type A 專用變體設定
  // 如果有 mainSubject，就是 "大字版"；如果沒有，就是 "純問題版"
  mainSubject?: string;
  mainSubjectFont?: string; // 大字的字體

  options: ClassificationOption[];
  marquee?: MarqueeItem[];

  // 這一題需要載入哪些字體 (傳給 Hook 用)
  requiredFonts?: string[];
}

export interface AnatomyLayer {
  id: string;
  Component: SvgComponentType;
  isCorrect: boolean;
  isBase?: boolean; // 標記是否為底圖 (不參與點擊)
}

export interface AnatomyQuestionConfig {
  type: "anatomy";
  id: string;
  title: string;

  // 圖層列表：包含底圖和所有可點擊的線條
  layers: AnatomyLayer[];

  // 結果圖 (解答)
  ResultComponent: SvgComponentType;
}
