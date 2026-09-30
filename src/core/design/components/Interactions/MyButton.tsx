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
  UserCircleIcon,
  UserIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { useInteraction } from "@/contexts/InteractionContext";
import { userIsSuperuser } from "@domains/identity/utils/user";
import styles from "./MyButton.module.scss";
import { useDisclosure } from "@mantine/hooks";
import { createPortal } from "react-dom";

export default function MyButton() {
  const [opened, { close, toggle }] = useDisclosure();
  const { user, logout } = useAuth();
  const isSuperuser = user ? (userIsSuperuser(user) ?? false) : false;
  const navigate = useNavigate();

  const {
    actions: { newIdea, newRabbithole },
  } = useInteraction();

  const handleClose = () => {
    setTimeout(() => {
      close();
    }, 100);
  };

  const menuNavItems = [
    { label: "Home", icon: HouseSimpleIcon, path: "/" },
    { label: "Sharing", icon: LightbulbIcon, path: "/sharing" },
    { label: "Quests", icon: CheckIcon, path: "/quests" },
    { label: "Sources", icon: FileIcon, path: "/sources" },
    { label: "Constellation", icon: GraphIcon, path: "/constellation" },
    { label: "Tags", icon: TagIcon, path: "/tags" },
    { label: "Files", icon: FileIcon, path: "/files" },
    ...(isSuperuser ? [{ label: "Admin Panel", icon: ShieldStarIcon, path: "/admin" }] : []),
  ];

  const userMenuItems = [
    { label: "Profile", icon: UserIcon, path: "/settings/profile" },
    { label: "Settings", icon: GearIcon, path: "/settings" },
  ];

  const actionMenuItems = [];

  return (
    <>
      {opened &&
        createPortal(
          <>
            <div className={styles.overlay} onClick={close}>
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
            <button
              type="button"
              aria-label="Close profile menu"
              className={`${styles.myButton} ${styles.opened} ${styles.portaledClose}`}
              onClick={close}
            >
              <div className={styles.iconContainer}>
                <UserIcon weight="bold" size={20} className={`${styles.icon} ${styles.userIcon}`} />
                <XIcon weight="regular" size={20} className={`${styles.icon} ${styles.xIcon}`} />
              </div>
            </button>
          </>,
          document.body
        )}
      <button
        type="button"
        aria-label="Open profile menu"
        aria-hidden={opened}
        tabIndex={opened ? -1 : undefined}
        className={`${styles.myButton} ${opened ? styles.opened : ""}`}
        onClick={toggle}
      >
        <div className={styles.iconContainer}>
          <UserIcon weight="bold" size={20} className={`${styles.icon} ${styles.userIcon}`} />
          <XIcon weight="regular" size={20} className={`${styles.icon} ${styles.xIcon}`} />
        </div>
      </button>
    </>
  );
}
