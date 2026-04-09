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
import PageWrapper from "@core/design/layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import styles from "./Feedback.module.scss";
import useFetch from "@core/hooks/useFetch";
import { IFeedback } from "../../../../../shared/types/feedback";
import { useState } from "react";
import { showNotification } from "@mantine/notifications";
import { api } from "@infrastructure/api/client";
import RightSidebar from "@core/design/components/Layout/Right";
import Search from "@domains/discovery/components/Search/Search";
import FeedbackCard from "@/core/design/components/Display/Feedback/FeedbackCard";
import { formatDate } from "@core/utils/formatting";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import TopBar from "@core/design/components/Layout/TopBar";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";

export default function Feedback() {
  const { i18n } = useLingui();
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
        title: i18n._(t`Feedback deleted`),
        message: i18n._(
          t`Feedback from ${toDelete?.user?.email || i18n._(t`unknown user`)} has been deleted.`
        ),
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
          title: i18n._(t`Something went wrong`),
          message: i18n._(t`Something went wrong updating feedback status`),
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
                <Trans>
                  {feedback?.length} feedback item{feedback.length > 1 ? "s" : ""}
                </Trans>
              </Text>
            )}
          </LeftSidebar.Open>
        </LeftSidebar>
        <Content>
          <Stack>
            <Title>
              <Trans>Manage Feedback</Trans>
            </Title>
            <TextInput
              placeholder={i18n._(t`Filter feedback`)}
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
          title={i18n._(
            t`Viewing feedback from ${
              viewingFeedback ? formatDate(viewingFeedback.createdAt) : i18n._(t`Unknown time`)
            }`
          )}
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
                <Trans>Mark Resolved</Trans>
              </Button>
              <Button
                size="sm"
                color="red"
                onClick={() => {
                  setToDelete(viewingFeedback);
                  setViewingFeedback(undefined);
                }}
              >
                <Trans>Delete</Trans>
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
                      <Trans>Copy Email</Trans>
                    </Button>
                  );
                }}
              </CopyButton>
            </Group>
          </Stack>
        </Drawer>
        <Modal
          opened={!!toDelete}
          title={i18n._(t`Delete Feedback`)}
          onClose={() => setToDelete(undefined)}
        >
          <Text>
            <Trans>
              Are you sure you want to delete this feedback from{" "}
              {toDelete?.user?.email || i18n._(t`this user`)}?
            </Trans>
          </Text>
          <br />
          <Group justify="end">
            <Button onClick={() => setToDelete(undefined)} variant="default">
              <Trans>No, nevermind.</Trans>
            </Button>
            <Button
              onClick={() => {
                deleteFeedback();
              }}
              color="red"
            >
              <Trans>Yes, delete.</Trans>
            </Button>
          </Group>
        </Modal>
      </PageWrapper>
    </div>
  );
}
