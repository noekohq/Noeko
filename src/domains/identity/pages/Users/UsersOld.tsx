import {
  Container,
  Title,
  Loader,
  Grid,
  Table,
  ActionIcon,
  ActionIconGroup,
  Group,
  TextInput,
  Modal,
  Text,
  Button,
  Textarea,
  RadioCard,
  RadioGroup,
  Radio,
  Alert,
  CopyButton,
  Code,
  SimpleGrid,
} from "@mantine/core";
import useFetch from "@core/hooks/useFetch";
import { IComputedUser, ISafeUser, IUser } from "../../../../../app/database/models/user";
import {
  TrashSimple,
  HandPalm,
  ThumbsUp,
  EnvelopeSimple,
  Check,
  Clipboard,
  Eye,
  CaretUp,
  CaretDown,
} from "@phosphor-icons/react";
import { useState } from "react";
import { showNotification } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import { validateEmail } from "@core/utils/data";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans, Plural } from "@lingui/react/macro";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import styles from "./Users.module.scss";
import Content from "@core/design/components/Layout/Content";
import StatusBar from "@core/design/components/Layout/Bottom";
import Nav from "@core/design/components/Layout/Nav";

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
  const [toViewDetails, setToViewDetails] = useState<IComputedUser>();

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

  const handleSort = (field: keyof IComputedUser) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: keyof IComputedUser) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <CaretUp size={14} /> : <CaretDown size={14} />;
  };

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      (user.firstName + " " + user.lastName).toLowerCase().includes(query.toLowerCase()) ||
      user.id.toString().includes(query.toLowerCase())
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

  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
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

        <Modal
          opened={!!toEmail}
          title={i18n._(t`Email user`)}
          onClose={() => setToEmail(undefined)}
          size="lg"
        >
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              <Trans>Sending email to {toEmail?.email}</Trans>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <RadioGroup value={emailType} onChange={(v) => setEmailType(v as typeof emailType)}>
                <RadioCard value="onboarding" radius="sm" p="md">
                  <Group wrap="nowrap" align="flex-start">
                    <Radio.Indicator />
                    <Text>
                      <Trans>Send the user an onboarding email.</Trans>
                    </Text>
                  </Group>
                </RadioCard>
                <RadioCard value="test" radius="sm" p="md">
                  <Group wrap="nowrap" align="flex-start">
                    <Radio.Indicator />
                    <Text>
                      <Trans>Send the user test email.</Trans>
                    </Text>
                  </Group>
                </RadioCard>
              </RadioGroup>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                <Button
                  variant="default"
                  onClick={() => setToEmail(undefined)}
                  disabled={sendingUserEmail}
                >
                  <Trans>Cancel.</Trans>
                </Button>
                <Button
                  onClick={() => {
                    sendUserEmail();
                  }}
                  leftSection={sendingUserEmail ? <Loader size="sm" color="white" /> : ""}
                  disabled={sendingUserEmail}
                >
                  <Trans>Send it.</Trans>
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Modal>

        <Modal
          opened={invitingUser}
          onClose={() => setInvitingUser(false)}
          title={i18n._(t`Invite user`)}
          size="lg"
        >
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label={t`First name`}
                placeholder={t`First name`}
                {...invitationForm.getInputProps("firstName")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label={t`Last name`}
                placeholder={t`Last name`}
                {...invitationForm.getInputProps("lastName")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label={t`Email`}
                placeholder={t`Email`}
                {...invitationForm.getInputProps("email")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }} />
            <Grid.Col span={{ sm: 12 }}>
              <Group justify="right">
                <Button
                  variant="default"
                  onClick={() => {
                    invitationForm.reset();
                    setInvitingUser(false);
                  }}
                  disabled={loadingUserInvite}
                >
                  <Trans>Cancel.</Trans>
                </Button>
                <Button
                  onClick={() => {
                    inviteUser();
                  }}
                  leftSection={loadingUserInvite ? <Loader color="white" size="sm" /> : ""}
                  disabled={loadingUserInvite}
                >
                  <Trans>Send invite!</Trans>
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Modal>

        <Modal
          opened={!!toViewDetails}
          onClose={() => setToViewDetails(undefined)}
          title={i18n._(t`User Details`)}
          size="lg"
        >
          {toViewDetails && (
            <Grid mt="lg">
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  <Plural value={toViewDetails.numIdeas} one="# idea" other="# ideas" />
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  <Trans>Their name is</Trans>
                  <CopyButton value={`${toViewDetails.firstName} ${toViewDetails.lastName}`}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={copy}
                        mx="xs"
                        leftSection={copied ? <Check size={14} /> : <Clipboard size={14} />}
                      >
                        {toViewDetails.firstName} {toViewDetails.lastName}
                      </Button>
                    )}
                  </CopyButton>
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  <Trans>Their ID is</Trans>
                  <CopyButton value={toViewDetails.id.toString()}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={copy}
                        leftSection={copied ? <Check size={14} /> : <Clipboard size={14} />}
                        mx="xs"
                      >
                        {toViewDetails.id}
                      </Button>
                    )}
                  </CopyButton>
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  <Trans>Their email is</Trans>
                  <CopyButton value={toViewDetails.email}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={copy}
                        leftSection={copied ? <Check size={14} /> : <Clipboard size={14} />}
                        mx="xs"
                      >
                        {toViewDetails.email}
                      </Button>
                    )}
                  </CopyButton>
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Group gap="xs">
                  <Text>
                    <Trans>Their roles are</Trans>
                    <CopyButton value={toViewDetails.roles.join(", ")}>
                      {({ copied, copy }) => (
                        <Button
                          size="xs"
                          variant="light"
                          onClick={copy}
                          leftSection={copied ? <Check size={14} /> : <Clipboard size={14} />}
                          mx="xs"
                        >
                          {toViewDetails.roles.join(", ")}
                        </Button>
                      )}
                    </CopyButton>
                  </Text>
                </Group>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Group justify="end">
                  <Button variant="default" onClick={() => setToViewDetails(undefined)}>
                    <Trans>Close</Trans>
                  </Button>
                </Group>
              </Grid.Col>
            </Grid>
          )}
        </Modal>

        {loadingUsers && <Loader size="lg" />}
        <Grid>
          {!!invitedUser && (
            <Grid.Col span={{ sm: 12 }}>
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
            </Grid.Col>
          )}
          <Grid.Col span={{ sm: 12 }}>
            <Title>
              <Trans>Manage Users</Trans>
            </Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text>
              <Trans>
                There are <strong>{summaryDetails.numberOfUsers}</strong> users. The most recent
                user is <strong>{summaryDetails.mostRecentUser?.email}</strong>. The user with the
                most ideas is <strong>{summaryDetails.mostIdeas?.email}</strong>.
              </Trans>
            </Text>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="end">
              <Button variant="light" onClick={() => setInvitingUser(true)}>
                <Trans>Invite a user</Trans>
              </Button>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text></Text>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <TextInput
              placeholder={i18n._(t`Filter users`)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }} />
          <Grid.Col>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("firstName")}
                  >
                    <Group gap="xs">
                      <Trans>Name</Trans>
                      {getSortIcon("firstName")}
                    </Group>
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("email")}
                  >
                    <Group gap="xs">
                      <Trans>Email</Trans>
                      {getSortIcon("email")}
                    </Group>
                  </Table.Th>
                  <Table.Th>
                    <Trans>Roles</Trans>
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("numIdeas")}
                  >
                    <Group gap="xs">
                      <Trans>Ideas</Trans>
                      {getSortIcon("numIdeas")}
                    </Group>
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("createdAt")}
                  >
                    <Group gap="xs">
                      <Trans>Created</Trans>
                      {getSortIcon("createdAt")}
                    </Group>
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("disabled")}
                  >
                    <Group gap="xs">
                      <Trans>Status</Trans>
                      {getSortIcon("disabled")}
                    </Group>
                  </Table.Th>
                  <Table.Th>
                    <Trans>Actions</Trans>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedUsers?.map((user) => {
                  return (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        {user.firstName} {user.lastName}
                      </Table.Td>
                      <Table.Td>{user.email}</Table.Td>
                      <Table.Td>{user.roles.join(", ")}</Table.Td>
                      <Table.Td>
                        <Plural value={user.numIdeas} one="# idea" other="# ideas" />
                      </Table.Td>
                      <Table.Td>{new Date(user.createdAt).toLocaleDateString()}</Table.Td>
                      <Table.Td>
                        <Text color={user.disabled ? "red" : "green"}>
                          {user.disabled ? i18n._(t`Disabled`) : i18n._(t`Active`)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <SimpleGrid cols={2}>
                          {user.disabled ? (
                            <ActionIcon
                              variant="light"
                              color="green"
                              size="sm"
                              onClick={() => setToEnable(user)}
                            >
                              <ThumbsUp />
                            </ActionIcon>
                          ) : (
                            <ActionIcon
                              variant="light"
                              color="blue"
                              size="sm"
                              onClick={() => setToDisable(user)}
                            >
                              <HandPalm />
                            </ActionIcon>
                          )}
                          <ActionIcon
                            variant="light"
                            color="orange"
                            size="sm"
                            onClick={() => setToEmail(user)}
                          >
                            <EnvelopeSimple />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={() => setToDelete(user)}
                          >
                            <TrashSimple />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="teal"
                            size="sm"
                            title={i18n._(t`View Details`)}
                            onClick={() => setToViewDetails(user)}
                          >
                            <Eye />
                          </ActionIcon>
                        </SimpleGrid>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Grid.Col>
        </Grid>
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
