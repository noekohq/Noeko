import {
  ActionIcon,
  Avatar,
  Group,
  Menu,
  Space,
  Text,
  Tooltip,
} from "@mantine/core";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./RightSidebar.module.scss";
import { userInitials, userIsSuperuser } from "../../utils/user";
import {
  ArrowLineLeft,
  ArrowLineRight,
  Gear,
  Graph,
  Shield,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import { Link, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import useShortcuts, { IShortcut } from "../../hooks/useShortcuts";

type RightSidebarProps = {
  children?: React.ReactNode;
  toggleOpenShortcuts?: IShortcut["keys"][];
  openOnShortcut?: IShortcut["keys"][];
};

export default function RightSidebar({
  children,
  toggleOpenShortcuts,
  openOnShortcut,
}: RightSidebarProps) {
  const [opened, setOpened] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const storedValue = localStorage.getItem("rightSidebarOpened");
      return storedValue !== "false";
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("rightSidebarOpened", opened.toString());
    }
  }, [opened]);

  const handleToggle = () => {
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

  return (
    <div
      className={`${styles.rightSidebar} ${opened ? styles.opened : styles.closed}`}
    >
      <Group>
        <ActionIcon onClick={handleToggle} variant="subtle">
          {opened ? (
            <ArrowLineRight weight="bold" />
          ) : (
            <ArrowLineLeft weight="bold" />
          )}
        </ActionIcon>
      </Group>
      <div className={styles.content}>
        <Group gap="md" justify="end">
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
        </Group>
        <Space h="md" />
        <Group>{children}</Group>
      </div>
    </div>
  );
}
