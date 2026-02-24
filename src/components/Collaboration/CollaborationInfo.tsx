import { ICollaborationStatus, ICollaborator } from "@/hooks/useCollaboration";
import { Group, Loader, Text, Avatar, Tooltip, MantineSize } from "@mantine/core";
import { CloudCheckIcon, CloudSlashIcon } from "@phosphor-icons/react";

interface ICollaborationInfoProps {
  status: ICollaborationStatus;
  members: ICollaborator[];
  size?: MantineSize;
}

export function CollaborationInfo({ status, members, size = "xs" }: ICollaborationInfoProps) {
  let statusContent = null;
  switch (status) {
    case "connecting":
      statusContent = (
        <Group gap="4px" wrap="nowrap" align="center">
          <Loader size="12px" color="blue" />
          <Text size={size} c="blue">
            Connecting...
          </Text>
        </Group>
      );
      break;
    case "synced":
      statusContent = (
        <Group gap="4px" wrap="nowrap" align="center">
          <CloudCheckIcon size={14} color="var(--mantine-color-gray-6)" weight="bold" />
          <Text size={size} c="gray.6">
            All changes saved
          </Text>
        </Group>
      );
      break;
    case "disconnected":
      statusContent = (
        <Group gap="4px" wrap="nowrap" align="center">
          <CloudSlashIcon size={14} color="var(--mantine-color-red-7)" weight="bold" />
          <Text size={size} c="red.7" fw="bold">
            You're offline
          </Text>
        </Group>
      );
      break;
    default:
      statusContent = (
        <Group gap="4px" wrap="nowrap" align="center">
          <Loader size={12} color="orange.6" />
          <Text size={size} c="orange.6">
            Attempting to connect...
          </Text>
        </Group>
      );
  }

  return (
    <Group gap="xs" align="center">
      {statusContent}
      {members.length > 0 && (
        <Avatar.Group>
          {members.map((collaborator) => (
            <Tooltip
              transitionProps={{ transition: "fade-up", duration: 300 }}
              label={collaborator.name}
              key={collaborator.name}
            >
              <Avatar color={collaborator.color} size="sm" radius="xl" variant="filled">
                {collaborator.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </Avatar>
            </Tooltip>
          ))}
        </Avatar.Group>
      )}
    </Group>
  );
}
