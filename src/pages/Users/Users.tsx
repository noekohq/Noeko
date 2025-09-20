import {
  Title,
  Loader,
  Grid,
  Group,
  TextInput,
  Text,
  Button,
  Alert,
  CopyButton,
  SimpleGrid,
  Drawer,
  Stack,
  Box,
  ActionIcon,
  Modal,
  RadioGroup,
  RadioCard,
  Radio,
} from "@mantine/core";
import useFetch from "../../hooks/useFetch";
import {
  IComputedUser,
  ISafeUser,
  IUser,
} from "../../../app/database/models/user";
import {
  Check,
  Clipboard,
  CheckIcon,
  ClipboardIcon,
  ThumbsUpIcon,
  HandPalmIcon,
  EnvelopeSimple,
  EnvelopeSimpleIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { showNotification } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import { validateEmail } from "../../utils/data";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import styles from "./Users.module.scss";
import Content from "../../components/UI/Layout/Content";
import StatusBar from "../../components/UI/Layout/Bottom";
import UserCard from "../../components/Display/Users/UserCard";

export default function Users() {
  const {
    data: users,
    loading: loadingUsers,
    load: reloadUsers,
  } = useFetch<undefined, IComputedUser[]>({
    url: "/users",
    runOnMount: true,
  });

  const [toDisable, setToDisable] = useState<ISafeUser>();
  const [toEnable, setToEnable] = useState<ISafeUser>();
  const [toDelete, setToDelete] = useState<ISafeUser>();

  const { load: disableUser } = useFetch<undefined, ISafeUser>({
    url: `/users/disable/${toDisable?.id}`,
    method: "POST",
    dependencies: [toDisable],
    onSuccess: (user) => {
      setToDisable(undefined);
      reloadUsers();
      showNotification({
        title: "User disabled",
        message: `User ${user.email} has been disabled.`,
      });
    },
    onError: (error) => {
      showNotification({
        title: "Error",
        message: `Failed to disable user`,
        color: "red",
      });
    },
  });

  const { load: enableUser } = useFetch<undefined, ISafeUser>({
    url: `/users/enable/${toEnable?.id}`,
    method: "POST",
    dependencies: [toEnable],
    onSuccess: (user) => {
      setToEnable(undefined);
      reloadUsers();
      showNotification({
        title: "User enabled",
        message: `User ${user.email} has been enabled.`,
      });
    },
    onError: (error) => {
      showNotification({
        title: "Error",
        message: `Failed to enable user`,
        color: "red",
      });
    },
  });

  const { load: deleteUser } = useFetch<undefined, ISafeUser>({
    url: `/users/${toDelete?.id}`,
    method: "DELETE",
    dependencies: [toDelete],
    onSuccess: (user) => {
      setToDelete(undefined);
      reloadUsers();
      showNotification({
        title: "User deleted",
        message: `User ${user.email} has been deleted.`,
      });
    },
    onError: (error) => {
      showNotification({
        title: "Error",
        message: `Failed to delete user`,
        color: "red",
      });
    },
  });

  const [toEmail, setToEmail] = useState<ISafeUser>();
  const [emailType, setEmailType] = useState<"onboarding">("onboarding");
  const { load: sendUserEmail, loading: sendingUserEmail } = useFetch<
    { type: string },
    boolean
  >({
    url: `/users/email/${toEmail?.id}`,
    method: "POST",
    body: {
      type: emailType,
    },
    dependencies: [emailType],
    onSuccess: (d) => {
      showNotification({
        title: "Success",
        message: "User emailed successfully",
      });
      setToEmail(undefined);
    },
    onError: (e) => {
      console.error("Error sending email.");
      showNotification({
        title: "Something went wrong.",
        message: "Something went wrong sending the email.",
        color: "red",
      });
    },
  });

  const invitationForm = useForm({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
    validate: {
      email: (value) => {
        if (!value) {
          return "Email is required";
        }
        if (!validateEmail(value)) {
          return "Invalid email";
        }
      },
      firstName: (value) => {
        if (!value) {
          return "First name is required";
        }
        if (value.length < 2) {
          return "First name must be at least 2 characters";
        }
      },
      lastName: (value) => {
        if (!value) {
          return "Last name is required";
        }
        if (value.length < 2) {
          return "Last name must be at least 2 characters";
        }
      },
    },
  });

  const [invitedUser, setInvitedUser] = useState<{
    user: { firstName: string; lastName: string; email: string };
    emailSuccess: boolean;
  }>();
  const [invitingUser, setInvitingUser] = useState(false);
  const { load: inviteUser, loading: loadingUserInvite } = useFetch<
    { firstName: string; lastName: string; email: string },
    { user: ISafeUser; emailSuccess: boolean }
  >({
    url: "/users/invite",
    method: "POST",
    body: {
      ...invitationForm.getTransformedValues(),
    },
    dependencies: [invitationForm.values],
    onSuccess: (d) => {
      showNotification({
        title: "Success",
        message: "Invitation sent successfully.",
      });
      invitationForm.reset();
      setInvitingUser(false);
      setInvitedUser(d);
      reloadUsers();
    },
    onError: (error) => {
      console.error("Error inviting user: ", error);
      showNotification({
        title: "Error",
        message: "Something went wrong.",
      });
    },
  });

  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<keyof IComputedUser | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      (user.firstName + " " + user.lastName)
        .toLowerCase()
        .includes(query.toLowerCase()) ||
      user.id.toString().includes(query.toLowerCase()) ||
      user.roles.join("").includes(query.toLowerCase()) ||
      (["disabled"].includes(query.toLowerCase()) && user.disabled) ||
      (["enabled", "active"].includes(query.toLowerCase()) && !user.disabled),
  );

  const sortedUsers = filteredUsers?.sort((a, b) => {
    if (!sortField) return 0;

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle special case for full name sorting
    if (sortField === "firstName") {
      aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
      bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
    } else if (sortField === "createdAt") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    } else if (sortField === "disabled") {
      // Sort disabled users to bottom when ascending, top when descending
      aValue = aValue ? 1 : 0;
      bValue = bValue ? 1 : 0;
    } else if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const getSummaryDetails = () => {
    if (!users || users.length === 0) {
      return {
        mostIdeas: undefined,
        mostRecentUser: undefined,
        numberOfUsers: 0,
      };
    }

    const numberOfUsers = users.length;

    let mostIdeasUser: IComputedUser | undefined = undefined;
    let mostRecentUser: IComputedUser | undefined = undefined;

    // Initialize with the first user if available
    if (users.length > 0) {
      mostIdeasUser = users[0];
      mostRecentUser = users[0];
    }

    // Find most ideas and most recent user
    for (const user of users) {
      if (
        mostIdeasUser === undefined ||
        user.numIdeas > mostIdeasUser.numIdeas
      ) {
        mostIdeasUser = user;
      }
      if (
        mostRecentUser === undefined ||
        new Date(user.createdAt).getTime() >
          new Date(mostRecentUser.createdAt).getTime()
      ) {
        mostRecentUser = user;
      }
    }

    return {
      mostIdeas: mostIdeasUser,
      mostRecentUser: mostRecentUser,
      numberOfUsers: numberOfUsers,
    };
  };

  const summaryDetails = getSummaryDetails();

  const [selectedUser, setSelectedUser] = useState<IComputedUser>();

  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
        <Stack gap="md">
          {loadingUsers && <Loader size="lg" />}
          {!!invitedUser && (
            <Alert
              withCloseButton
              onClose={() => {
                setInvitedUser(undefined);
              }}
            >
              <Grid>
                <Grid.Col span={{ sm: 12 }}>
                  <Text>
                    {invitedUser.user.firstName} has been invited with the email{" "}
                    <a href={`mailto:${invitedUser.user.email}`}>
                      {invitedUser.user.email}
                    </a>
                    .{" "}
                    {invitedUser.emailSuccess
                      ? "Email was sent successfully."
                      : "Email was not sent successfully."}
                  </Text>
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <CopyButton value={invitedUser.user.email}>
                    {({ copied, copy }) => {
                      return (
                        <Button
                          onClick={copy}
                          leftSection={
                            copied ? (
                              <Check weight="bold" />
                            ) : (
                              <Clipboard weight="bold" />
                            )
                          }
                        >
                          {copied ? "Copied" : "Copy Email"}
                        </Button>
                      );
                    }}
                  </CopyButton>
                </Grid.Col>
              </Grid>
            </Alert>
          )}
          <Title>Manage Users</Title>
          <Text>
            There are <strong>{summaryDetails.numberOfUsers}</strong> users. The
            most recent user is{" "}
            <strong>{summaryDetails.mostRecentUser?.email}</strong>. The user
            with the most ideas is{" "}
            <strong>{summaryDetails.mostIdeas?.email}</strong>.
          </Text>
          <TextInput
            placeholder="Filter users"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            radius="md"
          />
          {!!filteredUsers?.length && (
            <SimpleGrid
              cols={{
                sm: 1,
                md: 2,
                lg: 3,
              }}
            >
              {filteredUsers.map((user) => {
                return (
                  <UserCard
                    user={user}
                    onClick={() => {
                      setSelectedUser(user);
                    }}
                  />
                );
              })}
            </SimpleGrid>
          )}
        </Stack>

        <Drawer
          position="bottom"
          opened={!!selectedUser}
          onClose={() => {
            setSelectedUser(undefined);
          }}
        >
          <Stack>
            <>
              <Text size="sm">
                <CopyButton
                  value={`${selectedUser?.firstName} ${selectedUser?.lastName}`}
                >
                  {({ copied, copy }) => (
                    <Button
                      size="xs"
                      variant="outline"
                      color="dark.1"
                      onClick={copy}
                      mx="xs"
                      leftSection={
                        copied ? (
                          <CheckIcon size={14} />
                        ) : (
                          <ClipboardIcon size={14} />
                        )
                      }
                    >
                      {selectedUser?.firstName} {selectedUser?.lastName}
                    </Button>
                  )}
                </CopyButton>
                has {selectedUser?.numIdeas} idea
                {selectedUser?.numIdeas === 1 ? "" : "s"}. Their ID is
                <CopyButton value={selectedUser?.id.toString() ?? "Unknown"}>
                  {({ copied, copy }) => (
                    <Button
                      size="xs"
                      variant="outline"
                      color="dark.1"
                      onClick={copy}
                      leftSection={
                        copied ? (
                          <CheckIcon size={14} />
                        ) : (
                          <ClipboardIcon size={14} />
                        )
                      }
                      mx="xs"
                    >
                      {selectedUser?.id.toString() ?? "Unknown"}
                    </Button>
                  )}
                </CopyButton>
                . Their email is
                <CopyButton value={selectedUser?.email || "Unknown"}>
                  {({ copied, copy }) => (
                    <Button
                      size="xs"
                      variant="outline"
                      color="dark.1"
                      onClick={copy}
                      leftSection={
                        copied ? (
                          <CheckIcon size={14} />
                        ) : (
                          <ClipboardIcon size={14} />
                        )
                      }
                      mx="xs"
                    >
                      {selectedUser?.email}
                    </Button>
                  )}
                </CopyButton>
                . Their roles are
                <CopyButton value={selectedUser?.roles.join(", ") || ""}>
                  {({ copied, copy }) => (
                    <Button
                      size="xs"
                      variant="light"
                      color="gray"
                      onClick={copy}
                      leftSection={
                        copied ? (
                          <CheckIcon size={14} />
                        ) : (
                          <ClipboardIcon size={14} />
                        )
                      }
                      mx="xs"
                    >
                      {selectedUser?.roles.join(", ")}
                    </Button>
                  )}
                </CopyButton>
                .
              </Text>
              <Group gap="sm">
                {selectedUser?.disabled ? (
                  <Button
                    variant="light"
                    color="blue"
                    size="sm"
                    radius="md"
                    onClick={() => setToEnable(selectedUser)}
                    leftSection={<ThumbsUpIcon weight="bold" />}
                  >
                    Activate
                  </Button>
                ) : (
                  <Button
                    variant="light"
                    color="red"
                    radius="md"
                    size="sm"
                    onClick={() => setToDisable(selectedUser)}
                    leftSection={<HandPalmIcon weight="bold" />}
                  >
                    Disable
                  </Button>
                )}
                <Button
                  variant="light"
                  color="red"
                  radius="md"
                  size="sm"
                  onClick={() => setToDelete(selectedUser)}
                  leftSection={<TrashSimpleIcon weight="bold" />}
                >
                  Delete
                </Button>
              </Group>
              <Group justify="end">
                <Button
                  variant="default"
                  onClick={() => setSelectedUser(undefined)}
                >
                  Close
                </Button>
              </Group>
            </>
          </Stack>
        </Drawer>
        <Modal
          opened={!!toDisable}
          title="Disable user"
          onClose={() => setToDisable(undefined)}
        >
          <Text>Are you sure you want to disable {toDisable?.email}?</Text>
          <br />
          <Group justify="end">
            <Button onClick={() => setToDisable(undefined)} variant="default">
              No, nevermind.
            </Button>
            <Button
              onClick={() => {
                disableUser();
              }}
              color="red"
            >
              Yes, disable.
            </Button>
          </Group>
        </Modal>
        <Modal
          opened={!!toEnable}
          title="Enable user"
          onClose={() => setToEnable(undefined)}
        >
          <Text>Are you sure you want to enable {toEnable?.email}?</Text>
          <br />
          <Group justify="end">
            <Button onClick={() => setToEnable(undefined)} variant="default">
              No, nevermind.
            </Button>
            <Button
              onClick={() => {
                enableUser();
              }}
              color="green"
            >
              Yes, enable.
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={!!toDelete}
          title="Delete user"
          onClose={() => setToDelete(undefined)}
        >
          <Text>Are you sure you want to delete {toDelete?.email}?</Text>
          <br />
          <Group justify="end">
            <Button onClick={() => setToDelete(undefined)} variant="default">
              No, nevermind.
            </Button>
            <Button
              onClick={() => {
                deleteUser();
              }}
              color="red"
            >
              Yes, delete.
            </Button>
          </Group>
        </Modal>
      </Content>
      <StatusBar />
      <RightSidebar />
    </PageWrapper>
  );
}
