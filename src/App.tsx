import { Route, Routes } from "react-router";
import Home from "./pages/Home/Home";
import Idea from "./pages/Idea/Idea";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/idea">
        <Route path=":id" element={<Idea />} />
      </Route>
    </Routes>
  );
}
