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
  useMantineColorScheme,
  Button,
  Modal,
  Grid,
  TextInput,
  LoadingOverlay,
  Collapse,
  Transition,
  Textarea,
} from "@mantine/core";
import {
  X,
  Plus,
  ArrowRight,
  CaretDownIcon,
  CaretUpIcon,
  PlusIcon,
  ArrowRightIcon,
  XIcon,
  DotsThreeIcon,
} from "@phosphor-icons/react"; // Corrected icon import
import { IIdea, ISafeIdea } from "../../../app/database/models/ideas";
import { ITag, ITagForm } from "../../../app/database/models/tag";
import useFetch from "../../hooks/useFetch";
import { useState, useMemo, useEffect } from "react";
import {
  addTagToIdea,
  createTag,
  createTagAndAddToIdea,
  removeTagFromIdea,
} from "../../utils/ideas"; // Import new utility functions
import { Link, useNavigate } from "react-router";
import { useSettings } from "../../contexts/SettingsContext";
import { InlineTag } from "../../components/Display/Tags/TagDisplay";
import SuggestTags from "../../components/Search/SuggestTags"; // Import the SuggestTags component
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";

type ITagsManagerProps = {
  idea: ISafeIdea;
  maxSuggested?: number;
};

export default function TagsManager({ idea, maxSuggested }: ITagsManagerProps) {
  const [actingTagId, setActingTagId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false); // Local loading state for add/remove

  const ideaIdStr = useMemo(() => idea.id.toString(), [idea.id.toString()]);

  const {
    data: existingTagsData,
    load: loadExistingTags,
    loading: existingTagsLoading,
  } = useFetch<undefined, ITag[]>({
    url: `/ideas/${ideaIdStr}/tags`,
    dependencies: [ideaIdStr],
    runOnDependencies: [ideaIdStr],
  });
  const existingTags: ITag[] = existingTagsData || [];
  const omitTagIds = useMemo(
    () => existingTags.map((tag) => tag.id.toString()),
    [existingTags],
  );

  const {
    data: relatedTagsData,
    loading: relatedTagsLoading,
    load: loadRelatedTags,
  } = useFetch<undefined, ITag[]>({
    url: `/tags/similar_to/idea/${ideaIdStr}`,
    dependencies: [ideaIdStr],
    runOnDependencies: [ideaIdStr], // Ensures ideaIdStr is truthy
  });
  const relatedTagsRaw: ITag[] = relatedTagsData || [];

  const tagForm = useForm<Partial<ITagForm>>({
    initialValues: {
      name: "",
      description: "",
      color: "", // Added color field
    },
    validate: {
      name: (value) => (!value ? "Tag name is required" : null),
      description: (value) => (!value ? "Tag description is required" : null),
    },
  });

  const refresh = () => {
    loadExistingTags();
    loadRelatedTags();
  };

  const [creatingTag, setCreatingTag] = useState(false);

  const handleAddTag = async (tagId: string) => {
    if (!ideaIdStr || actionLoading) return;
    setActingTagId(tagId);
    setActionLoading(true);
    try {
      const result = await addTagToIdea(ideaIdStr, tagId);
      if (result) {
        loadExistingTags();
      }
    } catch (error) {
      console.error("Error adding tag from TagsManager:", error);
    } finally {
      setActingTagId(null);
      setActionLoading(false);
    }
  };

  const handleSuggestedTagSelect = (tag: ITag) => {
    handleAddTag(tag.id.toString());
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!ideaIdStr || actionLoading) return;
    setActingTagId(tagId);
    setActionLoading(true);
    try {
      const result = await removeTagFromIdea(ideaIdStr, tagId);
      if (result) {
        loadExistingTags();
      }
    } catch (error) {
      console.error("Error removing tag from TagsManager:", error);
    } finally {
      setActingTagId(null);
      setActionLoading(false);
    }
  };

  const [allSuggested, setAllSuggested] = useState(false);

  const suggestedTruncated = relatedTagsData?.slice(0, maxSuggested);

  const processedTags = useMemo(() => {
    const existingTagIds = new Set(existingTags.map((t) => t.id.toString()));

    const currentExistingTags = existingTags.map((tag) => ({
      tag,
      type: "existing" as const,
      idStr: tag.id.toString(),
    }));

    const relatedToUse = allSuggested
      ? relatedTagsData || []
      : suggestedTruncated;
    const currentRelatedTags = [...(relatedToUse || [])]
      .filter((tag) => !existingTagIds.has(tag.id.toString()))
      .map((tag) => ({
        tag: tag,
        type: "related" as const,
        idStr: tag.id.toString(),
      }));

    return [...currentExistingTags, ...currentRelatedTags];
  }, [existingTags, relatedTagsRaw, allSuggested]);

  const [createTagLoading, setCreateTagLoading] = useState(false);
  const handleCreateAndAddTag = async (
    name: string,
    description: string,
    close: boolean,
  ) => {
    setCreateTagLoading(true);
    await createTagAndAddToIdea(name, description, idea.id.toString());
    setCreateTagLoading(false);
    refresh();
    if (close) {
      setCreatingTag(false);
    }
  };

  if (!ideaIdStr) {
    return (
      <Card withBorder radius="lg" p="md">
        <Text c="dimmed" size="sm">
          Select an idea to manage tags.
        </Text>
      </Card>
    );
  }

  const {
    ui: {
      theme: {
        scheme: { actual: scheme },
      },
    },
  } = useSettings();

  const navigate = useNavigate();

  const [managing, setManaging] = useState(false);

  if (existingTagsLoading || relatedTagsLoading) {
    return (
      <Group>
        <Loader size="sm" />
        <Text size="sm">Loading tags...</Text>
      </Group>
    );
  }

  return (
    <Container p="0" w="100%">
      {creatingTag && (
        <Modal
          title="Create tag"
          opened={creatingTag}
          onClose={() => {
            setCreatingTag(false);
          }}
        >
          <LoadingOverlay visible={createTagLoading} />
          <Stack>
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  placeholder="Name your tag"
                  {...tagForm.getInputProps("name")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  placeholder="What does this tag describe?"
                  {...tagForm.getInputProps("description")}
                />
              </Grid.Col>
            </Grid>
            <Group justify="end">
              <Button
                variant="default"
                onClick={() => {
                  setCreatingTag(false);
                }}
              >
                Close
              </Button>
              <Button
                onClick={async () => {
                  const { hasErrors, errors } = tagForm.validate();
                  if (hasErrors) {
                    showNotification({
                      title: "Error",
                      message: Object.values(errors)[0],
                      color: "red",
                    });
                    return;
                  }
                  const { name, description } = tagForm.getTransformedValues();
                  if (!name || !description) {
                    showNotification({
                      title: "Please complete fields",
                      message: "Both name and description are required",
                      color: "red",
                    });
                    return;
                  }
                  await handleCreateAndAddTag(name, description, true);
                  tagForm.reset();
                }}
                loading={createTagLoading}
                disabled={createTagLoading}
              >
                Create!
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}
      <Stack w="100%" gap="xs">
        {processedTags.length === 0 &&
          !existingTagsLoading &&
          !relatedTagsLoading &&
          omitTagIds.length === 0 && ( // Also check if there are no existing tags to show a more relevant message
            <Text c="dimmed" size="sm">
              No tags currently associated. Suggested tags will appear here if
              available.
            </Text>
          )}
        <Group gap="xs" wrap="wrap" w="100%">
          {processedTags.map(({ tag, type, idStr }) => {
            const isLoadingAction = actionLoading && actingTagId === idStr;
            return (
              <InlineTag
                key={tag.id.toString()}
                tag={tag}
                link={false}
                variant={type === "existing" ? "filled" : "light"}
                onClick={() => {
                  navigate(`/tags/${tag.id.toString()}`);
                }}
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
                        handleRemoveTag(tag.id.toString());
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
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddTag(tag.id.toString());
                      }}
                      aria-label={`Add tag ${tag.name}`}
                      title={`Add tag ${tag.name}`}
                      disabled={actionLoading}
                    >
                      <Plus style={{ width: "70%", height: "70%" }} />
                    </ActionIcon>
                  )
                }
              />
            );
          })}
          {suggestedTruncated &&
            relatedTagsData &&
            suggestedTruncated.length < relatedTagsData?.length && (
              <ActionIcon
                onClick={() => {
                  setAllSuggested(!allSuggested);
                }}
                size="xs"
                color="currentColor"
                radius="xl"
                variant="transparent"
                aria-label={`Show ${allSuggested ? "less" : "more"} suggested tags`}
                title={`Show ${allSuggested ? "less" : "more"} suggested tags`}
                disabled={actionLoading}
              >
                {allSuggested ? <XIcon /> : <DotsThreeIcon />}
              </ActionIcon>
            )}
          {!managing && (
            <ActionIcon
              onClick={() => {
                setManaging(true);
              }}
              size="xs"
              variant="light"
              color="gray"
            >
              <CaretDownIcon size={14} />
            </ActionIcon>
          )}
        </Group>
        {!!managing && (
          <Stack gap="xs">
            <Group align="baseline" gap="xs">
              <ActionIcon
                onClick={() => {
                  setManaging(false);
                }}
                size="xs"
                variant="light"
                color="gray"
              >
                <CaretUpIcon size={14} />
              </ActionIcon>
              <ActionIcon
                onClick={() => {
                  setCreatingTag(true);
                }}
                variant="light"
                size={"xs"}
                color="blue"
                title="Create a new tag."
              >
                <PlusIcon size={14} />
              </ActionIcon>
              <Link
                to="/tags"
                style={{ textDecoration: "none" }}
                title="Go to tags management page."
              >
                <ActionIcon variant="light" size="xs" color={"blue"}>
                  <ArrowRightIcon size={14} />
                </ActionIcon>
              </Link>
            </Group>
            <Group>
              <SuggestTags
                onSelect={handleSuggestedTagSelect}
                omit={omitTagIds}
                placeholder="Find a tag..."
                limit={10}
              />
            </Group>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
