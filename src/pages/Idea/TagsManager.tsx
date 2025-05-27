import {
  Card,
  Group,
  Text,
  Badge,
  HoverCard,
  ActionIcon,
  Loader,
  Stack,
  Container,
  useMantineTheme,
} from "@mantine/core";
import { X, Plus, ArrowRight } from "@phosphor-icons/react"; // Corrected icon import
import { IIdea } from "../../../app/database/models/ideas";
import { ITag } from "../../../app/database/models/tag";
import useFetch from "../../hooks/useFetch";
import { useState, useMemo } from "react";
import { addTagToIdea, removeTagFromIdea } from "../../utils/ideas"; // Import new utility functions
import { Link } from "react-router";

type ITagsManagerProps = {
  idea: IIdea;
};

// Helper to stringify ID for comparisons and keys
const getStringId = (id: any): string => {
  if (typeof id === "string") return id;
  if (id && typeof id.toString === "function") return id.toString();
  return String(id);
};

export default function TagsManager({ idea }: ITagsManagerProps) {
  const [actingTagId, setActingTagId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false); // Local loading state for add/remove

  const ideaIdStr = useMemo(() => getStringId(idea.id), [idea.id]);

  const {
    data: existingTagsData,
    load: loadExistingTags,
    loading: existingTagsLoading,
  } = useFetch<undefined, ITag[]>({
    url: `/ideas/${ideaIdStr}/tags`,
    dependencies: [ideaIdStr],
    runOnDependencies: [ideaIdStr], // Ensures ideaIdStr is truthy
  });
  const existingTags: ITag[] = existingTagsData || [];

  const { data: relatedTagsData, loading: relatedTagsLoading } = useFetch<
    undefined,
    ITag[]
  >({
    url: `/tags/similar_to/idea/${ideaIdStr}`,
    dependencies: [ideaIdStr],
    runOnDependencies: [ideaIdStr], // Ensures ideaIdStr is truthy
  });
  const relatedTagsRaw: ITag[] = relatedTagsData || [];

  const handleAddTag = async (tagId: string | any) => {
    if (!ideaIdStr || actionLoading) return;
    const tagIdStr = getStringId(tagId);
    setActingTagId(tagIdStr);
    setActionLoading(true);
    try {
      const result = await addTagToIdea(ideaIdStr, tagIdStr);
      if (result) {
        loadExistingTags(); // Refresh existing tags
      }
    } catch (error) {
      // Error notification is handled by addTagToIdea
      console.error("Error adding tag from TagsManager:", error);
    } finally {
      setActingTagId(null);
      setActionLoading(false);
    }
  };

  const handleRemoveTag = async (tagId: string | any) => {
    if (!ideaIdStr || actionLoading) return;
    const tagIdStr = getStringId(tagId);
    setActingTagId(tagIdStr);
    setActionLoading(true);
    try {
      const result = await removeTagFromIdea(ideaIdStr, tagIdStr);
      if (result) {
        loadExistingTags(); // Refresh existing tags
      }
    } catch (error) {
      // Error notification is handled by removeTagFromIdea
      console.error("Error removing tag from TagsManager:", error);
    } finally {
      setActingTagId(null);
      setActionLoading(false);
    }
  };

  const processedTags = useMemo(() => {
    const existingTagIds = new Set(existingTags.map((t) => getStringId(t.id)));

    const currentExistingTags = existingTags.map((tag) => ({
      tag,
      type: "existing" as const,
      idStr: getStringId(tag.id),
    }));

    const currentRelatedTags = relatedTagsRaw
      .filter((tag) => !existingTagIds.has(getStringId(tag.id)))
      .map((tag) => ({
        tag,
        type: "related" as const,
        idStr: getStringId(tag.id),
      }));

    return [...currentExistingTags, ...currentRelatedTags];
  }, [existingTags, relatedTagsRaw]);

  if (!ideaIdStr) {
    return (
      <Card withBorder radius="lg" p="md">
        <Text c="dimmed" size="sm">
          Select an idea to manage tags.
        </Text>
      </Card>
    );
  }

  const { colors } = useMantineTheme();

  if (existingTagsLoading || relatedTagsLoading) {
    return (
      <Card withBorder radius="lg" p="md">
        <Group>
          <Loader size="sm" />
          <Text size="sm">Loading tags...</Text>
        </Group>
      </Card>
    );
  }

  return (
    <Container p="0" w="100%">
      <Stack w="100%">
        {processedTags.length === 0 &&
          !existingTagsLoading &&
          !relatedTagsLoading && (
            <Text c="dimmed" size="sm">
              No tags currently associated. Suggested tags will appear here if
              available.
            </Text>
          )}
        <Group gap="xs" wrap="wrap" w="100%">
          {processedTags.map(({ tag, type, idStr }) => {
            const isLoadingAction = actionLoading && actingTagId === idStr;
            return (
              <HoverCard
                width={280}
                shadow="md"
                withArrow
                key={idStr}
                openDelay={300}
                closeDelay={100}
              >
                <HoverCard.Target>
                  <Badge
                    size="lg"
                    variant={type === "existing" ? "filled" : "light"}
                    color={tag.color || (type === "existing" ? "blue" : "gray")}
                    pr={
                      isLoadingAction ||
                      type === "related" ||
                      type === "existing"
                        ? 7
                        : undefined
                    } // Adjust padding for icon space
                    rightSection={
                      isLoadingAction ? (
                        <Loader
                          size="xs"
                          color="currentColor"
                          style={{ marginRight: 5 }}
                        />
                      ) : type === "existing" ? (
                        <ActionIcon
                          size="xs"
                          color="currentColor"
                          radius="xl"
                          variant="transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTag(tag.id);
                          }}
                          aria-label={`Remove tag ${tag.name}`}
                          title={`Remove tag ${tag.name}`}
                          disabled={actionLoading}
                        >
                          <X style={{ width: "70%", height: "70%" }} />
                        </ActionIcon>
                      ) : (
                        // type === "related"
                        <ActionIcon
                          size="xs"
                          color="currentColor"
                          radius="xl"
                          variant="transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddTag(tag.id);
                          }}
                          aria-label={`Add tag ${tag.name}`}
                          title={`Add tag ${tag.name}`}
                          disabled={actionLoading}
                        >
                          <Plus style={{ width: "70%", height: "70%" }} />
                        </ActionIcon>
                      )
                    }
                  >
                    {tag.name}
                  </Badge>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  {type === "existing" ? (
                    <Text size="sm">
                      {tag.description || "No description available."}
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed">
                      This tag may be related.
                    </Text>
                  )}
                </HoverCard.Dropdown>
              </HoverCard>
            );
          })}
        </Group>
        <Link to="/settings/tags" style={{ textDecoration: "none" }}>
          <Text c="dark.4" size="xs" fw="bold">
            MANAGE TAGS{" "}
            <ArrowRight
              style={{ position: "relative", top: "2px" }}
              weight="bold"
            />
          </Text>
        </Link>
      </Stack>
    </Container>
  );
}
