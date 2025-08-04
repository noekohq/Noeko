import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import styles from "./App.module.scss";
import { Alert, Loader, useMantineColorScheme } from "@mantine/core";
import { WarningIcon } from "@phosphor-icons/react";

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
import Spyglass from "./pages/Spyglass/Spyglass";
import Ideas from "./pages/Idea/Ideas";
import Tags from "./pages/Tags/Tags";
import { lazy, useEffect } from "react";
import { useSettings } from "./contexts/SettingsContext";
import ViewTag from "./pages/Tags/ViewTag";
import ViewIdea from "./pages/Idea/ViewIdea";
import PublicIdea from "./pages/Idea/PublicIdea";
import ResetPassword from "./pages/Auth/ResetPassword";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import SpyglassRecords from "./pages/Spyglass/Spyglass/Records";
import SpyglassRecord from "./pages/Spyglass/Spyglass/Record";
import SearchPage from "./pages/Search/Search";
import SharedIdeas from "./pages/Idea/Shared/Shared";
import ViewonlyIdea from "./pages/Idea/Shared/Viewonly";
import Rabbithole from "./pages/Rabbitholes/Rabbithole";
import Rabbitholes from "./pages/Rabbitholes/List";
import { useConnection } from "./hooks/useConnection";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import PageWrapper from "./components/Layout/PageWrapper";
import Content from "./components/UI/Layout/Content";
import Task from "./pages/Tasks/Task";
const Updates = lazy(() => import("./pages/Feedback/Updates"));

export default function App() {
  const navigate = useNavigate();
  const { loggedIn, loading: loadingAuth, user } = useAuth();
  const { isOnline, isLoading: loadingConnection } = useConnection();
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

  if (loadingAuth || loadingConnection) {
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

  if (!isOnline) {
    return (
      <PageWrapper>
        <Content>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "50vh",
              padding: "20px",
            }}
          >
            <Alert
              icon={<WarningIcon />}
              title="Connection Interrupted"
              color="gray"
            >
              Could not connect to the server. It may be down for maintenance or
              there could be a connectivity problem. For any inquiries or
              support, please contact{" "}
              <a href="mailto:aidan@qwest.so">aidan@qwest.so</a>. Qwest will try
              to automatically re-establish a connection.
            </Alert>
          </div>
        </Content>
      </PageWrapper>
    );
  }

  return (
    <>
      <Routes>
        {!loggedIn && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
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
                    <Route path=":ideaId">
                      <Route index element={<Idea key={location.pathname} />} />
                      <Route
                        path="view"
                        element={<ViewIdea key={location.pathname} />}
                      />
                    </Route>
                  </Route>
                  <Route path="ideas">
                    <Route index element={<Ideas />} />
                    <Route path="shared">
                      <Route index element={<SharedIdeas />} />
                      <Route path=":ideaId">
                        <Route path="viewonly" element={<ViewonlyIdea />} />
                      </Route>
                    </Route>
                  </Route>
                  <Route path="tasks">
                    {/*<Route index element={<Tasks />} />*/}
                    <Route path=":taskId">
                      <Route index element={<Task key={location.pathname} />} />
                    </Route>
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
                  <Route path="search">
                    <Route index element={<SearchPage />} />
                  </Route>
                  <Route path="rabbitholes">
                    <Route index element={<Rabbitholes />} />
                    <Route path=":rabbitholeId" element={<Rabbithole />} />
                  </Route>
                  <Route path="spyglass">
                    <Route index element={<Spyglass />} />
                    <Route path="history" element={<SpyglassRecords />} />
                    <Route path="records">
                      <Route index element={<SpyglassRecords />} />
                      <Route path=":spyglassId" element={<SpyglassRecord />} />
                    </Route>
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
