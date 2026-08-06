import { Avatar, Button, Menu, Text } from "@mantine/core";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { userInitials, userIsSuperuser } from "@domains/identity/utils/user";
import { useNavigate } from "react-router";
import {
  ArrowLineLeftIcon,
  BuildingsIcon,
  CheckIcon,
  FileIcon,
  GearIcon,
  GraphIcon,
  HouseSimpleIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  RabbitIcon,
  ScrollIcon,
  ShapesIcon,
  ShieldStarIcon,
  TagIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { useLayout } from "@/contexts/LayoutContext";
import { useInteraction } from "@/contexts/InteractionContext";
import styles from "./ProfileButton.module.scss";
import { useTourStep } from "@/contexts/TourGuideContext";

export default function ProfileButton() {
  const { user, logout } = useAuth();
  const initials = user ? userInitials(user) : "";
  const isSuperuser = user ? (userIsSuperuser(user) ?? false) : false;
  const navigate = useNavigate();

  const {
    actions: { newIdea, newRabbithole },
  } = useInteraction();

  const menuNavItems = [
    { label: "Home", icon: HouseSimpleIcon, path: "/" },
    { label: "Everything", icon: ShapesIcon, path: "/all" },
    { label: "Sharing", icon: LightbulbIcon, path: "/sharing" },
    { label: "Organizations", icon: BuildingsIcon, path: "/organizations" },
    { label: "Quests", icon: CheckIcon, path: "/quests" },
    { label: "Sources", icon: FileIcon, path: "/sources" },
    { label: "Rabbitholes", icon: RabbitIcon, path: "/rabbitholes" },
    { label: "Spyglass", icon: MagnifyingGlassIcon, path: "/spyglass" },
    { label: "Constellation", icon: GraphIcon, path: "/constellation" },
    { label: "Tags", icon: TagIcon, path: "/tags" },
    { label: "Files", icon: FileIcon, path: "/files" },
    ...(isSuperuser ? [{ label: "Admin Panel", icon: ShieldStarIcon, path: "/admin" }] : []),
  ];

  const userMenuItems = [
    { label: "Profile", icon: UserIcon, path: "/settings/profile" },
    { label: "Settings", icon: GearIcon, path: "/settings" },
  ];

  const { isMobile } = useLayout();

  const profileRef = useTourStep({
    id: "feature:button_profile",
    title: "Profile",
    content:
      "Hit your profile button to access different views, perform actions, and access settings.",
    view: "all",
    order: 5,
  });

  return (
    <Menu
      width={220}
      shadow="md"
      position="bottom-end"
      radius="lg"
      withArrow
      arrowOffset={14}
      zIndex={700}
    >
      <Menu.Target>
        <div className={styles.buttonWrapper} ref={profileRef}>
          <Avatar
            color={isSuperuser ? "red.8" : "blue.8"}
            variant="filled"
            radius="xl"
            style={{ cursor: "pointer" }}
            onDoubleClick={() => navigate("/")}
            size={isMobile ? "md" : "sm"}
          >
            {initials}
          </Avatar>
        </div>
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
        <Menu.Label>Actions</Menu.Label>
        <Menu.Item
          leftSection={<LightbulbIcon />}
          onClick={() => {
            newIdea();
          }}
        >
          New Idea
        </Menu.Item>
        <Menu.Item
          leftSection={<RabbitIcon />}
          onClick={() => {
            newRabbithole();
          }}
        >
          New Rabbithole
        </Menu.Item>
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
