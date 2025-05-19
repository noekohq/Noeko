import { Card, Divider, Text } from "@mantine/core";
import { IIdea } from "../../../../app/database/models/ideas";
import { getNodeDescription } from "../../../utils/graph";
import { Link } from "react-router";
import styles from "./IdeaCard.module.scss";
import { useState } from "react";
import { formatDate, formatDateTime } from "../../../utils/formatting";

type IIdeaCardProps = {
  idea: IIdea;
  link?: boolean;
};

export default function IdeaCard({ idea, link }: IIdeaCardProps) {
  const ParentEl: (children: React.ReactNode) => React.ReactNode = link
    ? (children) => (
        <Link to={`/idea/${idea.id}`} style={{ textDecoration: "none" }}>
          {children}
        </Link>
      )
    : (children) => <>{children}</>;

  const [hovering, setHovering] = useState(false);

  return ParentEl(
    <Card
      w="100%"
      h="100%"
      withBorder
      radius={"lg"}
      shadow={hovering ? "lg" : "sm"}
      className={styles.card}
      onMouseEnter={() => {
        setHovering(true);
      }}
      onMouseLeave={() => {
        setHovering(false);
      }}
    >
      <Text fw="bold" size="sm">
        {idea.title}
      </Text>
      <Text size="xs" c="dimmed">
        {formatDateTime(idea.updatedAt)}
      </Text>
      <Divider my="sm" />
      <Text size="sm">{getNodeDescription({ ...idea, type: "idea" })}</Text>
    </Card>,
  );
}
