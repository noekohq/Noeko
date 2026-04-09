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
import useFetch from "@core/hooks/useFetch";
import { IComputedUser, ISafeUser, IUser } from "../../../../../app/database/models/user";
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
import { validateEmail } from "@core/utils/data";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import styles from "./Users.module.scss";
import Content from "@core/design/components/Layout/Content";
import StatusBar from "@core/design/components/Layout/Bottom";
import UserCard from "@domains/identity/components/Users/UserCard";
import { LineChart, Sparkline } from "@mantine/charts";
import { formatDate } from "@core/utils/formatting";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";

export default function Users() {
  const { i18n } = useLingui();
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
        title: i18n._(t`User disabled`),
        message: i18n._(t`User ${user.email} has been disabled.`),
      });
    },
    onError: (error) => {
      showNotification({
        title: i18n._(t`Error`),
        message: i18n._(t`Failed to disable user`),
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
        title: i18n._(t`User enabled`),
        message: i18n._(t`User ${user.email} has been enabled.`),
      });
    },
    onError: (error) => {
      showNotification({
        title: i18n._(t`Error`),
        message: i18n._(t`Failed to enable user`),
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
        title: i18n._(t`User deleted`),
        message: i18n._(t`User ${user.email} has been deleted.`),
      });
    },
    onError: (error) => {
      showNotification({
        title: i18n._(t`Error`),
        message: i18n._(t`Failed to delete user`),
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
        title: i18n._(t`Success`),
        message: i18n._(t`User emailed successfully`),
      });
      setToEmail(undefined);
    },
    onError: (e) => {
      console.error("Error sending email.");
      showNotification({
        title: i18n._(t`Something went wrong.`),
        message: i18n._(t`Something went wrong sending the email.`),
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
          return i18n._(t`Email is required`);
        }
        if (!validateEmail(value)) {
          return i18n._(t`Invalid email`);
        }
      },
      firstName: (value) => {
        if (!value) {
          return i18n._(t`First name is required`);
        }
        if (value.length < 2) {
          return i18n._(t`First name must be at least 2 characters`);
        }
      },
      lastName: (value) => {
        if (!value) {
          return i18n._(t`Last name is required`);
        }
        if (value.length < 2) {
          return i18n._(t`Last name must be at least 2 characters`);
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
        title: i18n._(t`Success`),
        message: i18n._(t`Invitation sent successfully.`),
      });
      invitationForm.reset();
      setInvitingUser(false);
      setInvitedUser(d);
      reloadUsers();
    },
    onError: (error) => {
      console.error("Error inviting user: ", error);
      showNotification({
        title: i18n._(t`Error`),
        message: i18n._(t`Something went wrong.`),
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
                      <Trans>
                        {invitedUser.user.firstName} has been invited with the email{" "}
                        <a href={`mailto:${invitedUser.user.email}`}>{invitedUser.user.email}</a>.{" "}
                        {invitedUser.emailSuccess
                          ? "Email was sent successfully."
                          : "Email was not sent successfully."}
                      </Trans>
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
                            {copied ? i18n._(t`Copied`) : i18n._(t`Copy Email`)}
                          </Button>
                        );
                      }}
                    </CopyButton>
                  </Grid.Col>
                </Grid>
              </Alert>
            )}
            <Title>
              <Trans>Manage Users</Trans>
            </Title>
            <Text>
              <Trans>
                There are <strong>{summaryDetails.numberOfUsers}</strong> users. The most recent
                user is <strong>{summaryDetails.mostRecentUser?.email}</strong>. The user with the
                most ideas is <strong>{summaryDetails.mostIdeas?.email}</strong>.
              </Trans>
            </Text>
            <TextInput
              placeholder={i18n._(t`Filter users`)}
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
                            label: i18n._(t`Ideas`),
                            color: "blue",
                          },
                          {
                            name: "Quests",
                            label: i18n._(t`Quests`),
                            color: "green",
                          },
                          {
                            name: "Idea Views",
                            label: i18n._(t`Idea Views`),
                            color: "orange",
                          },
                          {
                            name: "Spyglass Queries",
                            label: i18n._(t`Spyglass Queries`),
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
              ? i18n._(t`User Details: ${selectedUser.firstName} ${selectedUser.lastName}`)
              : i18n._(t`User Details`)
          }
        >
          {selectedUser && (
            <Stack>
              <Grid>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack>
                    <Title order={4}>
                      <Trans>Information</Trans>
                    </Title>
                    <Group gap="xs" align="center">
                      <Text component="span" fw={500}>
                        <Trans>Name:</Trans>
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
                        <Trans>Email:</Trans>
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
                        <Trans>ID:</Trans>
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
                        <Trans>Roles:</Trans>
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
                      <strong>
                        <Trans>Status:</Trans>
                      </strong>{" "}
                      {selectedUser.disabled ? i18n._(t`Disabled`) : i18n._(t`Active`)}
                    </Text>
                    <Text>
                      <strong>
                        <Trans>Created:</Trans>
                      </strong>{" "}
                      {formatDate(new Date(selectedUser.createdAt))}
                    </Text>
                    <Text>
                      <strong>
                        <Trans>Updated:</Trans>
                      </strong>{" "}
                      {formatDate(new Date(selectedUser.updatedAt))}
                    </Text>
                    {selectedUser.referralCode && (
                      <Group gap="xs" align="center">
                        <Text component="span" fw={500}>
                          <Trans>Referral Code:</Trans>
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
                      <strong>
                        <Trans>Terms Accepted:</Trans>
                      </strong>{" "}
                      {selectedUser.acceptedTermsOfServiceAt
                        ? formatDate(new Date(selectedUser.acceptedTermsOfServiceAt))
                        : i18n._(t`No`)}
                    </Text>
                    <Text>
                      <strong>
                        <Trans>Privacy Accepted:</Trans>
                      </strong>{" "}
                      {selectedUser.acceptedPrivacyPolicyAt
                        ? formatDate(new Date(selectedUser.acceptedPrivacyPolicyAt))
                        : i18n._(t`No`)}
                    </Text>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack>
                    <Title order={4}>
                      <Trans>Activity</Trans>
                    </Title>
                    <Text>
                      <strong>
                        <Trans>Ideas created:</Trans>
                      </strong>{" "}
                      {selectedUser.numIdeas}
                    </Text>
                    <Text>
                      <strong>
                        <Trans>Activity (last 7 days)</Trans>
                      </strong>
                    </Text>
                    <Box h={200}>
                      <LineChart
                        h="100%"
                        data={userActivity(selectedUser)}
                        dataKey="date"
                        series={[
                          { name: "Quests", label: i18n._(t`Quests`), color: "green" },
                          { name: "Ideas", label: i18n._(t`Ideas`), color: "blue" },
                          { name: "Idea Views", label: i18n._(t`Idea Views`), color: "orange" },
                          {
                            name: "Spyglass Queries",
                            label: i18n._(t`Spyglass Queries`),
                            color: "pink",
                          },
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
                    <Trans>Activate</Trans>
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
                    <Trans>Disable</Trans>
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
                  <Trans>Delete</Trans>
                </Button>
              </Group>
              <Group justify="end">
                <Button variant="default" onClick={() => setSelectedUser(undefined)}>
                  <Trans>Close</Trans>
                </Button>
              </Group>
            </Stack>
          )}
        </Drawer>
        <Modal
          opened={!!toDisable}
          title={i18n._(t`Disable user`)}
          onClose={() => setToDisable(undefined)}
        >
          <Text>
            <Trans>Are you sure you want to disable {toDisable?.email}?</Trans>
          </Text>
          <br />
          <Group justify="end">
            <Button onClick={() => setToDisable(undefined)} variant="default">
              <Trans>No, nevermind.</Trans>
            </Button>
            <Button
              onClick={() => {
                disableUser();
              }}
              color="red"
            >
              <Trans>Yes, disable.</Trans>
            </Button>
          </Group>
        </Modal>
        <Modal
          opened={!!toEnable}
          title={i18n._(t`Enable user`)}
          onClose={() => setToEnable(undefined)}
        >
          <Text>
            <Trans>Are you sure you want to enable {toEnable?.email}?</Trans>
          </Text>
          <br />
          <Group justify="end">
            <Button onClick={() => setToEnable(undefined)} variant="default">
              <Trans>No, nevermind.</Trans>
            </Button>
            <Button
              onClick={() => {
                enableUser();
              }}
              color="green"
            >
              <Trans>Yes, enable.</Trans>
            </Button>
          </Group>
        </Modal>

        <Modal
          opened={!!toDelete}
          title={i18n._(t`Delete user`)}
          onClose={() => setToDelete(undefined)}
        >
          <Text>
            <Trans>Are you sure you want to delete {toDelete?.email}?</Trans>
          </Text>
          <br />
          <Group justify="end">
            <Button onClick={() => setToDelete(undefined)} variant="default">
              <Trans>No, nevermind.</Trans>
            </Button>
            <Button
              onClick={() => {
                deleteUser();
              }}
              color="red"
            >
              <Trans>Yes, delete.</Trans>
            </Button>
          </Group>
        </Modal>
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
