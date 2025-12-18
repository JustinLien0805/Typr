import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UnifiedQuiz from "../components/UnifiedQuiz";
import QuizMicro from "../components/QuizMicro";
import QuizClassification from "../components/QuizClassification";
import QuizAnatomy from "../components/QuizAnatomy";
import { findQuestionById } from "../data/questionsData";

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const data = useMemo(() => {
    if (id) return findQuestionById(id);
    return null;
  }, [id]);

  if (!data) {
    return <div className="text-white">Question not found</div>;
  }

  const { question, nextQuestionId } = data;

  const handleComplete = () => {
    setTimeout(() => {
      if (nextQuestionId) {
        navigate(`/quiz/${nextQuestionId}`);
      } else {
        navigate("/select");
      }
    }, 1500);
  };

  if (question.type === "micro") {
    return (
      <QuizMicro key={question.id} config={question} onNext={handleComplete} />
    );
  }
  if (question.type === "classification") {
    return (
      <QuizClassification
        key={question.id}
        config={question}
        onNext={handleComplete}
      />
    );
  }
  if (question.type === "anatomy") {
    return (
      <QuizAnatomy
        key={question.id}
        config={question}
        onNext={handleComplete}
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-black">
      <UnifiedQuiz
        key={question.id}
        config={question}
        onNext={handleComplete}
      />
    </div>
  );
}
