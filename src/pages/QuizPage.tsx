// src/pages/QuizPage.tsx
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
        navigate("/");
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
        config={question} // 這裡 TypeScript 會自動推斷型別
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
      <button
        onClick={() => navigate("/")}
        className="fixed top-6 right-6 z-50 text-white/50 hover:text-white text-sm uppercase tracking-widest"
      >
        Exit ✕
      </button>
    </div>
  );
}
