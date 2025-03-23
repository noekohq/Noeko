import { Route, Routes } from "react-router";
import GlobalToast from "./components/Notifications/GlobalToast";

import Home from "./pages/Home/Home";
import Idea from "./pages/Idea/Idea";

export default function App() {
  return (
    <div>
      <GlobalToast />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/idea">
          <Route path=":ideaId" element={<Idea />} />
        </Route>
      </Routes>
    </div>
  );
}
