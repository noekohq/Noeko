import { Button, Card, Drawer, Grid, List, Loader, Text } from "@mantine/core";
import { Sparkle } from "@phosphor-icons/react";
import { IIdea } from "../../../app/database/models/ideas";
import {
  IGenerativeSummary,
  IGenerativeSummaryForm,
} from "../../../app/database/models/ideas/summaries";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";

type IOverviewProps = {
  opened: boolean;
  onClose: () => void;
  idea: IIdea | undefined;
  loadingIdea: boolean;
  reloadIdea: () => void;
};

export default function Overview({
  opened,
  onClose,
  idea,
  loadingIdea,
  reloadIdea,
}: IOverviewProps) {
  const { load: generateSummary, loading: loadingOverview } = useFetch<
    { type: "generative_summary" },
    IGenerativeSummary
  >({
    url: `/graph/ideas/${idea?.id}/derive`,
    method: "POST",
    dependencies: [idea?.id],
    body: {
      type: "generative_summary",
    },
    onSuccess: () => {
      showNotification({
        title: "Success",
        message: "Overview generated successfully",
      });
      reloadIdea();
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Something went wrong.",
      });
    },
  });

  const { load: removeSummary, loading: loadingDelete } = useFetch<
    { type: "generative_summary" },
    IGenerativeSummary
  >({
    url: `/graph/ideas/${idea?.id}/derive`,
    method: "DELETE",
    dependencies: [idea?.id],
    body: {
      type: "generative_summary",
    },
    onSuccess: () => {
      showNotification({
        title: "Success",
        message: "Overview deleted successfully",
      });
      reloadIdea();
      onClose();
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Something went wrong.",
      });
    },
  });

  const summary: IGenerativeSummaryForm = idea?.derived?.generative_summary || {
    sentenceSummary: "",
    paragraphSummary: "",
    abstractSummary: "",
    simplifiedSummary: "",
    outline: [],
    keyPoints: [],
    highlights: [],
  };

  const {
    sentenceSummary,
    paragraphSummary,
    abstractSummary,
    simplifiedSummary,
    outline,
    keyPoints,
    highlights,
  } = summary;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      offset={14}
      radius="lg"
      position="right"
      size={"70%"}
    >
      {!idea?.derived?.generative_summary ? (
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            There is no overview currently, would you like to generate one?
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Button
              variant="light"
              onClick={() => {
                generateSummary();
              }}
              disabled={loadingOverview}
              leftSection={
                loadingOverview ? <Loader size="sm" color="white" /> : ""
              }
            >
              {loadingOverview
                ? "Creating overview..."
                : "Yes, create overview."}
            </Button>
          </Grid.Col>
        </Grid>
      ) : (
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Button
              variant="light"
              onClick={() => {
                openConfirmModal({
                  title: "Are you sure?",
                  children: (
                    <Text>Are you sure you want to delete the overview?</Text>
                  ),
                  onConfirm: () => {
                    removeSummary();
                  },
                  labels: {
                    cancel: "No, Cancel",
                    confirm: "Yes, Delete",
                  },
                  confirmProps: {
                    color: "red",
                  },
                });
              }}
              color="red"
              disabled={loadingDelete}
              leftSection={
                loadingDelete ? <Loader size="sm" color="white" /> : ""
              }
            >
              Delete Overview
            </Button>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card radius="lg">
              <Text fw="bold" c="dimmed">
                <Sparkle weight="bold" /> Content Summary
              </Text>
              <Text>{sentenceSummary}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card radius="lg">
              <Text fw="bold" c="dimmed">
                <Sparkle weight="bold" /> Paragraph Summary
              </Text>
              <Text>{paragraphSummary}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card radius="lg">
              <Text fw="bold" c="dimmed">
                <Sparkle weight="bold" /> Abstract Summary
              </Text>
              <Text>{abstractSummary}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card radius="lg">
              <Text fw="bold" c="dimmed">
                <Sparkle weight="bold" /> Simplified Summary
              </Text>
              <Text>{simplifiedSummary}</Text>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card radius="lg">
              <Text fw="bold" c="dimmed">
                <Sparkle weight="bold" /> Outline
              </Text>
              <List type="unordered">
                {outline.map((item, index) => (
                  <List.Item key={index}>{item}</List.Item>
                ))}
              </List>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card radius="lg">
              <Text fw="bold" c="dimmed">
                <Sparkle weight="bold" /> Key Points
              </Text>
              <List type="unordered">
                {keyPoints.map((point, index) => (
                  <List.Item key={index}>{point}</List.Item>
                ))}
              </List>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Card radius="lg">
              <Text fw="bold" c="dimmed">
                <Sparkle weight="bold" /> Highlights
              </Text>
              <List type="unordered">
                {highlights.map((highlight, index) => (
                  <List.Item key={index}>{highlight}</List.Item>
                ))}
              </List>
            </Card>
          </Grid.Col>
        </Grid>
      )}
    </Drawer>
  );
}
