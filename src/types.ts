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

  title: React.ReactNode;

  mainSubject?: string;
  mainSubjectFont?: string; // 大字的字體

  options: ClassificationOption[];
  marquee?: MarqueeItem[];

  requiredFonts?: string[];
}

export interface AnatomyLayer {
  id: string;
  Component: SvgComponentType;
  isCorrect: boolean;
  isBase?: boolean;
}

export interface AnatomyQuestionConfig {
  type: "anatomy";
  id: string;
  title: string;

  layers: AnatomyLayer[];

  ResultComponent: SvgComponentType;
}
