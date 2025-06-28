import { Avatar, Menu, Text, Tooltip } from "@mantine/core";
import { useAuth } from "../../../contexts/AuthContext";
import { userInitials, userIsSuperuser } from "../../../utils/user";
import { useNavigate } from "react-router";
import {
  ArrowLineLeftIcon,
  GearIcon,
  GraphIcon,
  HouseSimpleIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  ScrollIcon,
  ShieldStarIcon,
  TagIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useLayout } from "../../../contexts/LayoutContext";

export default function ProfileButton() {
  const { user, logout } = useAuth();
  const initials = user ? userInitials(user) : "";
  const isSuperuser = user ? (userIsSuperuser(user) ?? false) : false;
  const navigate = useNavigate();

  const menuNavItems = [
    { label: "Home", icon: HouseSimpleIcon, path: "/" },
    { label: "Graph", icon: GraphIcon, path: "/graph" },
    { label: "All Ideas", icon: LightbulbIcon, path: "/ideas" },
    { label: "Spyglass", icon: MagnifyingGlassIcon, path: "/spyglass" },
    { label: "Tags", icon: TagIcon, path: "/tags" },
    { label: "Updates", icon: ScrollIcon, path: "/updates" },
    ...(isSuperuser
      ? [{ label: "Admin Panel", icon: ShieldStarIcon, path: "/admin" }]
      : []),
  ];

  const userMenuItems = [
    { label: "Profile", icon: UserIcon, path: "/settings/profile" },
    { label: "Settings", icon: GearIcon, path: "/settings" },
  ];

  const { isMobile } = useLayout();

  return (
    <Menu width={220} shadow="md" position="bottom-end">
      <Menu.Target>
        <Tooltip label={user?.email || "User Menu"} position="left" withArrow>
          <Avatar
            color={isSuperuser ? "red" : "blue"}
            variant="filled"
            radius="xl"
            style={{ cursor: "pointer" }}
            onDoubleClick={() => navigate("/")}
            size={isMobile ? "sm" : "sm"}
          >
            {initials}
          </Avatar>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Views</Menu.Label>
        {menuNavItems.map((item) => (
          <Menu.Item
            key={item.path}
            leftSection={<item.icon weight="bold" size={16} />}
            onClick={() => navigate(item.path)}
          >
            <Text size="sm">{item.label}</Text>
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Label>User</Menu.Label>
        {userMenuItems.map((item) => (
          <Menu.Item
            key={item.path}
            leftSection={<item.icon weight="bold" size={16} />}
            onClick={() => navigate(item.path)}
          >
            <Text size="sm">{item.label}</Text>
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          color="red"
          onClick={() => logout && logout()}
          leftSection={<ArrowLineLeftIcon weight="bold" />}
        >
          <Text size="sm">Logout</Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
