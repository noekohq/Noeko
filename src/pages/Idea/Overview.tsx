import {
  Accordion,
  AccordionValue,
  Button,
  Card,
  Drawer,
  Grid,
  Group,
  List,
  Loader,
  Text,
} from "@mantine/core";
import { Sparkle } from "@phosphor-icons/react";
import { IIdea } from "../../../app/database/models/ideas";
import {
  IGenerativeSummary,
  IGenerativeSummaryForm,
} from "../../../app/database/models/ideas/summaries";
import useFetch from "../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { openConfirmModal } from "@mantine/modals";
import { validate } from "uuid";

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
    sentenceOverview: "",
    sentenceSummary: "",
    paragraphOverview: "",
    paragraphSummary: "",
    abstractSummary: "",
    simplifiedSummary: "",
    outline: [],
    keyPoints: [],
    highlights: [],
  };

  const {
    sentenceOverview,
    sentenceSummary,
    paragraphOverview,
    paragraphSummary,
    abstractSummary,
    simplifiedSummary,
    outline,
    keyPoints,
    highlights,
  } = summary;

  return (
    <div>
      <Grid>
        <Grid.Col span={12}>
          <Text>Insights into your idea...</Text>
        </Grid.Col>
        {!idea?.derived?.generative_summary ? (
          <>
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
                size="sm"
              >
                {loadingOverview
                  ? "Creating overview..."
                  : "Yes, create overview."}
              </Button>
            </Grid.Col>
          </>
        ) : (
          <>
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
                  color="red"
                  disabled={loadingDelete}
                  leftSection={
                    loadingDelete ? <Loader size="sm" color="white" /> : ""
                  }
                  size="sm"
                >
                  Delete Overview
                </Button>
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
                    : "Refresh overview"}
                </Button>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Accordion>
                <Accordion.Item value={"overview"}>
                  <Accordion.Control icon={<Sparkle />}>
                    Overview
                  </Accordion.Control>
                  <Accordion.Panel>{sentenceOverview}</Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="summary">
                  <Accordion.Control icon={<Sparkle />}>
                    Brief Summary
                  </Accordion.Control>
                  <Accordion.Panel>{sentenceSummary}</Accordion.Panel>
                </Accordion.Item>
                {paragraphSummary && (
                  <Accordion.Item value="paragraph_summary">
                    <Accordion.Control icon={<Sparkle />}>
                      Summary
                    </Accordion.Control>
                    <Accordion.Panel>{paragraphSummary}</Accordion.Panel>
                  </Accordion.Item>
                )}
                {paragraphOverview && (
                  <Accordion.Item value="paragraph_overview">
                    <Accordion.Control icon={<Sparkle />}>
                      Overview
                    </Accordion.Control>
                    <Accordion.Panel>{paragraphOverview}</Accordion.Panel>
                  </Accordion.Item>
                )}
                {abstractSummary && (
                  <Accordion.Item value="abstract_summary">
                    <Accordion.Control icon={<Sparkle />}>
                      Abstract
                    </Accordion.Control>
                    <Accordion.Panel>{abstractSummary}</Accordion.Panel>
                  </Accordion.Item>
                )}
                {simplifiedSummary && (
                  <Accordion.Item value="abstract_summary">
                    <Accordion.Control icon={<Sparkle />}>
                      Simplified
                    </Accordion.Control>
                    <Accordion.Panel>{simplifiedSummary}</Accordion.Panel>
                  </Accordion.Item>
                )}
                {outline && (
                  <Accordion.Item value="abstract_summary">
                    <Accordion.Control icon={<Sparkle />}>
                      Outline
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List type="unordered">
                        {outline.map((item, index) => (
                          <List.Item key={index}>{item}</List.Item>
                        ))}
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
                {keyPoints && (
                  <Accordion.Item value="abstract_summary">
                    <Accordion.Control icon={<Sparkle />}>
                      Key Points
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List type="unordered">
                        {keyPoints.map((item, index) => (
                          <List.Item key={index}>{item}</List.Item>
                        ))}
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
                {highlights && (
                  <Accordion.Item value="abstract_summary">
                    <Accordion.Control icon={<Sparkle />}>
                      Highlights
                    </Accordion.Control>
                    <Accordion.Panel>
                      <List type="unordered">
                        {highlights.map((item, index) => (
                          <List.Item key={index}>{item}</List.Item>
                        ))}
                      </List>
                    </Accordion.Panel>
                  </Accordion.Item>
                )}
              </Accordion>
            </Grid.Col>
          </>
        )}
      </Grid>
    </div>
  );
}
