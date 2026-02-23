import { useState } from "react";
import { IIdea } from '../../../../shared/types/idea';
import { Card, Container, Flex, Grid, Group, HoverCard, MantineColor, Text } from "@mantine/core";
import styles from "./IdeaPreview.module.scss";

type IdeaPreviewProps = {
  idea: IIdea;
  subtext?: React.ReactNode;
  setDraggingIdea?: (idea: IIdea | undefined) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  hoveringIdea?: string | undefined;
  setHoveringIdea?: (hoveringIdea: string | undefined) => void;
  options?: React.ReactNode;
  tags?: React.ReactNode[];
};

export default function IdeaPreview({
  idea,
  subtext,
  setDraggingIdea,
  onDragStart,
  onDragEnd,
  draggable = false,
  hoveringIdea,
  setHoveringIdea,
  options,
  tags,
}: IdeaPreviewProps) {
  const [dragging, setDragging] = useState(false);

  const summary = idea.derived?.generative_summary?.sentenceSummary || "No summary provided.";

  return (
    <HoverCard width={"target"} shadow="lg" withArrow position="right">
      <HoverCard.Target>
        <Card
          px="lg"
          radius="lg"
          draggable={draggable}
          onDragStart={(e) => {
            setDraggingIdea?.(idea);
            onDragStart?.(e);
            setDragging(true);
          }}
          onDragEnd={(e) => {
            setDraggingIdea?.(undefined);
            onDragEnd?.(e);
            setDragging(false);
          }}
          withBorder={!dragging}
          shadow={hoveringIdea === idea.id ? "md" : ""}
          onMouseEnter={() => {
            setHoveringIdea?.(idea.id.toString());
          }}
          onMouseLeave={() => {
            setHoveringIdea?.(undefined);
          }}
          className={`${styles.ideaPreview} ${hoveringIdea === idea.id ? styles.hovered : ""}`}
        >
          <Flex direction="column" gap="sm">
            <Text inline>
              {subtext && (
                <Text inline size="xs" c="dimmed" component="span">
                  {subtext}
                </Text>
              )}
              {idea.title}
            </Text>
            {tags && tags.length > 0 && <div>{tags.map((tag) => tag)}</div>}
          </Flex>
        </Card>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Grid>
          {options && <Grid.Col span={{ sm: 12 }}>{options}</Grid.Col>}
          <Grid.Col span={{ sm: 12 }}>
            <Text>{summary || "No summary provided."}</Text>
          </Grid.Col>
        </Grid>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
