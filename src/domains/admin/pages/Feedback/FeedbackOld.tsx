import {
  Container,
  Title,
  Loader,
  Grid,
  Table,
  ActionIcon,
  Group,
  TextInput,
  Modal,
  Text,
  Button,
  HoverCard,
  Select,
  Checkbox,
} from "@mantine/core";
import useFetch from "@core/hooks/useFetch";
import { TrashSimple, CaretDown } from "@phosphor-icons/react";
import { useState } from "react";
import { showNotification } from "@mantine/notifications";
import { IFeedback } from "../../../../../shared/types/feedback";
import { api } from "@infrastructure/api/client";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Content from "@core/design/components/Layout/Content";
import StatusBar from "@core/design/components/Layout/Bottom";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";

export default function Feedback() {
  const {
    data: feedback,
    loading: loadingFeedback,
    load: reloadFeedback,
  } = useFetch<undefined, IFeedback[]>({
    url: "/feedback",
    runOnMount: true,
  });

  const [toDelete, setToDelete] = useState<IFeedback>();

  const { load: deleteFeedback } = useFetch<undefined, IFeedback>({
    url: `/feedback/${toDelete?.id}`,
    method: "DELETE",
    dependencies: [toDelete],
    onSuccess: (user) => {
      setToDelete(undefined);
      reloadFeedback();
      showNotification({
        title: "Feedback deleted",
        message: `Feedback from ${toDelete?.user?.email || "unknown user"} has been deleted.`,
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

  const [query, setQuery] = useState("");

  const [filterAddressed, setFilterAddressed] = useState(false);

  const filteredFeedback = feedback
    ?.filter(
      (feedback) =>
        feedback.content?.toLowerCase().includes(query.toLowerCase()) ||
        feedback.user?.email.toLowerCase().includes(query.toLowerCase()) ||
        (feedback.user?.firstName + " " + feedback.user?.lastName)
          .toLowerCase()
          .includes(query.toLowerCase()) ||
        feedback.id.toString().includes(query.toLowerCase())
    )
    .filter((f) => {
      if (filterAddressed && f.status === "addressed") {
        return false;
      }
      return true;
    });

  const clipContent = (content: string) => {
    if (content.length > 56) {
      return content.slice(0, 56) + "...";
    }
    return content;
  };

  const changeFeedbackStatus = (feedbackId: string, status: string) => {
    api
      .put(`/feedback/${feedbackId}`, {
        status,
      })
      .then(() => {
        reloadFeedback();
      })
      .catch(() => {
        showNotification({
          title: "Something went wrong",
          message: "Something went wrong updating feedback status",
          color: "red",
        });
      });
  };

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <Modal opened={!!toDelete} title="Delete Feedback" onClose={() => setToDelete(undefined)}>
          <Text>
            Are you sure you want to delete this feedback from{" "}
            {toDelete?.user?.email || "this user"}?
          </Text>
          <br />
          <Group justify="end">
            <Button onClick={() => setToDelete(undefined)} variant="default">
              No, nevermind.
            </Button>
            <Button
              onClick={() => {
                deleteFeedback();
              }}
              color="red"
            >
              Yes, delete.
            </Button>
          </Group>
        </Modal>

        {loadingFeedback && <Loader size="lg" />}
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Title>Manage Feedback</Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }} />
          <Grid.Col span={{ sm: 12 }}>
            <TextInput
              placeholder="Filter feedback"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="start">
              <Checkbox
                label="Filter addressed items"
                checked={filterAddressed}
                onChange={(checked) => {
                  setFilterAddressed(checked.currentTarget.checked);
                }}
              />
            </Group>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }} />
          <Grid.Col>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Content</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Can Contact?</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredFeedback?.map((feedback) => {
                  return (
                    <Table.Tr key={feedback.id.toString()}>
                      {/* <Table.Td>
                        <Text size="sm">{feedback.id.toString()}</Text>
                      </Table.Td> */}
                      <Table.Td>{feedback.user?.email || "unknown"}</Table.Td>
                      <Table.Td>
                        <HoverCard width="target">
                          <HoverCard.Target>
                            <Text size="sm">
                              <CaretDown /> {clipContent(feedback.content)}
                            </Text>
                          </HoverCard.Target>
                          <HoverCard.Dropdown>{feedback.content}</HoverCard.Dropdown>
                        </HoverCard>
                      </Table.Td>
                      <Table.Td>
                        <Select
                          value={feedback.status}
                          data={[
                            {
                              label: "Unaddressed",
                              value: "unaddressed",
                            },
                            {
                              label: "In Progress",
                              value: "in-progress",
                            },
                            {
                              label: "Addressed",
                              value: "addressed",
                            },
                          ]}
                          onChange={(v) => {
                            if (v) {
                              changeFeedbackStatus(feedback.id.toString(), v);
                            }
                          }}
                        />
                      </Table.Td>
                      <Table.Td>{feedback.consentToContact ? "Yes" : "No"}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="red"
                            size="sm"
                            onClick={() => setToDelete(feedback)}
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
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
