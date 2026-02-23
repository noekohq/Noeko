import { Button, Grid, Group, Loader, Stack, Text } from "@mantine/core";
import { IIdea, ISafeIdea } from "../../../shared/types/idea";
import { IGenerativeSummary, IGenerativeSummaryForm } from "../../../shared/types/idea";
import useFetch from '@/hooks/useFetch';
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";
import OverviewAccordion from '@/components/Display/Ideas/OverviewAccordion';
import { BookIcon, EyeIcon } from "@phosphor-icons/react";

type IInsightsProps = {
  idea: ISafeIdea | undefined;
  loadingIdea: boolean;
  reloadIdea: () => void;
};

export default function Insights({ idea, loadingIdea, reloadIdea }: IInsightsProps) {
  const { load: generateSummary, loading: loadingOverview } = useFetch<
    { type: "generative_summary" },
    IGenerativeSummary
  >({
    url: `/ideas/${idea?.id}/derive`,
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
    url: `/ideas/${idea?.id}/derive`,
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
            <Grid.Col>
              <Stack w="100%">
                <Text size="xs" c="dimmed">
                  This idea hasn't been analyzed.
                </Text>
                <Button
                  variant="light"
                  onClick={() => {
                    generateSummary();
                  }}
                  disabled={loadingOverview}
                  leftSection={loadingOverview ? <Loader size="xs" color="gray" /> : <EyeIcon />}
                  size="xs"
                  color="gray"
                  radius="md"
                >
                  {loadingOverview ? "Analyzing..." : "Analyze idea"}
                </Button>
                <Text size="xs" c="dark.3">
                  Analysis uses third-party AI models in accordance with our{" "}
                  <a href="https://www.noeko.app/privacy">Privacy Policy</a>.
                </Text>
              </Stack>
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
                      children: <Text>Are you sure you want to delete the overview?</Text>,
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
                  leftSection={loadingDelete ? <Loader size="sm" color="white" /> : ""}
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
                  leftSection={loadingOverview ? <Loader size="sm" color="white" /> : ""}
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
