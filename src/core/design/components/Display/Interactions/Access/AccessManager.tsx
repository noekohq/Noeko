import { useMemo, useState } from "react";
import { IConnectable } from "../../../../../../../shared/types/constellation";
import { IShareAccess, IShareDetails } from "../../../../../../../shared/types/share";
import { IFriendUser } from "../../../../../../../shared/types/user";
import { useForm } from "@mantine/form";
import { validateEmail } from "@core/utils/data";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { revokeAccess, shareAccessWithEmail, updateAccess } from "@domains/knowledge/utils/shares";
import { showNotification } from "@mantine/notifications";
import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Combobox,
  useCombobox,
  Collapse,
} from "@mantine/core";
import {
  CheckIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  PlusIcon,
  ShareNetworkIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { userFormattedName } from "@domains/identity/utils/user";
import { PaperContextMenu } from "@core/design/components/Paper/PaperContextMenu";
import { getNodeLink } from "@infrastructure/graph/utils";
import { useApiQuery } from "@/core/hooks/useApiQuery";

const { VITE_DEPLOYED_URL } = import.meta.env;

if (!VITE_DEPLOYED_URL) {
  throw new Error("VITE_DEPLOYED_URL is not defined");
}

interface IAccessManagerProps {
  connectable: IConnectable;
}

export default function AccessManager({ connectable }: IAccessManagerProps) {
  const { data: shared, refetch: loadShared } = useApiQuery<IShareDetails[]>({
    url: `/sharing/${connectable.id.toString()}`,
    queryKey: ["sharing", connectable.id.toString()],
  });

  const { data: friends } = useApiQuery<IFriendUser[]>({
    url: "/sharing/friends",
    queryKey: ["friends"],
  });

  console.log("Got friends: ", friends);

  const form = useForm({
    initialValues: {
      email: "",
      accessLevel: "viewonly" as IShareAccess,
    },
    validate: {
      email: (v: string) => (!validateEmail(v) ? "Email is invalid." : null),
    },
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);
  const [shareErrors, setShareErrors] = useState<string[]>([]);
  const { user } = useAuth();

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
      if (searchTerm === "") return true;
      return label.toLowerCase().includes(searchTerm) || value.toLowerCase().includes(searchTerm);
    })
    .map((item) => (
      <Combobox.Option value={item.value} key={item.value}>
        {item.label}
      </Combobox.Option>
    ));

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
    }
  };

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

  const handleCreateShare = async () => {
    setShareErrors([]);
    try {
      const { hasErrors } = form.validate();
      if (hasErrors) return;

      setLoadingShare(true);
      const success = await shareAccessWithEmail(
        connectable.id.toString(),
        form.values.email,
        form.values.accessLevel
      );
      if (success) {
        showNotification({
          title: "Shared!",
          message: `Successfully shared access with ${form.values.email}`,
        });
        form.reset();
      } else {
        throw new Error("Something went wrong sharing");
      }
    } catch (error) {
      console.error("Error creating share: ", error);
      setShareErrors(["Something went wrong. This account may not exist."]);
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
    <Stack gap="md">
      {/* Global Share Link Section */}
      <Box>
        <Group justify="space-between" align="center" mb="xs">
          <Text size="xs" fw={700} c="dark.3" tt="uppercase">
            Share Link
          </Text>
          <CopyButton value={getShareLink()}>
            {({ copy, copied }) => (
              <Button
                variant="subtle"
                color={copied ? "teal" : "gray"}
                size="compact-xs"
                leftSection={copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                onClick={copy}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Box>

      {!showAddForm ? (
        <Button
          leftSection={<ShareNetworkIcon />}
          onClick={() => setShowAddForm(true)}
          variant="light"
          color="gray"
          size="sm"
          radius="md"
          fullWidth
        >
          Share
        </Button>
      ) : (
        <Stack gap="xs">
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
                name="share-user-search"
                id="share-user-search"
                placeholder="Name or email address"
                size="sm"
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
                onBlur={() => combobox.closeDropdown()}
                autoComplete="off"
                // Password Manager Ignore Attributes:
                data-1p-ignore="true" // 1Password
                data-lpignore="true" // LastPass
                data-bwignore="true" // Bitwarden
                data-form-type="other" // Dashlane
                error={shareErrors[0] || form.errors.email}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateShare();
                  }
                }}
              />
            </Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Options>
                {options.length > 0 ? options : <Combobox.Empty>No friends found</Combobox.Empty>}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>

          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                form.reset();
                setShareErrors([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateShare}
              loading={loadingShare}
              disabled={!form.values.email.trim()}
              size="sm"
              radius="md"
              leftSection={<PlusIcon weight="bold" />}
            >
              Add
            </Button>
          </Group>
        </Stack>
      )}

      <Stack gap="sm">
        <Text size="xs" fw={700} c="dark.3" tt="uppercase">
          People with access
        </Text>

        <Group justify="space-between" align="center">
          <Stack gap={0}>
            <Text size="sm" fw={500}>
              {userFormattedName(user)}
            </Text>
            <Text size="xs" c="dimmed">
              Owner
            </Text>
          </Stack>
        </Group>

        {shared?.map((share) => (
          <Group key={share.user.id.toString()} justify="space-between" align="center">
            <Stack gap={0}>
              <Text size="sm" fw={500}>
                {userFormattedName(share.user)}
              </Text>
              <Text size="xs" c="dimmed" tt="capitalize">
                {share.accessLevel === "viewonly" ? "Reader" : "Editor"}
              </Text>
            </Stack>

            <PaperContextMenu triggerOn="click">
              <PaperContextMenu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <DotsThreeVerticalIcon size={20} weight="bold" />
                </ActionIcon>
              </PaperContextMenu.Target>

              <PaperContextMenu.Dropdown>
                <PaperContextMenu.Label>Access Level</PaperContextMenu.Label>
                <Box px="xs" pb="xs">
                  <SegmentedControl
                    fullWidth
                    size="xs"
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
                  icon={<XCircleIcon />}
                  onClick={() => handleStopSharing(share.user.id.toString())}
                >
                  Remove Access
                </PaperContextMenu.Item>
              </PaperContextMenu.Dropdown>
            </PaperContextMenu>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}
