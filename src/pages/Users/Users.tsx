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
import useFetch from '@/hooks/useFetch';
import { IComputedUser, ISafeUser, IUser } from "../../../app/database/models/user";
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
import { validateEmail } from '@/utils/data';
import PageWrapper from '@/components/Layout/PageWrapper';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import styles from "./Users.module.scss";
import Content from '@core/design/components/Layout/Content';
import StatusBar from '@core/design/components/Layout/Bottom';
import UserCard from '@/components/Display/Users/UserCard';
import { LineChart, Sparkline } from "@mantine/charts";
import { formatDate } from '@/utils/formatting';
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';

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
  const { load: sendUserEmail, loading: sendingUserEmail } = useFetch<{ type: string }, boolean>({
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
      (user.firstName + " " + user.lastName).toLowerCase().includes(query.toLowerCase()) ||
      user.id.toString().includes(query.toLowerCase()) ||
      user.roles.join("").includes(query.toLowerCase()) ||
      (["disabled"].includes(query.toLowerCase()) && user.disabled) ||
      (["enabled", "active"].includes(query.toLowerCase()) && !user.disabled)
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
      if (mostIdeasUser === undefined || user.numIdeas > mostIdeasUser.numIdeas) {
        mostIdeasUser = user;
      }
      if (
        mostRecentUser === undefined ||
        new Date(user.createdAt).getTime() > new Date(mostRecentUser.createdAt).getTime()
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

  const userIdeaActivity = (user: IComputedUser) => {
    const ideaMap = user.ideaActivity.reduce(
      (acc, curr) => {
        const date = new Date(curr.day).toISOString().split("T")[0];
        acc[date] = curr.dailyCount;
        return acc;
      },
      {} as Record<string, number>
    );
    const lastSeven = Array(7).fill(0);
    for (let i = 0; i < lastSeven.length; i++) {
      const day = new Date().setDate(new Date().getDate() - i);
      const key = new Date(day).toISOString().split("T")[0];
      lastSeven[i] = ideaMap[key] || 0;
    }
    return lastSeven;
  };

  const userActivity = (user: IComputedUser) => {
    const taskMap = user.taskActivity.reduce(
      (acc, curr) => {
        const date = new Date(curr.day).toISOString().split("T")[0];
        acc[date] = curr.dailyCount;
        return acc;
      },
      {} as Record<string, number>
    );
    const ideaMap = user.ideaActivity.reduce(
      (acc, curr) => {
        const date = new Date(curr.day).toISOString().split("T")[0];
        acc[date] = curr.dailyCount;
        return acc;
      },
      {} as Record<string, number>
    );
    const ideaViewMap = user.ideaViewActivity.reduce(
      (acc, curr) => {
        const date = new Date(curr.day).toISOString().split("T")[0];
        acc[date] = curr.dailyCount;
        return acc;
      },
      {} as Record<string, number>
    );
    const spyglassmap = user.spyglassActivity.reduce(
      (acc, curr) => {
        const date = new Date(curr.day).toISOString().split("T")[0];
        acc[date] = curr.dailyCount;
        return acc;
      },
      {} as Record<string, number>
    );
    const lastSeven = Array(7)
      .fill(undefined)
      .map((a, index) => {
        const date = Date.now() - index * 24 * 60 * 60 * 1000;
        const key = new Date(date).toISOString().split("T")[0];
        return {
          date: formatDate(new Date(date)),
          Tasks: taskMap[key] || 0,
          Ideas: ideaMap[key] || 0,
          "Idea Views": ideaViewMap[key] || 0,
          "Spyglass Queries": spyglassmap[key] || 0,
        };
      })
      .reverse();
    return lastSeven;
  };

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <div className={styles.users}>
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
                      <a href={`mailto:${invitedUser.user.email}`}>{invitedUser.user.email}</a>.{" "}
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
                              copied ? <Check weight="bold" /> : <Clipboard weight="bold" />
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
              There are <strong>{summaryDetails.numberOfUsers}</strong> users. The most recent user
              is <strong>{summaryDetails.mostRecentUser?.email}</strong>. The user with the most
              ideas is <strong>{summaryDetails.mostIdeas?.email}</strong>.
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
                }}
              >
                {filteredUsers.map((user) => {
                  const activity = userActivity(user);

                  return (
                    <UserCard
                      key={user.id.toString()}
                      user={user}
                      onClick={() => {
                        setSelectedUser(user);
                      }}
                    >
                      <LineChart
                        w={"100%"}
                        h="48px"
                        dataKey="date"
                        series={[
                          {
                            name: "Ideas",
                            color: "blue",
                          },
                          {
                            name: "Tasks",
                            color: "green",
                          },
                          {
                            name: "Idea Views",
                            color: "orange",
                          },
                          {
                            name: "Spyglass Queries",
                            color: "pink",
                          },
                        ]}
                        data={activity}
                        curveType="linear"
                        tickLine="none"
                        gridAxis="none"
                        withXAxis={false}
                        withYAxis={false}
                        withDots={false}
                      />
                      {/*<Sparkline
                        data={userIdeaActivity(user)}
                        color="blue"
                      />*/}
                    </UserCard>
                  );
                })}
              </SimpleGrid>
            )}
          </Stack>
        </div>

        <Drawer
          position="bottom"
          size="lg"
          opened={!!selectedUser}
          onClose={() => {
            setSelectedUser(undefined);
          }}
          title={
            selectedUser
              ? `User Details: ${selectedUser.firstName} ${selectedUser.lastName}`
              : "User Details"
          }
        >
          {selectedUser && (
            <Stack>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack>
                    <Title order={4}>Information</Title>
                    <Group gap="xs" align="center">
                      <Text component="span" fw={500}>
                        Name:
                      </Text>
                      <Text component="span">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </Text>
                      <CopyButton value={`${selectedUser.firstName} ${selectedUser.lastName}`}>
                        {({ copied, copy }) => (
                          <ActionIcon variant="subtle" color="gray" onClick={copy}>
                            {copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />}
                          </ActionIcon>
                        )}
                      </CopyButton>
                    </Group>
                    <Group gap="xs" align="center">
                      <Text component="span" fw={500}>
                        Email:
                      </Text>
                      <Text component="span">{selectedUser.email}</Text>
                      <CopyButton value={selectedUser.email}>
                        {({ copied, copy }) => (
                          <ActionIcon variant="subtle" color="gray" onClick={copy}>
                            {copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />}
                          </ActionIcon>
                        )}
                      </CopyButton>
                    </Group>
                    <Group gap="xs" align="center">
                      <Text component="span" fw={500}>
                        ID:
                      </Text>
                      <Text component="span">{selectedUser.id}</Text>
                      <CopyButton value={selectedUser.id.toString()}>
                        {({ copied, copy }) => (
                          <ActionIcon variant="subtle" color="gray" onClick={copy}>
                            {copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />}
                          </ActionIcon>
                        )}
                      </CopyButton>
                    </Group>
                    <Group gap="xs" align="center">
                      <Text component="span" fw={500}>
                        Roles:
                      </Text>
                      <Text component="span">{selectedUser.roles.join(", ")}</Text>
                      <CopyButton value={selectedUser.roles.join(", ")}>
                        {({ copied, copy }) => (
                          <ActionIcon variant="subtle" color="gray" onClick={copy}>
                            {copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />}
                          </ActionIcon>
                        )}
                      </CopyButton>
                    </Group>
                    <Text>
                      <strong>Status:</strong> {selectedUser.disabled ? "Disabled" : "Active"}
                    </Text>
                    <Text>
                      <strong>Created:</strong> {formatDate(new Date(selectedUser.createdAt))}
                    </Text>
                    <Text>
                      <strong>Updated:</strong> {formatDate(new Date(selectedUser.updatedAt))}
                    </Text>
                    {selectedUser.referralCode && (
                      <Group gap="xs" align="center">
                        <Text component="span" fw={500}>
                          Referral Code:
                        </Text>
                        <Text component="span">{selectedUser.referralCode}</Text>
                        <CopyButton value={selectedUser.referralCode}>
                          {({ copied, copy }) => (
                            <ActionIcon variant="subtle" color="gray" onClick={copy}>
                              {copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />}
                            </ActionIcon>
                          )}
                        </CopyButton>
                      </Group>
                    )}
                    <Text>
                      <strong>Terms Accepted:</strong>{" "}
                      {selectedUser.acceptedTermsOfServiceAt
                        ? formatDate(new Date(selectedUser.acceptedTermsOfServiceAt))
                        : "No"}
                    </Text>
                    <Text>
                      <strong>Privacy Accepted:</strong>{" "}
                      {selectedUser.acceptedPrivacyPolicyAt
                        ? formatDate(new Date(selectedUser.acceptedPrivacyPolicyAt))
                        : "No"}
                    </Text>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack>
                    <Title order={4}>Activity</Title>
                    <Text>
                      <strong>Ideas created:</strong> {selectedUser.numIdeas}
                    </Text>
                    <Text>
                      <strong>Activity (last 7 days)</strong>
                    </Text>
                    <Box h={200}>
                      <LineChart
                        h="100%"
                        data={userActivity(selectedUser)}
                        dataKey="date"
                        series={[
                          { name: "Tasks", color: "green" },
                          { name: "Ideas", color: "blue" },
                          { name: "Idea Views", color: "orange" },
                          { name: "Spyglass Queries", color: "pink" },
                        ]}
                        curveType="linear"
                      />
                    </Box>
                  </Stack>
                </Grid.Col>
              </Grid>
              <Group gap="sm">
                {selectedUser.disabled ? (
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
                <Button variant="default" onClick={() => setSelectedUser(undefined)}>
                  Close
                </Button>
              </Group>
            </Stack>
          )}
        </Drawer>
        <Modal opened={!!toDisable} title="Disable user" onClose={() => setToDisable(undefined)}>
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
        <Modal opened={!!toEnable} title="Enable user" onClose={() => setToEnable(undefined)}>
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

        <Modal opened={!!toDelete} title="Delete user" onClose={() => setToDelete(undefined)}>
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
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
