import { useEffect, useState } from "react";
import {
  IIdeaShareDetails,
  ISafeIdea,
} from "../../../app/database/models/ideas";
import useFetch from "../../hooks/useFetch";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Popover,
  Space,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { userFormattedName } from "../../utils/user";
import { useForm } from "@mantine/form";
import { validateEmail } from "../../utils/data";
import {
  DotsThreeVerticalIcon,
  ShareNetworkIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import { createIdeaShareFromEmail, removeIdeaShare } from "../../utils/ideas";
import { showNotification } from "@mantine/notifications";

interface IAccessProps {
  loadingIdea: boolean;
  idea: ISafeIdea;
  reloadIdea: () => void;
}

export default function Access({
  loadingIdea,
  idea,
  reloadIdea,
}: IAccessProps) {
  const {
    load: loadShared,
    data: shared,
    loading: loadingShared,
  } = useFetch<undefined, IIdeaShareDetails[]>({
    url: `/ideas/${idea.id.toString()}/shares`,
    dependencies: [idea.id.toString()],
  });

  useEffect(() => {
    if (idea) {
      loadShared();
    }
  }, [idea]);

  console.log("Shared: ", shared);

  const form = useForm({
    initialValues: {
      email: "",
    },
    validate: {
      email: (v) => {
        if (!validateEmail(v)) {
          return "Email is invalid.";
        }
      },
    },
  });

  const [shareModal, setShareModal] = useState(false);

  const { user } = useAuth();

  const handleStopSharing = async (userId: string) => {
    try {
      await removeIdeaShare(idea.id.toString(), userId);
      showNotification({
        title: "Stopped Sharing",
        message: `Successfully stopped sharing.`,
      });
      await loadShared();
    } catch (error) {
      console.error("Error stopping a share", error);
      return undefined;
    }
  };

  const [loadingShare, setLoadingShare] = useState(false);

  const handleCreateShare = async () => {
    try {
      const { hasErrors, errors } = form.validate();
      if (hasErrors) {
        showNotification({
          title: "Hmm, that doesn't look right",
          message: Object.values(errors)[0],
          color: "red",
        });
        return;
      }
      setLoadingShare(true);
      await createIdeaShareFromEmail(
        idea.id.toString(),
        form.getTransformedValues().email,
      );
      showNotification({
        title: (
          <Text>
            <Group>
              <ShareNetworkIcon />
              Shared!
            </Group>
          </Text>
        ),
        message: `Successfully shared idea!`,
      });
      await loadShared();
      setShareModal(false);
      form.reset();
    } catch (error) {
      console.error("Error creating share: ", error);
    } finally {
      setLoadingShare(false);
    }
  };

  return (
    <div>
      <Stack>
        <Group>
          <Button
            leftSection={<ShareNetworkIcon />}
            onClick={() => {
              setShareModal(true);
            }}
            variant="light"
            color="gray"
            size="xs"
            fullWidth
          >
            Share
          </Button>
        </Group>
        <Text size="xs" c="dark.2">
          Shared with:
        </Text>
        <Group gap={"xs"}>
          <Stack align="baseline" gap="0">
            <Text size="md">{userFormattedName(user)}</Text>
            <Text size="xs" c="dark.5" fw="bold">
              OWNER
            </Text>
          </Stack>
        </Group>
        {!!shared &&
          shared.map((share) => {
            return (
              <Group
                gap={"xs"}
                key={share.user + share.accessLevel}
                align="flex-start"
                justify="space-between"
              >
                <Stack align="baseline" gap="0">
                  <Text size="md">{userFormattedName(share.user)}</Text>
                  <Text size="xs" c="dark.5" fw="bold" tt={"uppercase"}>
                    {share.accessLevel}
                  </Text>
                </Stack>
                <Popover position="left-start">
                  <Popover.Target>
                    <ActionIcon variant="subtle" size="sm">
                      <DotsThreeVerticalIcon />
                    </ActionIcon>
                  </Popover.Target>
                  <Popover.Dropdown p="0">
                    <Button
                      leftSection={<XCircleIcon />}
                      onClick={() => {
                        handleStopSharing(share.user.id.toString());
                      }}
                      size="xs"
                      color="red"
                    >
                      Stop Sharing
                    </Button>
                  </Popover.Dropdown>
                </Popover>
              </Group>
            );
          })}
      </Stack>
      <Modal
        opened={shareModal}
        onClose={() => {
          setShareModal(false);
        }}
        title={<Text component="span">Share Idea</Text>}
      >
        <Stack>
          <TextInput
            label="Email"
            placeholder="Enter the recipient's email..."
            required
            {...form.getInputProps("email")}
            mb="xs"
          />
          <Group justify="right">
            <Button
              variant="default"
              onClick={() => {
                setShareModal(false);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button
              leftSection={
                loadingShare ? (
                  <Loader color="gray" size="sm" />
                ) : (
                  <ShareNetworkIcon />
                )
              }
              onClick={() => {
                handleCreateShare();
              }}
              disabled={loadingShare}
            >
              Share!
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
