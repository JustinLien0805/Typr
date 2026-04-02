import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPanel from "./components/auth/AuthPanel";
import { AuthProvider } from "./context/AuthContext";
import { StorageProvider } from "./context/StorageContext";
import Home from "./pages/Home";
import QuizPage from "./pages/QuizPage";
import SelectTopic from "./pages/Select";
import QuizzSessionPage from "./pages/QuizzSessionPage";
import HistoryPage from "./pages/HistoryPage";
import Multiplayer from "./pages/Multiplayer";

function App() {
  return (
    <AuthProvider>
      <StorageProvider>
        <BrowserRouter>
          <AuthPanel />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quiz/:id" element={<QuizPage />} />
            <Route path="/select" element={<SelectTopic />} />
            <Route path="/quizz" element={<QuizzSessionPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/multiplayer" element={<Multiplayer />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </StorageProvider>
    </AuthProvider>
  );
}

export default App;
