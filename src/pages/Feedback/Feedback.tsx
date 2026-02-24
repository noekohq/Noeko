import {
  Button,
  CopyButton,
  Drawer,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import PageWrapper from "@/components/Layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import styles from "./Feedback.module.scss";
import useFetch from "@core/hooks/useFetch";
import { IFeedback } from "../../../shared/types/feedback";
import { useState } from "react";
import { showNotification } from "@mantine/notifications";
import { api } from "@infrastructure/api/client";
import RightSidebar from "@core/design/components/Layout/Right";
import Search from "@domains/discovery/components/Search/Search";
import FeedbackCard from "@/components/Display/Feedback/FeedbackCard";
import { formatDate } from "@core/utils/formatting";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import TopBar from "@core/design/components/Layout/TopBar";

export default function Feedback() {
  const {
    data: feedback,
    loading: loadingFeedback,
    load: reloadFeedback,
  } = useFetch<undefined, IFeedback[]>({
    url: "/feedback/open",
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

  const [viewingFeedback, setViewingFeedback] = useState<IFeedback>();

  return (
    <div className={styles.feedback}>
      <PageWrapper>
        <TopBar />
        <LeftSidebar>
          <LeftSidebar.Open>
            {!!feedback && (
              <Text size="sm">
                {feedback?.length} feedback item{feedback.length > 1 ? "s" : ""}
              </Text>
            )}
          </LeftSidebar.Open>
        </LeftSidebar>
        <Content>
          <Stack>
            <Title>Manage Feedback</Title>
            <TextInput
              placeholder="Filter feedback"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              w="100%"
            />
            <SimpleGrid
              cols={{
                sm: 1,
                md: 2,
                lg: 3,
              }}
            >
              {filteredFeedback?.map((feedback) => {
                return (
                  <FeedbackCard
                    key={feedback.id.toString()}
                    feedback={feedback}
                    onClick={() => {
                      setViewingFeedback(feedback);
                    }}
                  />
                );
              })}
            </SimpleGrid>
          </Stack>
        </Content>
        <RightSidebar>
          <RightSidebar.Open>
            <Search />
          </RightSidebar.Open>
        </RightSidebar>
        <Drawer
          title={`Viewing feedback from ${viewingFeedback ? formatDate(viewingFeedback.createdAt) : "Unknown time"}`}
          opened={!!viewingFeedback}
          onClose={() => {
            setViewingFeedback(undefined);
          }}
          position="bottom"
          size="75%"
        >
          <Stack>
            <Text size="sm">"{viewingFeedback?.content}"</Text>
            <Text size="sm" c="dimmed">
              - {viewingFeedback?.user?.firstName} {viewingFeedback?.user?.lastName}
            </Text>
            <Group>
              <Button
                onClick={() => {
                  setViewingFeedback(undefined);
                  if (viewingFeedback) {
                    changeFeedbackStatus(viewingFeedback.id.toString(), "addressed");
                  }
                }}
                size="sm"
                variant="light"
                color="blue"
              >
                Mark Resolved
              </Button>
              <Button
                size="sm"
                color="red"
                onClick={() => {
                  setToDelete(viewingFeedback);
                  setViewingFeedback(undefined);
                }}
              >
                Delete
              </Button>
              <CopyButton value={viewingFeedback?.user?.email ?? ""}>
                {({ copied, copy }) => {
                  return (
                    <Button
                      onClick={() => {
                        copy();
                      }}
                      leftSection={copied ? <CheckIcon /> : <CopyIcon />}
                      size="sm"
                      variant="light"
                      color="dark.1"
                    >
                      Copy Email
                    </Button>
                  );
                }}
              </CopyButton>
            </Group>
          </Stack>
        </Drawer>
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
      </PageWrapper>
    </div>
  );
}
