import { motion } from "motion/react";

interface QuizTimerProps {
  secondsLeft: number;
  totalSeconds: number;
}

export default function QuizTimer({ secondsLeft, totalSeconds }: QuizTimerProps) {
  const fraction = secondsLeft / totalSeconds;
  const isUrgent = secondsLeft <= 3;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-1">
        <motion.span
          className={`text-sm font-mono font-bold tabular-nums ${
            isUrgent ? "text-red-400" : "text-gray-400"
          }`}
          animate={{ scale: isUrgent ? [1, 1.15, 1] : 1 }}
          transition={{ duration: 0.3 }}
        >
          {secondsLeft}s
        </motion.span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isUrgent ? "bg-red-500" : "bg-white"}`}
          animate={{ width: `${fraction * 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
