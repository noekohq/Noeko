import { Button, Grid, Group, Loader, Stack, Text } from "@mantine/core";
import { IIdea, ISafeIdea } from "../../../../../shared/types/idea";
import { IGenerativeSummary, IGenerativeSummaryForm } from "../../../../../shared/types/idea";
import useFetch from "@core/hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";
import OverviewAccordion from "@domains/knowledge/components/Ideas/OverviewAccordion";
import { BookIcon, EyeIcon } from "@phosphor-icons/react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";

type IInsightsProps = {
  idea: ISafeIdea | undefined;
  loadingIdea: boolean;
  reloadIdea: () => void;
};

export default function Insights({ idea, loadingIdea, reloadIdea }: IInsightsProps) {
  const { i18n } = useLingui();
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
        title: i18n._(t`Success`),
        message: i18n._(t`Overview generated successfully`),
      });
      reloadIdea();
    },
    onError: () => {
      showNotification({
        title: i18n._(t`Error`),
        message: i18n._(t`Something went wrong.`),
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
        title: i18n._(t`Success`),
        message: i18n._(t`Overview deleted successfully`),
      });
      reloadIdea();
    },
    onError: () => {
      showNotification({
        title: i18n._(t`Error`),
        message: i18n._(t`Something went wrong.`),
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
                  <Trans>This idea hasn't been analyzed.</Trans>
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
                  {loadingOverview ? i18n._(t`Analyzing...`) : i18n._(t`Analyze idea`)}
                </Button>
                <Text size="xs" c="dark.3">
                  <Trans>
                    Analysis uses third-party AI models in accordance with our{" "}
                    <a href="https://www.noeko.app/privacy">Privacy Policy</a>.
                  </Trans>
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
                  <Trans>UNDERSTANDING</Trans>
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
                      title: i18n._(t`Are you sure?`),
                      children: (
                        <Text>
                          <Trans>Are you sure you want to delete the overview?</Trans>
                        </Text>
                      ),
                      onConfirm: () => {
                        removeSummary();
                      },
                      labels: {
                        cancel: i18n._(t`No, Cancel`),
                        confirm: i18n._(t`Yes, Delete`),
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
                  title={i18n._(t`Delete overview`)}
                >
                  <Trans>Delete</Trans>
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
                  title={i18n._(t`Refresh overview`)}
                >
                  {loadingOverview ? i18n._(t`Refreshing overview...`) : i18n._(t`Refresh`)}
                </Button>
              </Group>
            </Grid.Col>
          </>
        )}
      </Grid>
    </div>
  );
}
