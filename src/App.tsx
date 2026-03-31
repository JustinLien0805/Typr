import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StorageProvider } from "./context/StorageContext";
import Home from "./pages/Home";
import QuizPage from "./pages/QuizPage";
import SelectTopic from "./pages/Select";
import QuizzSessionPage from "./pages/QuizzSessionPage";
import HistoryPage from "./pages/HistoryPage";

function App() {
  return (
    <StorageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/select" element={<SelectTopic />} />
          <Route path="/quizz" element={<QuizzSessionPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </StorageProvider>
  );
}

export default App;
