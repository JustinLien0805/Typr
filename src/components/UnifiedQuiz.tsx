import BaseQuiz from "./BaseQuiz";
import UniversalCanvas from "./UniversalCanvas";
import type { QuestionConfig } from "../data/questionsData";
import type { CanvasTextElement } from "../types";
import type { AnswerResult } from "../types/storage";

interface UnifiedQuizProps {
  config: QuestionConfig;
  onNext: () => void;
  onAnswer?: (result: AnswerResult) => void;
}

export default function UnifiedQuiz({ config, onNext, onAnswer }: UnifiedQuizProps) {
  const renderCanvas = (currentFont: string) => {
    // Find the matching option to get its styleAdjustment (e.g. scale)
    const currentOption = config.options.find((o) => o.fontFamily === currentFont);
    const scale = currentOption?.styleAdjustment?.scale ?? 1;

    const elements: CanvasTextElement[] = config.elements.map((el) => ({
      ...el,
      x: el.x * config.canvasWidth,
      y: el.y * config.canvasHeight,
      fontSize: el.fontSize * config.canvasWidth * scale,
      fontFamily: currentFont,
    }));

    return (
      <UniversalCanvas
        width={config.canvasWidth}
        height={config.canvasHeight}
        backgroundImage={config.backgroundImage}
        backgroundColor={config.backgroundColor}
        elements={elements}
      />
    );
  };

  return (
    <BaseQuiz
      questionId={config.id}
      questionTitle={config.title}
      options={config.options}
      posterWidth={config.posterWidthClass}
      theme={config.theme}
      lineAlignment={config.lineAlignment}
      renderCanvas={renderCanvas}
      onNextStep={onNext}
      onAnswer={onAnswer}
    />
  );
}
