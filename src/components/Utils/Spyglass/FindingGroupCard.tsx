import React, { useState } from "react";
import { Badge, Blockquote, Button, Group, HoverCard, Modal, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import { IFinding } from "../../../../app/services/Spyglass";
import { IConnectableFields } from "../../../../app/services/Graph";
import { getTypeFromId, TypeIcon } from '@/utils/graph';
import { INode } from '@/declarations/graph';
import { markdownToHtml } from '@/utils/formatting';
import styles from "./FindingGroupCard.module.scss";

interface IGroupedFinding {
  sourceId: string;
  resource: IConnectableFields;
  findings: IFinding[];
}

interface IFindingGroupCardProps {
  group: IGroupedFinding;
}

/**
 * Formats finding type for display (e.g., "PERSONAL_INSIGHT" -> "Personal Insight")
 */
const formatFindingType = (type: string): string => {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Shared component for displaying findings detail (used in both HoverCard and Modal)
 */
const FindingsDetail: React.FC<{
  group: IGroupedFinding;
  onNavigate?: () => void;
}> = ({ group, onNavigate }) => {
  const navigate = useNavigate();
  const { resource, findings } = group;
  const link = `/${resource.type}/${resource.id.toString()}`;

  const handleNavigate = () => {
    onNavigate?.();
    navigate(link);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Text size="sm" fw={600}>
          {resource.name}
        </Text>
        <Button
          variant="light"
          color="gray"
          size="xs"
          radius="md"
          rightSection={<ArrowRightIcon size={12} />}
          onClick={handleNavigate}
        >
          Visit
        </Button>
      </Group>

      <Stack gap="sm">
        {findings.map((finding, index) => (
          <div key={index} className={styles.findingItem}>
            <Badge
              variant="light"
              color="gray"
              size="xs"
              mb="xs"
              styles={{ label: { textTransform: "none" } }}
            >
              {formatFindingType(finding.findingType)}
            </Badge>
            <Blockquote color="gray" p="xs" mb="xs" className={styles.excerpt}>
              <Text
                size="xs"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(finding.excerpt),
                }}
              />
            </Blockquote>
            <Text size="xs" c="dimmed">
              {finding.analysis}
            </Text>
          </div>
        ))}
      </Stack>
    </Stack>
  );
};

/**
 * Card component for grouped findings from a single source.
 * Shows HoverCard on desktop, Modal on mobile.
 */
const FindingGroupCard: React.FC<IFindingGroupCardProps> = ({ group }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  // Detect touch/mobile devices - no hover capability
  const isTouchDevice = useMediaQuery("(hover: none)");

  const { sourceId, resource, findings } = group;
  const type = getTypeFromId(sourceId);
  const Icon = TypeIcon(type as INode["type"]);
  const link = `/${resource.type}/${resource.id.toString()}`;

  // Get unique finding types for badges
  const uniqueTypes = [...new Set(findings.map((f) => f.findingType))];

  const handleCardClick = () => {
    if (isTouchDevice) {
      setModalOpen(true);
    }
  };

  const cardContent = (
    <div
      className={styles.card}
      onClick={handleCardClick}
      role={isTouchDevice ? "button" : undefined}
      tabIndex={isTouchDevice ? 0 : undefined}
    >
      <div className={styles.cardHeader}>
        <div className={styles.iconWrapper}>{Icon && <Icon size={16} />}</div>
        <Text size="sm" fw={500} lineClamp={1} className={styles.title}>
          {resource.name}
        </Text>
      </div>

      <Text size="xs" c="dimmed" mb="xs">
        {findings.length} finding{findings.length !== 1 ? "s" : ""}
      </Text>

      <Group gap={4} wrap="wrap">
        {uniqueTypes.slice(0, 3).map((type) => (
          <Badge
            key={type}
            variant="light"
            color="gray"
            size="xs"
            styles={{ label: { textTransform: "none" } }}
          >
            {formatFindingType(type)}
          </Badge>
        ))}
        {uniqueTypes.length > 3 && (
          <Badge
            variant="light"
            color="gray"
            size="xs"
            styles={{ label: { textTransform: "none" } }}
          >
            +{uniqueTypes.length - 3}
          </Badge>
        )}
      </Group>
    </div>
  );

  return (
    <>
      {/* Desktop: HoverCard */}
      {!isTouchDevice ? (
        <HoverCard width={400} position="top" withArrow shadow="lg" openDelay={300} radius="lg">
          <HoverCard.Target>{cardContent}</HoverCard.Target>
          <HoverCard.Dropdown mah={400} style={{ overflowY: "auto" }}>
            <FindingsDetail group={group} onNavigate={() => navigate(link)} />
          </HoverCard.Dropdown>
        </HoverCard>
      ) : (
        cardContent
      )}

      {/* Mobile: Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <Text size="sm" fw={600}>
            Findings from {resource.name}
          </Text>
        }
        size="lg"
        radius="lg"
      >
        <FindingsDetail group={group} onNavigate={() => setModalOpen(false)} />
      </Modal>
    </>
  );
};

export default FindingGroupCard;
