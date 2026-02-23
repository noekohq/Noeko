import { Badge, Group, Stack, Text } from "@mantine/core";
import { ISafeUser, IUser } from "../../../../shared/types/user";
import styles from "./UserCard.module.scss";
import { formatDate } from "../../../../app/utils/formatting";
import { formatDateTime } from '@/utils/formatting';

interface IUserCardProps {
  user: ISafeUser | IUser;
  onClick: (user: ISafeUser | IUser) => void;
  children?: React.ReactNode;
}

export default function UserCard({ user, onClick, children }: IUserCardProps) {
  return (
    <button
      className={styles.userCard}
      onClick={() => {
        onClick(user);
      }}
    >
      <Stack gap="xs">
        <Text size="sm" fw="bold">
          {user.firstName} {user.lastName}
        </Text>
        <Text size="sm" c="dark.3">
          joined {formatDate(user.createdAt)}
        </Text>
        <Group gap="xs">
          {user.disabled && (
            <Badge size="xs" color="red" variant="light">
              DISABLED
            </Badge>
          )}
          {!user.disabled && (
            <Badge size="xs" color="blue" variant="light">
              ACTIVE
            </Badge>
          )}
          {user.roles.map((role) => {
            return (
              <Badge size="xs" color="gray" variant="outline">
                {role.toString()}
              </Badge>
            );
          })}
        </Group>
        {children && <div className={styles.content}>{children}</div>}
      </Stack>
    </button>
  );
}
