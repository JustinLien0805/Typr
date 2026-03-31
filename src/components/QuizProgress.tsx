interface QuizProgressProps {
  current: number; // 0-indexed
  total: number;
}

export default function QuizProgress({ current, total }: QuizProgressProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-mono text-gray-400">
        <span className="text-white font-bold">{current + 1}</span>
        <span className="mx-0.5">/</span>
        {total}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              i < current
                ? "bg-white"
                : i === current
                  ? "bg-white scale-125"
                  : "bg-gray-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
