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
} from "@mantine/core";
import useFetch from "../../hooks/useFetch";
import { ISafeUser } from "../../../app/database/models/user";
import {
  TrashSimple,
  PencilSimple,
  HandPalm,
  ThumbsUp,
} from "@phosphor-icons/react";
import { useState } from "react";
import { showNotification } from "@mantine/notifications";

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

      {loadingUsers && <Loader size="lg" />}
      <Grid>
        <Grid.Col span={{ sm: 12 }}>
          <Title>Manage Users</Title>
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
  );
}
