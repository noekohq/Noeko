import { Card, Drawer, Grid, Group, List, Text } from "@mantine/core";
import { Sparkle } from "@phosphor-icons/react";
import { IIdea } from "../../../app/database/models/ideas";
import {
  IGenerativeSummary,
  IGenerativeSummaryForm,
} from "../../../app/database/models/ideas/summaries";

type IOverviewProps = {
  opened: boolean;
  onClose: () => void;
  idea: IIdea | undefined;
  loadingIdea: boolean;
  reloadIdea: () => Promise<void>;
};

export default function Overview({
  opened,
  onClose,
  idea,
  loadingIdea,
  reloadIdea,
}: IOverviewProps) {
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
      <Grid>
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
    </Drawer>
  );
}
