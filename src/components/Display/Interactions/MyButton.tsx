import {
  ArrowLineLeftIcon,
  CheckIcon,
  FileIcon,
  GearIcon,
  GraphIcon,
  HouseSimpleIcon,
  LightbulbIcon,
  RabbitIcon,
  ScrollIcon,
  ShieldStarIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../contexts/AuthContext";
import { useInteraction } from "../../../contexts/InteractionContext";
import { userIsSuperuser } from "../../../utils/user";
import styles from "./MyButton.module.scss";
import { useDisclosure } from "@mantine/hooks";

export default function MyButton() {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuth();
  const isSuperuser = user ? (userIsSuperuser(user) ?? false) : false;
  const navigate = useNavigate();

  const {
    actions: { newIdea, newRabbithole },
  } = useInteraction();

  const handleClose = () => {
    setTimeout(() => {
      toggle();
    }, 100);
  };

  const menuNavItems = [
    { label: "Home", icon: HouseSimpleIcon, path: "/" },
    { label: "All Ideas", icon: LightbulbIcon, path: "/ideas" },
    { label: "Shared Ideas", icon: LightbulbIcon, path: "/ideas/shared" },
    { label: "Tasks", icon: CheckIcon, path: "/tasks" },
    { label: "Sources", icon: FileIcon, path: "/sources" },
    { label: "Constellation", icon: GraphIcon, path: "/constellation" },
    { label: "Tags", icon: TagIcon, path: "/tags" },
    { label: "Files", icon: FileIcon, path: "/files" },
    ...(isSuperuser
      ? [{ label: "Admin Panel", icon: ShieldStarIcon, path: "/admin" }]
      : []),
  ];

  const userMenuItems = [
    { label: "Profile", icon: UserIcon, path: "/settings/profile" },
    { label: "Settings", icon: GearIcon, path: "/settings" },
  ];

  const actionMenuItems = [
    {
      label: "New Idea",
      icon: LightbulbIcon,
      action: () => {
        newIdea();
        handleClose();
      },
    },
    {
      label: "New Rabbithole",
      icon: RabbitIcon,
      action: () => {
        newRabbithole();
        handleClose();
      },
    },
  ];

  return (
    <>
      {opened && (
        <div className={styles.overlay} onClick={toggle}>
          <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
            <div className={`${styles.section} ${styles.grid}`}>
              <div className={styles.sectionHeader}>Views</div>
              {menuNavItems.map((item) => (
                <button
                  key={item.path}
                  className={styles.option}
                  onClick={() => {
                    navigate(item.path);
                    handleClose();
                  }}
                >
                  <item.icon weight="bold" size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>User</div>
              {userMenuItems.map((item) => (
                <button
                  key={item.path}
                  className={styles.option}
                  onClick={() => {
                    navigate(item.path);
                    handleClose();
                  }}
                >
                  <item.icon weight="bold" size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>Actions</div>
              {actionMenuItems.map((item) => (
                <button
                  key={item.label}
                  className={styles.option}
                  onClick={item.action}
                >
                  <item.icon weight="bold" size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className={styles.section}>
              <button
                className={`${styles.option} ${styles.logout}`}
                onClick={() => logout && logout()}
              >
                <ArrowLineLeftIcon weight="bold" size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        className={`${styles.myButton} ${opened ? styles.opened : ""}`}
        onClick={toggle}
      >
        <div className={styles.iconContainer}>
          <UserIcon
            weight="regular"
            size={20}
            className={`${styles.icon} ${styles.userIcon}`}
          />
          <XIcon
            weight="regular"
            size={20}
            className={`${styles.icon} ${styles.xIcon}`}
          />
        </div>
      </button>
    </>
  );
}
