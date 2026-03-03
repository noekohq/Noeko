import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import styles from "./App.module.scss";
import { Center, Loader, Text, useMantineColorScheme } from "@mantine/core";
import { CloudIcon, WarningIcon } from "@phosphor-icons/react";

import { useAuth } from "@domains/identity/contexts/AuthContext";
// React
import { lazy, useEffect, useRef } from "react";

// Mantine Notifications
import { showNotification } from "@mantine/notifications";

// Application Contexts
import { useLayout } from "@/contexts/LayoutContext";
import { useSettings } from "@/contexts/SettingsContext";

// Application Components
import GlobalTourManager from "@/core/design/components/Onboarding/GlobalTourManager";

// Admin Domain
import Admin from "@domains/admin/pages/Admin";
import Feedback from "./domains/admin/pages/Feedback/Feedback";

// Constellation Domain
import Constellation from "@domains/constellation/pages/Constellation/Constellation";

// Dashboard Domain
import Dashboard from "@domains/dashboard/pages/Dashboard/Dashboard";
import DashboardExperimental from "@domains/dashboard/pages/Dashboard/Experimental";
import MobileDashboard from "@domains/dashboard/pages/Dashboard/Mobile/Mobile";

// Discovery Domain
import All from "@domains/discovery/pages/All/All";
import Spyglass from "@domains/discovery/pages/Spyglass/Spyglass";
import SpyglassRecord from "@domains/discovery/pages/Spyglass/Spyglass/Record";
import SpyglassRecords from "@domains/discovery/pages/Spyglass/Spyglass/Records";

// Identity Domain
import ForgotPassword from "@domains/identity/pages/Auth/ForgotPassword";
import Login from "@domains/identity/pages/Auth/Login";
import Register from "@domains/identity/pages/Auth/Register";
import ResetPassword from "@domains/identity/pages/Auth/ResetPassword";
import Unauthorized from "@domains/identity/pages/Auth/Unauthorized";
import Keymap from "@domains/identity/pages/Settings/Keymap";
import Profile from "@domains/identity/pages/Settings/Profile";
import Settings from "@domains/identity/pages/Settings/Settings";
import Users from "@domains/identity/pages/Users/Users";
import { userIsSuperuser } from "@domains/identity/utils/user";

// Knowledge Domain
import Agenda from "./domains/knowledge/pages/Agenda/Agenda";
import FileList from "./domains/knowledge/pages/File/FileList";
import UserFile from "./domains/knowledge/pages/File/File";
import Idea from "@domains/knowledge/pages/Idea/Idea";
import Ideas from "@domains/knowledge/pages/Idea/Ideas";
import ViewIdea from "@domains/knowledge/pages/Idea/ViewIdea";
import PinsPage from "./domains/knowledge/pages/Pins/Pins";
import Sharing from "./domains/knowledge/pages/Sharing/Sharing";
import Source from "@domains/knowledge/pages/Sources/Source";
import SourceList from "@domains/knowledge/pages/Sources/SourceList";
import Tags from "./domains/knowledge/pages/Tags/Tags";
import ViewTag from "./domains/knowledge/pages/Tags/ViewTag";
import Task from "@domains/knowledge/pages/Tasks/Task";
import Tasks from "@domains/knowledge/pages/Tasks/Tasks";
import { useConnection } from "@domains/knowledge/hooks/useConnection";

// Rabbitholes Domain
import Rabbithole from "@domains/rabbitholes/pages/Rabbitholes/Rabbithole";
import Rabbitholes from "@domains/rabbitholes/pages/Rabbitholes/List";

// System Domain
import Export from "./domains/system/pages/Export/Export";
import Import from "./domains/system/pages/Import/Import";

// Lazy Loaded Components
const Updates = lazy(() => import("@domains/admin/pages/Feedback/Updates"));
const Onboarding = lazy(() => import("@/core/design/components/Onboarding/Index"));

