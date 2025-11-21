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
  CopyButton,
  Group,
  Loader,
  Modal,
  Menu,
  SegmentedControl,
  Space,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { userFormattedName } from "../../utils/user";
import { useForm } from "@mantine/form";
import { validateEmail } from "../../utils/data";
import {
  CheckIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  ShareNetworkIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import { showNotification } from "@mantine/notifications";
import {
  revokeAccess,
  updateAccess,
  shareAccessWithEmail,
} from "../../utils/shares";
import { IShareAccess } from "../../../app/database/models/share";
import { PaperContextMenu } from "../../components/Display/Paper/PaperContextMenu";

const { VITE_DEPLOYED_URL } = import.meta.env;

if (!VITE_DEPLOYED_URL) {
  throw new Error("VITE_DEPLOYED_URL is not defined");
}

const deployedURL = VITE_DEPLOYED_URL;

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

  const form = useForm({
    initialValues: {
      email: "",
      accessLevel: "viewonly" as IShareAccess,
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
      await revokeAccess(idea.id.toString(), userId);
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

  const handleUpdateAccess = async (
    userId: string,
    accessLevel: IShareAccess,
  ) => {
    try {
      await updateAccess(idea.id.toString(), userId, accessLevel);
      showNotification({
        title: "Access Updated",
        message: `Successfully updated access level.`,
      });
      await loadShared();
    } catch (error) {
      console.error("Error updating share", error);
      showNotification({
        title: "Error",
        message: "There was an error updating the access level.",
        color: "red",
      });
    }
  };

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
      await shareAccessWithEmail(
        idea.id.toString(),
        form.values.email,
        form.values.accessLevel,
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
      showNotification({
        title: "Error",
        message: "There was an error creating the share.",
        color: "red",
      });
    } finally {
      setLoadingShare(false);
    }
  };

  const getShareLink = (mode: IShareAccess) => {
    if (mode === "viewonly") {
      return `${VITE_DEPLOYED_URL}/ideas/shared/${idea.id.toString()}/viewonly`;
    }
    return `${VITE_DEPLOYED_URL}/idea/${idea.id.toString()}`;
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
        <Text size="sm" c="dark.2">
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
                <PaperContextMenu triggerOn="click">
                  <PaperContextMenu.Target>
                    <ActionIcon variant="subtle" size="lg">
                      <DotsThreeVerticalIcon weight="bold" />
                    </ActionIcon>
                  </PaperContextMenu.Target>
                  <PaperContextMenu.Dropdown>
                    <PaperContextMenu.Label>
                      Access Level
                    </PaperContextMenu.Label>
                    <Box p={4}>
                      <SegmentedControl
                        fullWidth
                        size="sm"
                        data={[
                          { label: "Reader", value: "viewonly" },
                          { label: "Editor", value: "editor" },
                        ]}
                        value={share.accessLevel}
                        onChange={(value) =>
                          handleUpdateAccess(
                            share.user.id.toString(),
                            value as IShareAccess,
                          )
                        }
                      />
                    </Box>
                    <PaperContextMenu.Item
                      color="red"
                      icon={<XCircleIcon size={14} />}
                      onClick={() =>
                        handleStopSharing(share.user.id.toString())
                      }
                    >
                      Remove Access
                    </PaperContextMenu.Item>
                    <CopyButton value={getShareLink(share.accessLevel)}>
                      {({ copy, copied }) => (
                        <PaperContextMenu.Item
                          icon={
                            copied ? (
                              <CheckIcon size={14} />
                            ) : (
                              <CopyIcon size={14} />
                            )
                          }
                          onClick={copy}
                        >
                          {copied ? "Copied" : "Copy Share Link"}
                        </PaperContextMenu.Item>
                      )}
                    </CopyButton>
                  </PaperContextMenu.Dropdown>
                </PaperContextMenu>
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
          <SegmentedControl
            fullWidth
            size="sm"
            data={[
              { label: "Reader", value: "viewonly" },
              { label: "Editor", value: "editor" },
            ]}
            {...form.getInputProps("accessLevel")}
          />
          <Space h="md" />
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
