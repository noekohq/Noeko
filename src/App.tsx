import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router"; // Consistent imports
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

// Protected component can be kept if you prefer wrapping each route,
// but it's not strictly needed with the structure below.
// Remove it if you adopt the structure below fully.
/*
function Protected({ children }: { children: React.ReactNode }) {
  const { loggedIn, loading } = useAuth();
  const location = useLocation();
  if (loading) { return null; } // Should rely on global loader mostly
  if (!loggedIn) { return <Navigate to="/login" state={{ from: location }} replace />; }
  return <>{children}</>;
}
*/

export default function App() {
  const navigate = useNavigate();
  const { loggedIn, loading: loadingAuth } = useAuth();
  const location = useLocation(); // Needed for redirect state

  // Keyboard shortcut useEffect (keep as is)
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

  // --- Global Loading State ---
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

  // --- Render Routes Based on Final Auth State ---
  return (
    <Routes>
      {/* === Public Routes (User is NOT Logged In) === */}
      {!loggedIn && (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Any other path redirects to login */}
          <Route
            path="/*" // Catch-all for logged-out users
            element={
              <Navigate to="/login" state={{ from: location }} replace />
            }
          />
        </>
      )}

      {/* === Protected Routes (User IS Logged In) === */}
      {loggedIn && (
        <Route
          path="/*" // Use a layout route to wrap all logged-in pages
          element={
            // This is the main layout for authenticated users
            <div className={styles.app}>
              <div className={styles.ui}>
                <Sidebar />
              </div>
              <div className={styles.content}>
                {/* Nested Routes rendered within the layout */}
                <Routes>
                  {/* Redirect away from auth pages if logged in */}
                  <Route path="login" element={<Navigate to="/" replace />} />
                  <Route
                    path="register"
                    element={<Navigate to="/" replace />}
                  />
                  {/* Your application routes */}
                  <Route index element={<Home />} /> {/* Matches "/" */}
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="idea/:ideaId" element={<Idea />} />
                  {/* Catch-all for unknown paths when logged in */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                  {/* Or <Route path="*" element={<NotFound />} /> */}
                </Routes>
              </div>
            </div>
          }
        />
      )}
    </Routes>
  );
}
