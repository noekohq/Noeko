import { useEffect, useMemo, useState } from "react";
import { IShareAccess, IShareDetails } from '../../../../../app/database/models/share';
import { IConnectable } from '../../../../../app/services/Graph';
import useFetch from '@/hooks/useFetch';
import { useForm } from "@mantine/form";
import { validateEmail } from '@/utils/data';
import { useAuth } from '@/contexts/AuthContext';
import { revokeAccess, shareAccessWithEmail, updateAccess } from '@/utils/shares';
import { showNotification } from "@mantine/notifications";
import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Space,
  Stack,
  Text,
  TextInput,
  Combobox,
  useCombobox,
} from "@mantine/core";
import {
  CheckIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  ShareNetworkIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { userFormattedName } from '@/utils/user';
import { PaperContextMenu } from '@core/design/components/Paper/PaperContextMenu';
import { getNodeLink } from '@infrastructure/graph/utils';
import { IFriendUser } from '../../../../../shared/types/user';

const { VITE_DEPLOYED_URL } = import.meta.env;

if (!VITE_DEPLOYED_URL) {
  throw new Error("VITE_DEPLOYED_URL is not defined");
}

const deployedURL = VITE_DEPLOYED_URL;

interface IAccessManagerProps {
  connectable: IConnectable;
}

export default function AccessManager({ connectable }: IAccessManagerProps) {
  const {
    load: loadShared,
    data: shared,
    loading: loadingShared,
  } = useFetch<undefined, IShareDetails[]>({
    url: `/sharing/${connectable.id.toString()}`,
    dependencies: [connectable.id.toString()],
  });

  const { load: loadFriends, data: friends } = useFetch<undefined, IFriendUser[]>({
    url: "/sharing/friends",
  });

  useEffect(() => {
    if (connectable) {
      loadShared();
    }
  }, [connectable.id]);

  const form = useForm(
    useMemo(
      () => ({
        initialValues: {
          email: "",
          accessLevel: "viewonly" as IShareAccess,
        },
        validate: {
          email: (v: string) => {
            if (!validateEmail(v)) {
              return "Email is invalid.";
            }
          },
        },
      }),
      []
    )
  );

  const [shareModal, setShareModal] = useState(false);

  useEffect(() => {
    if (shareModal) {
      loadFriends();
    }
  }, [shareModal, loadFriends]);

  const friendsData = useMemo(
    () =>
      friends?.map((f) => ({
        label: userFormattedName(f),
        value: f.email,
      })) || [],
    [friends]
  );

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const options = friendsData
    .filter(({ label, value }) => {
      const searchTerm = form.values.email.toLowerCase().trim();
      if (searchTerm === "") {
        return true;
      }
      return label.toLowerCase().includes(searchTerm) || value.toLowerCase().includes(searchTerm);
    })
    .map((item) => (
      <Combobox.Option value={item.value} key={item.value}>
        {item.label}
      </Combobox.Option>
    ));

  const { user } = useAuth();

  const handleStopSharing = async (userId: string) => {
    try {
      await revokeAccess(connectable.id.toString(), userId);
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

  const handleUpdateAccess = async (userId: string, accessLevel: IShareAccess) => {
    try {
      await updateAccess(connectable.id.toString(), userId, accessLevel);
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

  const [shareErrors, setShareErrors] = useState<string[]>([]);
  const handleCreateShare = async () => {
    setShareErrors([]);
    try {
      const { hasErrors, errors } = form.validate();
      if (hasErrors) {
        setShareErrors(["Couldn't create a share."]);
        return;
      }
      setLoadingShare(true);
      const success = await shareAccessWithEmail(
        connectable.id.toString(),
        form.values.email,
        form.values.accessLevel
      );
      if (success) {
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
        setShareModal(false);
        form.reset();
      } else {
        throw new Error("Something went wrong sharing");
      }
    } catch (error) {
      console.error("Error creating share: ", error);
      setShareErrors(["Something went wrong creating this share. This account may not exist."]);
    } finally {
      await loadShared();
      setLoadingShare(false);
    }
  };

  const getShareLink = () => {
    const baseRoute = getNodeLink(connectable);
    return `${VITE_DEPLOYED_URL}${baseRoute}`;
  };

  return (
    <div>
      <Stack>
        <Group>
          <Button
            leftSection={<ShareNetworkIcon />}
            onClick={() => {
              setShareErrors([]);
              setShareModal(true);
            }}
            variant="light"
            color="gray"
            size="sm"
            radius="md"
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
                key={share.user.id.toString()}
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
                    <PaperContextMenu.Label>Access Level</PaperContextMenu.Label>
                    <Box>
                      <SegmentedControl
                        fullWidth
                        data={[
                          { label: "Reader", value: "viewonly" },
                          { label: "Editor", value: "editor" },
                        ]}
                        value={share.accessLevel}
                        onChange={(value) =>
                          handleUpdateAccess(share.user.id.toString(), value as IShareAccess)
                        }
                      />
                    </Box>
                    <PaperContextMenu.Item
                      color="red"
                      icon={<XCircleIcon size={14} />}
                      onClick={() => handleStopSharing(share.user.id.toString())}
                    >
                      Remove Access
                    </PaperContextMenu.Item>
                    <CopyButton value={getShareLink()}>
                      {({ copy, copied }) => (
                        <PaperContextMenu.Item
                          icon={copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
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
          setShareErrors([]);
          form.reset();
        }}
        title={<Text component="span">Share</Text>}
      >
        <Stack>
          <Combobox
            store={combobox}
            withinPortal
            onOptionSubmit={(optionValue) => {
              form.setFieldValue("email", optionValue);
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <TextInput
                label="Share with"
                placeholder="Name or email address"
                size="md"
                radius="md"
                required
                value={form.values.email}
                onChange={(event) => {
                  form.setFieldValue("email", event.currentTarget.value);
                  combobox.openDropdown();
                  combobox.updateSelectedOptionIndex();
                }}
                onClick={() => combobox.openDropdown()}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => {
                  combobox.closeDropdown();
                }}
                autoComplete="nope"
                mb="xs"
              />
            </Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Options>
                {options.length > 0 ? options : <Combobox.Empty>Nothing found</Combobox.Empty>}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
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
          {shareErrors.length > 0 && (
            <Stack gap="xs" mb="md">
              {shareErrors.map((error, index) => (
                <Text key={index} c="red" size="sm">
                  {error}
                </Text>
              ))}
            </Stack>
          )}
          <Group justify="right">
            <Button
              variant="default"
              onClick={() => {
                setShareModal(false);
                form.reset();
                setShareErrors([]);
              }}
            >
              Cancel
            </Button>
            <Button
              leftSection={loadingShare ? <Loader color="gray" size="sm" /> : <ShareNetworkIcon />}
              onClick={() => {
                handleCreateShare();
              }}
              disabled={loadingShare}
            >
              Share Access
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
