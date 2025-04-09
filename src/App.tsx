import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import styles from "./App.module.scss";
import { Loader } from "@mantine/core";

import Home from "./pages/Home/Home";
import Idea from "./pages/Idea/Idea";
import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Sidebar from "./components/Navigation/Sidebar";
import Profile from "./pages/Settings/Profile";
import Settings from "./pages/Settings/Settings";

export default function App() {
  const navigate = useNavigate();
  const { loggedIn, loading: loadingAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "h"
      ) {
        navigate("/");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  if (loadingAuth) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {!loggedIn && (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <Navigate to="/login" state={{ from: location }} replace />
            }
          />
        </>
      )}

      {loggedIn && (
        <Route
          path="/*"
          element={
            <div className={styles.app}>
              <div className={styles.ui}>
                <Sidebar />
              </div>
              <div className={styles.content}>
                <Routes>
                  <Route path="login" element={<Navigate to="/" replace />} />
                  <Route
                    path="register"
                    element={<Navigate to="/" replace />}
                  />
                  <Route index element={<Home />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="idea/:ideaId" element={<Idea />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </div>
          }
        />
      )}
    </Routes>
  );
}
