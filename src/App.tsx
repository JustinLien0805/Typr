import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import QuizPage from "./pages/QuizPage";
import SelectTopic from "./pages/Select";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/quiz/:id" element={<QuizPage />} />

        <Route path="*" element={<Home />} />
        <Route path="/select" element={<SelectTopic />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
