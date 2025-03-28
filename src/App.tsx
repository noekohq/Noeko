import { Route, Routes, useNavigate } from "react-router";
import GlobalToast from "./components/Notifications/GlobalToast";

import Home from "./pages/Home/Home";
import Idea from "./pages/Idea/Idea";
import { useEffect } from "react";

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    document.addEventListener("keydown", (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "h"
      ) {
        navigate("/");
      }
    });

    return () => {
      document.removeEventListener("keydown", (event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.shiftKey &&
          event.key === "h"
        ) {
          navigate("/");
        }
      });
    };
  }, []);

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
