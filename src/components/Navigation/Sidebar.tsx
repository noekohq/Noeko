import {
  ActionIcon,
  Avatar,
  Flex,
  Grid,
  Indicator,
  Menu,
  Text,
  Tooltip,
  Tree,
} from "@mantine/core";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Sidebar.module.scss";
import { userInitials, userIsSuperuser } from "../../utils/user";
import {
  ArrowLineLeft,
  Gear,
  Graph,
  Shield,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";

export default function Sidebar() {
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const initials = userInitials(user);
  const isSuperuser = userIsSuperuser(user);

  return (
    <div className={styles.sidebar}>
      <Flex direction="column" gap="lg">
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
        {isSuperuser && (
          <Tooltip label="Manage Users">
            <ActionIcon size="lg" variant="default">
              <UsersThree />
            </ActionIcon>
          </Tooltip>
        )}
      </Flex>
    </div>
  );
}
