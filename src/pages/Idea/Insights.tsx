import { Button, Grid, Group, Loader, Text } from "@mantine/core";
import { IIdea, ISafeIdea } from "../../../app/database/models/ideas";
import {
  IGenerativeSummary,
  IGenerativeSummaryForm,
} from "../../../app/database/models/ideas/summaries";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";
import OverviewAccordion from "../../components/Display/Ideas/OverviewAccordion";
import { BookIcon } from "@phosphor-icons/react";

type IInsightsProps = {
  idea: ISafeIdea | undefined;
  loadingIdea: boolean;
  reloadIdea: () => void;
};

export default function Insights({
  idea,
  loadingIdea,
  reloadIdea,
}: IInsightsProps) {
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
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Something went wrong.",
      });
    },
  });

  return (
    <div>
      <Grid>
        {!idea?.derived?.generative_summary ? (
          <>
            <Grid.Col span={{ sm: 12 }}>
              Would you like an overview for this idea?
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
                size="sm"
              >
                {loadingOverview
                  ? "Creating overview..."
                  : "Yes, create overview"}
              </Button>
            </Grid.Col>
          </>
        ) : (
          <>
            <Grid.Col span={12}>
              <Text size="sm" c="dimmed" fw="bold">
                <Group gap="xs">
                  <BookIcon weight="bold" />
                  UNDERSTANDING
                </Group>
              </Text>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <OverviewAccordion overview={idea.derived.generative_summary} />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                <Button
                  variant="light"
                  onClick={() => {
                    openConfirmModal({
                      title: "Are you sure?",
                      children: (
                        <Text>
                          Are you sure you want to delete the overview?
                        </Text>
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
                  color="gray"
                  disabled={loadingDelete || loadingOverview}
                  leftSection={
                    loadingDelete ? <Loader size="sm" color="white" /> : ""
                  }
                  size="xs"
                  title="Delete overview"
                >
                  Delete
                </Button>
                <Button
                  variant="light"
                  onClick={() => {
                    generateSummary();
                  }}
                  color="gray"
                  disabled={loadingOverview || loadingDelete}
                  leftSection={
                    loadingOverview ? <Loader size="sm" color="white" /> : ""
                  }
                  size="xs"
                  title="Refresh overview"
                >
                  {loadingOverview ? "Refreshing overview..." : "Refresh"}
                </Button>
              </Group>
            </Grid.Col>
          </>
        )}
      </Grid>
    </div>
  );
}
