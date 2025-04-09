import { useState } from "react";
import { IIdea } from "../../../../app/database/models/ideas";
import { Card, Grid, Group, HoverCard, Text } from "@mantine/core";
import styles from "./IdeaPreview.module.scss";

type IdeaPreviewProps = {
  idea: IIdea;
  subtext?: JSX.Element;
  setDraggingIdea?: (idea: IIdea | undefined) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  draggable?: boolean;
  hoveringIdea?: string | undefined;
  setHoveringIdea?: (hoveringIdea: string | undefined) => void;
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
}: IdeaPreviewProps) {
  const [dragging, setDragging] = useState(false);

  const summary =
    idea.derived?.generative_summary?.sentenceSummary || "No summary provided.";

  return (
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
      shadow={dragging ? "md" : ""}
      onMouseEnter={() => {
        setHoveringIdea?.(idea.id.toString());
      }}
      onMouseLeave={() => {
        setHoveringIdea?.(undefined);
      }}
      className={`${styles.ideaPreview} ${hoveringIdea === idea.id ? styles.hovered : ""}`}
    >
      <HoverCard width={300}>
        <HoverCard.Target>
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              <Group gap="xs">
                {subtext && (
                  <Text size="xs" c="dimmed">
                    {subtext}
                  </Text>
                )}
                <Text fw="bold">{idea.title}</Text>
              </Group>
            </Grid.Col>
          </Grid>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Text>{summary || "No summary provided."}</Text>
        </HoverCard.Dropdown>
      </HoverCard>
    </Card>
  );
}