export default function App() {
  const navigate = useNavigate();
  const { loggedIn, loading: loadingAuth, user } = useAuth();
  // const { isOnline, isLoading: loadingConnection } = useConnection();
  const { isMobile } = useLayout();
  const location = useLocation();

  const isSuperuser = userIsSuperuser(user);

  // const previousOnlineState = useRef(isOnline);
  const notificationTimeout = useRef<Timer>(null);

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

  if (user?.settings.isNew) {
    return <Onboarding />;
  }

  return (
    <>
      {/*{!isOnline && (
        <Overlay backgroundOpacity={0.5} blur={4}>
          <Flex justify="center" align="center" direction="column">
            <Content>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "80vh",
                  padding: "20px",
                }}
              >
                <Alert
                  icon={<CloudIcon />}
                  title="Connecting..."
                  color="dark.2"
                  radius="lg"
                  bg="dark.8"
                >
                  <Stack gap="xs">
                    <Text size="sm">
                      Attemping to establish a connection to the server. If this
                      takes a while, consider refreshing the page.
                    </Text>
                    <Text size="sm">
                      We apologize for any inconvenience. For any inquiries or
                      support, please feel free to contact{" "}
                      <a href="mailto:support@noeko.app">support@noeko.app</a>.
                    </Text>
                  </Stack>
                </Alert>
              </div>
            </Content>
          </Flex>
        </Overlay>
      )}*/}
      <Routes>
        <Route path="/unauthorized" element={<Unauthorized />} />
        {!loggedIn && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route
              path="/*"
              element={<Navigate to="/login" state={{ from: location }} replace />}
            />
          </>
        )}

        {loggedIn && (
          <Route
            path="/*"
            element={
              <div className={styles.app}>
                <GlobalTourManager />
                <Routes>
                  <Route path="login" element={<Navigate to="/" replace />} />
                  <Route path="register" element={<Navigate to="/" replace />} />
                  {!isMobile && <Route index element={<Dashboard />} />}
                  {isMobile && <Route index element={<MobileDashboard />} />}
                  <Route path="constellation">
                    <Route index element={<Constellation />} />
                  </Route>
                  <Route path="profile" element={<Navigate to="/settings/profile" />} />
                  <Route path="settings">
                    <Route index element={<Settings />} />
                    <Route path="profile" element={<Profile />} />
                  </Route>
                  <Route path="idea">
                    <Route index element={<Navigate to="/ideas" replace />} />
                    <Route path=":ideaId">
                      <Route index element={<Idea key={location.pathname} />} />
                      <Route path="view" element={<ViewIdea key={location.pathname} />} />
                    </Route>
                  </Route>
                  <Route path="sharing">
                    <Route index element={<Sharing />} />
                  </Route>
                  <Route path="ideas">
                    <Route index element={<Ideas />} />
                  </Route>
                  <Route path="quests">
                    <Route index element={<Tasks />} />
                  </Route>
                  <Route path="agenda">
                    <Route index element={<Agenda />} />
                  </Route>
                  <Route path="all">
                    <Route index element={<All />} />
                  </Route>
                  <Route path="pinned">
                    <Route index element={<PinsPage />} />
                  </Route>
                  <Route path="task">
                    <Route path=":taskId">
                      <Route index element={<Task key={location.pathname} />} />
                    </Route>
                  </Route>
                  <Route path="tags">
                    <Route index element={<Tags />} />
                    <Route path=":tagId" element={<ViewTag />} />
                  </Route>
                  <Route path="file">
                    <Route path=":fileId" element={<UserFile />} />
                  </Route>
                  <Route path="files" element={<FileList />} />
                  <Route path="source">
                    <Route path=":sourceId" element={<Source />} />
                  </Route>
                  <Route path="sources" element={<SourceList />} />
                  <Route path="import">
                    <Route index element={<Import />} />
                  </Route>
                  <Route path="export">
                    <Route index element={<Export />} />
                  </Route>
                  <Route path="keymap">
                    <Route index element={<Keymap />} />
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
