import { Navigate, Route, Routes, useNavigate } from "react-router";

import Home from "./pages/Home/Home";
import Idea from "./pages/Idea/Idea";
import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

export default function App() {
  const navigate = useNavigate();
  const { user, loggedIn } = useAuth();

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

  if (!loggedIn) {
    return (
      <div>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    );
  }

  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        {loggedIn && (
          <Route path="/idea">
            <Route path=":ideaId" element={<Idea />} />
          </Route>
        )}
      </Routes>
    </div>
  );
}
