import { Link } from "react-router-dom";
import { QUIZ_CATEGORIES } from "../data/questionsData";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold mb-12 tracking-tighter">
          Select a Topic
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {QUIZ_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              // *** 關鍵：點擊後去這個類別的「第一題」 ***
              to={`/quiz/${category.questions[0].id}`}
              className="group block relative overflow-hidden rounded-2xl border-gray-800 transition-colors duration-300"
            >
              <div className="aspect-4/3 w-full bg-gray-900 relative">
                <img
                  src={category.coverImage}
                  alt={category.title}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                />

                <div className="absolute bottom-0 left-0 p-6 bg-linear-to-t from-black/90 to-transparent w-full">
                  <h2 className="text-2xl font-bold">{category.title}</h2>
                  <p className="text-sm text-gray-300 mt-1">
                    {category.description}
                  </p>
                  {/* 顯示裡面有幾題 */}
                  <span className="inline-block mt-3 text-xs bg-white/20 px-2 py-1 rounded">
                    {category.questions.length} Questions
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
