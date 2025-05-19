import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import styles from "./App.module.scss";
import { Loader } from "@mantine/core";

import { useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard/Dashboard";
import Graph from "./pages/Graph/Graph";
import Idea from "./pages/Idea/Idea";
import UserFile from "./pages/File/File";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Profile from "./pages/Settings/Profile";
import Settings from "./pages/Settings/Settings";
import useShortcuts from "./hooks/useShortcuts";
import { userIsSuperuser } from "./utils/user";
import Users from "./pages/Users/Users";
import Search from "./pages/Search/Search";
import Feedback from "./pages/Feedback/Feedback";
import Import from "./pages/Import/Import";
import Admin from "./pages/Admin/Admin";
import TopLevelUI from "./components/UI/TopLevel";

export default function App() {
  const navigate = useNavigate();
  const { loggedIn, loading: loadingAuth, user } = useAuth();
  const location = useLocation();

  const isSuperuser = userIsSuperuser(user);

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
    <>
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
                <Routes>
                  <Route path="login" element={<Navigate to="/" replace />} />
                  <Route
                    path="register"
                    element={<Navigate to="/" replace />}
                  />
                  <Route index element={<Dashboard />} />
                  <Route path="graph" element={<Graph />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="idea">
                    <Route index element={<Navigate to="/" replace />} />
                    <Route path=":ideaId" element={<Idea />} />
                  </Route>
                  <Route path="file">
                    <Route index element={<Navigate to="/" replace />} />
                    <Route path=":fileId" element={<UserFile />} />
                  </Route>
                  <Route path="import">
                    <Route index element={<Import />} />
                  </Route>
                  <Route path="search">
                    <Route index element={<Search />} />
                  </Route>
                  {isSuperuser && (
                    <Route path="admin">
                      <Route index element={<Admin />} />
                      <Route path="users" element={<Users />} />
                      <Route path="feedback" element={<Feedback />} />
                    </Route>
                  )}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            }
          />
        )}
      </Routes>
      <TopLevelUI />
    </>
  );
}
