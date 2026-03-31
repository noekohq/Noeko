import { Navigate, Route, Routes, useLocation } from "react-router";
import styles from "./App.module.scss";
import { Center, Loader, useMantineColorScheme } from "@mantine/core";

import { useAuth } from "@domains/identity/contexts/AuthContext";
// React
import { lazy, useEffect, Suspense } from "react";

// Application Contexts
import { useLayout } from "@/contexts/LayoutContext";
import { useSettings } from "@/contexts/SettingsContext";

// Application Components
import GlobalTourManager from "@/core/design/components/Onboarding/GlobalTourManager";

// --- Static Imports (Critical Entry Paths) ---
// Identity Domain
import Login from "@domains/identity/pages/Auth/Login";
import Register from "@domains/identity/pages/Auth/Register";
import Unauthorized from "@domains/identity/pages/Auth/Unauthorized";
import { userIsSuperuser } from "@domains/identity/utils/user";

// Dashboard Domain
import Dashboard from "@domains/dashboard/pages/Dashboard/Dashboard";
import MobileDashboard from "@domains/dashboard/pages/Dashboard/Mobile/Mobile";

// --- Lazy Loaded Components (Grouped by Domain) ---

// Admin Domain
const Admin = lazy(() => import("@domains/admin/pages/Admin"));
const Feedback = lazy(() => import("./domains/admin/pages/Feedback/Feedback"));
const Updates = lazy(() => import("@domains/admin/pages/Feedback/Updates"));

// Constellation Domain
const Constellation = lazy(
  () => import("@domains/constellation/pages/Constellation/Constellation")
);

// Discovery Domain
const All = lazy(() => import("@domains/discovery/pages/All/All"));
const Spyglass = lazy(() => import("@domains/discovery/pages/Spyglass/Spyglass"));
const SpyglassRecord = lazy(() => import("@domains/discovery/pages/Spyglass/Spyglass/Record"));
const SpyglassRecords = lazy(() => import("@domains/discovery/pages/Spyglass/Spyglass/Records"));

// Identity Domain
const ForgotPassword = lazy(() => import("@domains/identity/pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@domains/identity/pages/Auth/ResetPassword"));
const Keymap = lazy(() => import("@domains/identity/pages/Settings/Keymap"));
const Profile = lazy(() => import("@domains/identity/pages/Settings/Profile"));
const Settings = lazy(() => import("@domains/identity/pages/Settings/Settings"));
const Users = lazy(() => import("@domains/identity/pages/Users/Users"));

// Knowledge Domain
const Agenda = lazy(() => import("./domains/knowledge/pages/Agenda/Agenda"));
const FileList = lazy(() => import("./domains/knowledge/pages/File/FileList"));
const UserFile = lazy(() => import("./domains/knowledge/pages/File/File"));
const Idea = lazy(() => import("@domains/knowledge/pages/Idea/Idea"));
const Ideas = lazy(() => import("@domains/knowledge/pages/Idea/Ideas"));
const ViewIdea = lazy(() => import("@domains/knowledge/pages/Idea/ViewIdea"));
const PinsPage = lazy(() => import("./domains/knowledge/pages/Pins/Pins"));
const Sharing = lazy(() => import("./domains/knowledge/pages/Sharing/Sharing"));
const Source = lazy(() => import("@domains/knowledge/pages/Sources/Source"));
const SourceList = lazy(() => import("@domains/knowledge/pages/Sources/SourceList"));
const Tags = lazy(() => import("./domains/knowledge/pages/Tags/Tags"));
const ViewTag = lazy(() => import("./domains/knowledge/pages/Tags/ViewTag"));
const Task = lazy(() => import("@domains/knowledge/pages/Tasks/Task"));
const Tasks = lazy(() => import("@domains/knowledge/pages/Tasks/Tasks"));

// Rabbitholes Domain
const Rabbithole = lazy(() => import("@domains/rabbitholes/pages/Rabbitholes/Rabbithole"));
const Rabbitholes = lazy(() => import("@domains/rabbitholes/pages/Rabbitholes/List"));

// System Domain
const Export = lazy(() => import("./domains/system/pages/Export/Export"));
const Import = lazy(() => import("./domains/system/pages/Import/Import"));

// Onboarding
const Onboarding = lazy(() => import("@/core/design/components/Onboarding/Index"));

const PageLoader = () => (
  <Center style={{ height: "100%", width: "100%", flex: 1 }}>
    <Loader size="lg" />
  </Center>
);

const FullPageLoader = () => (
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

export default function App() {
  const { loggedIn, loading: loadingAuth, user } = useAuth();
  const { isMobile } = useLayout();
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
  }, [scheme, setColorScheme]);

  if (loadingAuth) {
    return <FullPageLoader />;
  }

  if (user?.settings.isNew) {
    return (
      <Suspense fallback={<FullPageLoader />}>
        <Onboarding />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<FullPageLoader />}>
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
                <Suspense fallback={<PageLoader />}>
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
                </Suspense>
              </div>
            }
          />
        )}
      </Routes>
    </Suspense>
  );
}
