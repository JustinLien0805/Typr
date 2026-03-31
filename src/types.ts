export type TextAnchor = "start" | "middle" | "end";

/**
 * Declarative text element for poster questions.
 * All positional values are ratios (0–1) relative to canvasWidth/Height.
 * x, y are fractions of width/height; fontSize is a fraction of width.
 */
export interface PosterTextElement {
  id: string;
  text: string;
  x: number;         // ratio of canvasWidth
  y: number;         // ratio of canvasHeight
  fontSize: number;  // ratio of canvasWidth
  fontWeight?: number | string;
  color?: string;
  anchor?: TextAnchor;
  letterSpacing?: string;
}

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
  options: string[];
  correctOptions: string[];
  QuestionComponent: SvgComponentType;
  ResultComponent: SvgComponentType;
}

import React from "react";

export interface MarqueeItem {
  text: string;
  className: string;
  fontFamily?: string;
}

export interface ClassificationOption {
  id: string;
  text: string;
  revealText?: string;
  isCorrect: boolean;
  fontFamily?: string;
}

export interface ClassificationQuestionConfig {
  type: "classification";
  subtype: "classifier" | "imposter" | "grid";
  id: string;
  title: string;
  /** Inline-styled word inside the title — rendered with subjectFont */
  subject?: string;
  subjectFont?: string;
  mainSubject?: string;
  mainSubjectFont?: string;
  options: ClassificationOption[];
  marquee?: MarqueeItem[];
}

export interface FundamantalOption {
  id: string;
  color: string;
  isCorrect: boolean;
}

export interface FundamantalQuestionConfig {
  type: "fundamantal";
  id: string;
  title: string;
  QuestionComponent: SvgComponentType;
  ResultComponent: SvgComponentType;
  options: FundamantalOption[];
}

// Poster questions use QuestionConfig from questionsData.ts (no type field).
// AnyQuestionConfig covers all typed question configs used in Quizz mode.
export type AnyQuestionConfig =
  | MicroQuestionConfig
  | ClassificationQuestionConfig
  | FundamantalQuestionConfig
  | { type: "poster"; id: string; [key: string]: any };
