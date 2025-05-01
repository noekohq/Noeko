import {
  ActionIcon,
  Avatar,
  Divider,
  Flex,
  Group,
  Menu,
  Space,
  Text,
  Tooltip,
} from "@mantine/core";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Sidebars.module.scss";
import { userInitials, userIsSuperuser } from "../../utils/user";
import {
  ArrowLineDown,
  ArrowLineLeft,
  ArrowLineRight,
  ArrowLineUp,
  Gear,
  Graph,
  Shield,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import { Link, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import useShortcuts, { IShortcut } from "../../hooks/useShortcuts";
import { useMediaQuery } from "@mantine/hooks";
import { useLayout } from "../../contexts/LayoutContext";

type RightSidebarProps = {
  children?: React.ReactNode;
  toggleOpenShortcuts?: IShortcut["keys"][];
  openOnShortcut?: IShortcut["keys"][];
  stayCollapsed?: boolean;
};

export default function RightSidebar({
  children,
  toggleOpenShortcuts,
  openOnShortcut,
  stayCollapsed,
}: RightSidebarProps) {
  const openable = children !== undefined || !stayCollapsed;

  const [opened, setOpened] = useState(() => {
    if (!openable) return false;
    if (typeof window !== "undefined" && window.localStorage) {
      const storedValue = localStorage.getItem("rightSidebarOpened");
      return storedValue !== "false";
    }
    return true;
  });

  const {
    rightSidebar: { setOpened: setRightSidebarOpened },
  } = useLayout();

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("rightSidebarOpened", opened.toString());
    }
    setRightSidebarOpened(opened);
  }, [opened]);

  const handleToggle = () => {
    if (!openable) return;
    setOpened((currentOpened) => !currentOpened);
  };

  useShortcuts({
    shortcuts: [
      {
        keys: { ctrl: true, key: "l" },
        run: () => handleToggle(),
      },
      ...(toggleOpenShortcuts
        ? toggleOpenShortcuts.map((s) => ({
            keys: s,
            run: () => handleToggle(),
          }))
        : []),
      ...(openOnShortcut
        ? openOnShortcut.map((s) => ({
            keys: s,
            run: () => setOpened(true),
          }))
        : []),
    ],
  });

  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const initials = userInitials(user);
  const isSuperuser = userIsSuperuser(user) ?? false;

  const { pathname } = useLocation();

  const isActiveRoute = (path: string) => {
    return pathname === path;
  };

  const isMobile = useMediaQuery("(max-width: 768px)");

  // if mobile, use up arrow, if desktop, use left arrow
  const ToggleIconClosed = isMobile ? ArrowLineUp : ArrowLineLeft;
  const ToggleIconOpened = isMobile ? ArrowLineDown : ArrowLineRight;

  return (
    <div
      className={`${styles.rightSidebar} ${opened ? styles.opened : styles.closed}`}
    >
      <Flex
        justify={
          isMobile
            ? opened
              ? "space-between"
              : "space-between"
            : "space-between"
        }
        align="center"
        direction={
          isMobile
            ? opened
              ? "row-reverse"
              : "row-reverse"
            : opened
              ? "row"
              : "column"
        }
        gap="md"
      >
        {openable && (
          <Tooltip label="Toggle Sidebar (ctrl + l)">
            <ActionIcon
              onClick={handleToggle}
              variant="subtle"
              style={{ justifySelf: "flex-start" }}
            >
              {opened ? (
                <ToggleIconOpened weight="bold" />
              ) : (
                <ToggleIconClosed weight="bold" />
              )}
            </ActionIcon>
          </Tooltip>
        )}
        <Flex
          gap="md"
          direction={
            isMobile ? (opened ? "row" : "row") : opened ? "row" : "column"
          }
        >
          <Menu width={200}>
            <Menu.Target>
              <Avatar
                color={isSuperuser ? "yellow" : "blue"}
                style={{ cursor: "pointer" }}
                onDoubleClick={() => {
                  navigate("/");
                }}
              >
                {initials}
              </Avatar>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Views</Menu.Label>
              <Menu.Item
                leftSection={<Graph weight="bold" />}
                onClick={() => {
                  navigate("/");
                }}
              >
                <Text>Graph</Text>
              </Menu.Item>
              <Menu.Divider />
              <Menu.Label>User</Menu.Label>
              <Menu.Item
                leftSection={<User weight="bold" />}
                onClick={() => {
                  navigate("/profile");
                }}
              >
                <Text>Profile</Text>
              </Menu.Item>
              <Menu.Item
                leftSection={<Gear weight="bold" />}
                onClick={() => {
                  navigate("/settings");
                }}
              >
                <Text>Settings</Text>
              </Menu.Item>
              <Menu.Divider />
              <Menu.Label>Actions</Menu.Label>
              <Menu.Item
                leftSection={<ArrowLineLeft weight="bold" />}
                color="red"
                onClick={() => {
                  logout();
                }}
              >
                <Text>Logout</Text>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          {isSuperuser && !isActiveRoute("/admin/users") && (
            <Tooltip label="Manage Users">
              <Link to="/admin/users">
                <ActionIcon size="lg" variant="default">
                  <UsersThree />
                </ActionIcon>
              </Link>
            </Tooltip>
          )}
        </Flex>
      </Flex>
      {opened && children && <Divider my="md" />}
      <div className={styles.content}>
        <Group>{children}</Group>
      </div>
    </div>
  );
}
