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
} from "@mantine/core";
import useFetch from "../../hooks/useFetch";
import { ISafeUser, IUser } from "../../../app/database/models/user";
import {
  TrashSimple,
  HandPalm,
  ThumbsUp,
  EnvelopeSimple,
  Check,
  Clipboard,
} from "@phosphor-icons/react";
import { useState } from "react";
import { showNotification } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import TextEditor from "../../components/TextEditor/TextEditor";
import { validateEmail } from "../../utils/data";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";

export default function Users() {
  const {
    data: users,
    loading: loadingUsers,
    load: reloadUsers,
  } = useFetch<undefined, ISafeUser[]>({
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
    user: ISafeUser;
    emailSuccess: boolean;
    newUserPassword: string;
  }>();
  const [invitingUser, setInvitingUser] = useState(false);
  const { load: inviteUser, loading: loadingUserInvite } = useFetch<
    { firstName: string; lastName: string; email: string },
    { user: ISafeUser; emailSuccess: boolean; newUserPassword: string }
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

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      (user.firstName + " " + user.lastName)
        .toLowerCase()
        .includes(query.toLowerCase()) ||
      user.id.toString().includes(query.toLowerCase()),
  );

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
                      The new user has been created with the email{" "}
                      <a href={`mailto:${invitedUser.user.email}`}>
                        {invitedUser.user.email}
                      </a>{" "}
                      and password <Code>{invitedUser.newUserPassword}</Code>.{" "}
                      {invitedUser.emailSuccess
                        ? "Email was sent successfully."
                        : "Email was not sent successfully."}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={{ sm: 12 }}>
                    <CopyButton value={invitedUser.newUserPassword}>
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
                            {copied ? "Copied" : "Copy Password"}
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
          <Grid.Col span={{ sm: 12 }} />
          <Grid.Col span={{ sm: 12 }}>
            <TextInput
              placeholder="Filter users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="end">
              <Button variant="light" onClick={() => setInvitingUser(true)}>
                Invite a user
              </Button>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }} />
          <Grid.Col>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Roles</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers?.map((user) => {
                  return (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        <Text c={user.disabled ? "dimmed" : ""} size="sm">
                          {user.id}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {user.firstName} {user.lastName}
                      </Table.Td>
                      <Table.Td>{user.email}</Table.Td>
                      <Table.Td>{user.roles.join(", ")}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
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
                        </Group>
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
