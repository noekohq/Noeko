import {
  Card,
  Group,
  Text,
  ActionIcon,
  Loader,
  Stack,
  Container,
  Button,
  Modal,
  Grid,
  TextInput,
  LoadingOverlay,
  Textarea,
} from "@mantine/core";
import {
  XIcon,
  PlusIcon,
  CaretDownIcon,
  CaretUpIcon,
  ArrowRightIcon,
  DotsThreeIcon,
  IntersectSquareIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { IIdea, ISafeIdea } from "../../../app/database/models/ideas";
import { ITag, ITagForm } from "../../../app/database/models/tag";
import useFetch from "../../hooks/useFetch";
import { useState, useMemo, useEffect } from "react";
import {
  createTagAndAddToThing,
  applyTagToThing,
  removeTagFromThing,
} from "../../utils/tags";
import { Link, useNavigate } from "react-router";
import { useSettings } from "../../contexts/SettingsContext";
import { InlineTag } from "../../components/Display/Tags/TagDisplay";
import SuggestTags from "../../components/Search/SuggestTags";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import { IConnectable } from "../../../app/services/Graph";
import useConnectable from "../../hooks/useConnectable";

type ITagsManagerProps = {
  connectable: IConnectable;
  maxSuggested?: number;
};

export default function TagsManager({
  connectable,
  maxSuggested,
}: ITagsManagerProps) {
  const [actingTagId, setActingTagId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const thingIdStr = useMemo(
    () => connectable.id.toString(),
    [connectable.id.toString()],
  );

  const {
    tags: {
      applied: appliedTags,
      suggested: suggestedTags,
      refresh: refreshTags,
      apply: applyTag,
      remove: removeTag,
    },
  } = useConnectable({
    connectable,
  });

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

  useEffect(() => {
    refreshTags();
  }, [connectable.embeddingsUpdatedAt]);

  const [creatingTag, setCreatingTag] = useState(false);

  const handleAddTag = async (tagId: string) => {
    if (!thingIdStr || actionLoading) return;
    setActingTagId(tagId);
    setActionLoading(true);
    try {
      await applyTag(tagId);
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
    if (!thingIdStr || actionLoading) return;
    setActingTagId(tagId);
    setActionLoading(true);
    try {
      await removeTag(tagId);
    } catch (error) {
      console.error("Error removing tag from TagsManager:", error);
    } finally {
      setActingTagId(null);
      setActionLoading(false);
    }
  };

  const [allSuggested, setAllSuggested] = useState(false);

  const suggestedTruncated = suggestedTags?.slice(0, maxSuggested);

  const processedTags: {
    tag: ITag;
    type: "existing" | "suggested";
    id: string;
  }[] = useMemo(() => {
    return [
      ...appliedTags?.map((t) => {
        return {
          tag: t,
          type: "existing" as const,
          id: t.id.toString(),
        };
      }),
      ...(allSuggested ? suggestedTags : suggestedTruncated)?.map((t) => {
        return {
          tag: t,
          type: "suggested" as const,
          id: t.id.toString(),
        };
      }),
    ];
  }, [appliedTags, suggestedTags, allSuggested]);

  const [createTagLoading, setCreateTagLoading] = useState(false);
  const handleCreateAndAddTag = async (
    name: string,
    description: string,
    close: boolean,
  ) => {
    setCreateTagLoading(true);
    await createTagAndAddToThing(name, description, connectable.id.toString());
    setCreateTagLoading(false);
    refreshTags();
    if (close) {
      setCreatingTag(false);
    }
  };

  const {
    ui: {
      theme: {
        scheme: { actual: scheme },
      },
    },
  } = useSettings();

  const navigate = useNavigate();

  const [managing, setManaging] = useState(false);

  return (
    <Container p="0" w="100%">
      <Stack w="100%" gap="xs">
        <Text size="sm" c="dark.4" fw="bold">
          <Group gap="xs">
            <TagIcon weight="fill" />
            TAGS
          </Group>
        </Text>
        {processedTags.length === 0 && (
          <Text c="dimmed" size="sm">
            No tags.
          </Text>
        )}
        <Group gap="xs" wrap="wrap" w="100%">
          {processedTags.map(({ tag, type, id }) => {
            const isLoadingAction = actionLoading && actingTagId === id;

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
                    <Loader size="xs" color="gray" style={{ marginRight: 5 }} />
                  ) : type === "existing" ? (
                    <ActionIcon
                      size="xs"
                      color="gray"
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
                      <XIcon style={{ width: "70%", height: "70%" }} />
                    </ActionIcon>
                  ) : (
                    // type === "related"
                    <ActionIcon
                      size="xs"
                      color="gray"
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
                      <PlusIcon style={{ width: "70%", height: "70%" }} />
                    </ActionIcon>
                  )
                }
              />
            );
          })}
          {suggestedTruncated &&
            suggestedTags &&
            suggestedTruncated.length < suggestedTags?.length && (
              <ActionIcon
                onClick={() => {
                  setAllSuggested(!allSuggested);
                }}
                size="xs"
                color="gray"
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
          <Stack gap="xs" w="100%">
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
                color="gray"
                title="Create a new tag."
              >
                <PlusIcon size={14} />
              </ActionIcon>
              <Link
                to="/tags"
                style={{ textDecoration: "none" }}
                title="Go to tags management page."
              >
                <ActionIcon variant="light" size="xs" color={"gray"}>
                  <ArrowRightIcon size={14} />
                </ActionIcon>
              </Link>
            </Group>
            <Group w="100%">
              <SuggestTags
                onSelect={handleSuggestedTagSelect}
                omit={appliedTags.map((tag) => tag.id.toString())}
                placeholder="Search for a tag..."
                limit={10}
              />
            </Group>
          </Stack>
        )}
      </Stack>
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
    </Container>
  );
}
