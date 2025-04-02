import { Avatar, Grid, Menu } from "@mantine/core";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Sidebar.module.scss";
import { userInitials } from "../../utils/user";
import { ArrowLineLeft } from "@phosphor-icons/react";

export default function Sidebar() {
  const { user } = useAuth();

  const initials = userInitials(user);

  return (
    <div className={styles.sidebar}>
      <Grid>
        <Grid.Col span={12}>
          <Menu>
            <Menu.Target>
              <Avatar color="blue" style={{ cursor: "pointer" }}>
                {initials}
              </Avatar>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<ArrowLineLeft weight="bold" />}
                color="red"
              >
                Logout
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Grid.Col>
      </Grid>
    </div>
  );
}
