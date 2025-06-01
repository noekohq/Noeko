import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import styles from "./App.module.scss";
import { Loader, useMantineColorScheme } from "@mantine/core";

import { useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard/Dashboard";
import Graph from "./pages/Graph/Graph";
import GraphHeavy from "./pages/Graph/GraphHeavy";
import Idea from "./pages/Idea/Idea";
import UserFile from "./pages/File/File";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Profile from "./pages/Settings/Profile";
import Settings from "./pages/Settings/Settings";
import { userIsSuperuser } from "./utils/user";
import Users from "./pages/Users/Users";
import Feedback from "./pages/Feedback/Feedback";
import Import from "./pages/Import/Import";
import Admin from "./pages/Admin/Admin";
import Spyglass from "./pages/Search/Spyglass";
import Ideas from "./pages/Idea/Ideas";
import Tags from "./pages/Tags/Tags";
import { useEffect } from "react";
import { useSettings } from "./contexts/SettingsContext";
import Updates from "./pages/Feedback/Updates";
import ViewTag from "./pages/Tags/ViewTag";

export default function App() {
  const navigate = useNavigate();
  const { loggedIn, loading: loadingAuth, user } = useAuth();
  const location = useLocation();

  const isSuperuser = userIsSuperuser(user);

  const {
    ui: {
      theme: {
        scheme: { get: scheme },
      },
    },
  } = useSettings();

  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    setColorScheme(scheme);
  }, [scheme]);

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
                  <Route path="graph">
                    <Route index element={<Graph />} />
                    <Route path="heavy" element={<GraphHeavy />} />
                  </Route>
                  <Route
                    path="profile"
                    element={<Navigate to="/settings/profile" />}
                  />
                  <Route path="settings">
                    <Route index element={<Settings />} />
                    <Route path="profile" element={<Profile />} />
                  </Route>
                  <Route path="idea">
                    <Route index element={<Navigate to="/ideas" replace />} />
                    <Route
                      path=":ideaId"
                      element={<Idea key={location.pathname} />}
                    />
                  </Route>
                  <Route path="ideas">
                    <Route index element={<Ideas />} />
                  </Route>
                  <Route path="tags">
                    <Route index element={<Tags />} />
                    <Route path=":tagId" element={<ViewTag />} />
                  </Route>
                  <Route path="file">
                    <Route index element={<Navigate to="/" replace />} />
                    <Route path=":fileId" element={<UserFile />} />
                  </Route>
                  <Route path="import">
                    <Route index element={<Import />} />
                  </Route>
                  <Route path="spyglass">
                    <Route index element={<Spyglass />} />
                  </Route>
                  {isSuperuser && (
                    <Route path="admin">
                      <Route index element={<Admin />} />
                      <Route path="users" element={<Users />} />
                      <Route path="feedback" element={<Feedback />} />
                    </Route>
                  )}
                  <Route path="updates" element={<Updates />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            }
          />
        )}
      </Routes>
    </>
  );
}
