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
import useFetch from "../../hooks/useFetch";
import {
  IComputedUser,
  ISafeUser,
  IUser,
} from "../../../app/database/models/user";
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
import { validateEmail } from "../../utils/data";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";

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
  const [toViewDetails, setToViewDetails] = useState<IComputedUser>();

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
    return sortDirection === "asc" ? (
      <CaretUp size={14} />
    ) : (
      <CaretDown size={14} />
    );
  };

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      (user.firstName + " " + user.lastName)
        .toLowerCase()
        .includes(query.toLowerCase()) ||
      user.id.toString().includes(query.toLowerCase()),
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

  return (
    <PageWrapper>
      <LeftSidebar />
      <Container p="lg">
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

        <Modal
          opened={!!toEmail}
          title="Email user"
          onClose={() => setToEmail(undefined)}
          size="lg"
        >
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              Sending email to {toEmail?.email}
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <RadioGroup
                value={emailType}
                onChange={(v) => setEmailType(v as typeof emailType)}
              >
                <RadioCard value="onboarding" radius="sm" p="md">
                  <Group wrap="nowrap" align="flex-start">
                    <Radio.Indicator />
                    <Text>Send the user an onboarding email.</Text>
                  </Group>
                </RadioCard>
                <RadioCard value="test" radius="sm" p="md">
                  <Group wrap="nowrap" align="flex-start">
                    <Radio.Indicator />
                    <Text>Send the user test email.</Text>
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
                  Cancel.
                </Button>
                <Button
                  onClick={() => {
                    sendUserEmail();
                  }}
                  leftSection={
                    sendingUserEmail ? <Loader size="sm" color="white" /> : ""
                  }
                  disabled={sendingUserEmail}
                >
                  Send it.
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Modal>

        <Modal
          opened={invitingUser}
          onClose={() => setInvitingUser(false)}
          title="Invite user"
          size="lg"
        >
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label="First name"
                placeholder="First name"
                {...invitationForm.getInputProps("firstName")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label="Last name"
                placeholder="Last name"
                {...invitationForm.getInputProps("lastName")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label="Email"
                placeholder="Email"
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
                  Cancel.
                </Button>
                <Button
                  onClick={() => {
                    inviteUser();
                  }}
                  leftSection={
                    loadingUserInvite ? <Loader color="white" size="sm" /> : ""
                  }
                  disabled={loadingUserInvite}
                >
                  Send invite!
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Modal>

        <Modal
          opened={!!toViewDetails}
          onClose={() => setToViewDetails(undefined)}
          title="User Details"
          size="lg"
        >
          {toViewDetails && (
            <Grid mt="lg">
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  {toViewDetails.numIdeas} idea
                  {toViewDetails.numIdeas === 1 ? "" : "s"}
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  Their name is
                  <CopyButton
                    value={`${toViewDetails.firstName} ${toViewDetails.lastName}`}
                  >
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={copy}
                        mx="xs"
                        leftSection={
                          copied ? <Check size={14} /> : <Clipboard size={14} />
                        }
                      >
                        {toViewDetails.firstName} {toViewDetails.lastName}
                      </Button>
                    )}
                  </CopyButton>
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  Their ID is
                  <CopyButton value={toViewDetails.id.toString()}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={copy}
                        leftSection={
                          copied ? <Check size={14} /> : <Clipboard size={14} />
                        }
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
                  Their email is
                  <CopyButton value={toViewDetails.email}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={copy}
                        leftSection={
                          copied ? <Check size={14} /> : <Clipboard size={14} />
                        }
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
                    Their roles are
                    <CopyButton value={toViewDetails.roles.join(", ")}>
                      {({ copied, copy }) => (
                        <Button
                          size="xs"
                          variant="light"
                          onClick={copy}
                          leftSection={
                            copied ? (
                              <Check size={14} />
                            ) : (
                              <Clipboard size={14} />
                            )
                          }
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
                  <Button
                    variant="default"
                    onClick={() => setToViewDetails(undefined)}
                  >
                    Close
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
                      {invitedUser.user.firstName} has been invited with the
                      email{" "}
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
            </Grid.Col>
          )}
          <Grid.Col span={{ sm: 12 }}>
            <Title>Manage Users</Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text>
              There are <strong>{summaryDetails.numberOfUsers}</strong> users.
              The most recent user is{" "}
              <strong>{summaryDetails.mostRecentUser?.email}</strong>. The user
              with the most ideas is{" "}
              <strong>{summaryDetails.mostIdeas?.email}</strong>.
            </Text>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="end">
              <Button variant="light" onClick={() => setInvitingUser(true)}>
                Invite a user
              </Button>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text></Text>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <TextInput
              placeholder="Filter users"
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
                      Name
                      {getSortIcon("firstName")}
                    </Group>
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("email")}
                  >
                    <Group gap="xs">
                      Email
                      {getSortIcon("email")}
                    </Group>
                  </Table.Th>
                  <Table.Th>Roles</Table.Th>
                  <Table.Th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("numIdeas")}
                  >
                    <Group gap="xs">
                      Ideas
                      {getSortIcon("numIdeas")}
                    </Group>
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("createdAt")}
                  >
                    <Group gap="xs">
                      Created
                      {getSortIcon("createdAt")}
                    </Group>
                  </Table.Th>
                  <Table.Th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("disabled")}
                  >
                    <Group gap="xs">
                      Status
                      {getSortIcon("disabled")}
                    </Group>
                  </Table.Th>
                  <Table.Th>Actions</Table.Th>
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
                        {user.numIdeas} idea{user.numIdeas === 1 ? "" : "s"}
                      </Table.Td>
                      <Table.Td>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Table.Td>
                      <Table.Td>
                        <Text color={user.disabled ? "red" : "green"}>
                          {user.disabled ? "Disabled" : "Active"}
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
                            title="View Details"
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
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}
