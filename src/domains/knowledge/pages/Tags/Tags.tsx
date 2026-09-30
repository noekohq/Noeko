import {
  Button,
  Grid,
  Group,
  Text,
  TextInput,
  Title,
  ActionIcon,
  Modal,
  Stack,
  Textarea,
  HoverCard,
  Blockquote,
  Tooltip,
} from "@mantine/core";
import { ITag, ITagForm } from "../../../../../shared/types/tags";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import useFetch from "@core/hooks/useFetch";
import { useForm } from "@mantine/form";
import React, { useState, useMemo } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  TrashIcon,
  PencilIcon,
  FloppyDiskIcon,
  XIcon,
  PlusIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  TagIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@phosphor-icons/react";
import Content from "@core/design/components/Layout/Content";
import useRabbithole from "@domains/rabbitholes/hooks/useRabbithole";
import TagCard from "@domains/knowledge/components/Tags/TagCard";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import PaperInput from "@core/design/components/Paper/PaperInput";
import PaperIcon from "@core/design/components/Paper/PaperIcon";
import PaperSelect from "@core/design/components/Paper/PaperSelect";
import styles from "./Tags.module.scss";

type TagSortField = "name" | "createdAt" | "updatedAt";
type TagSortDirection = "asc" | "desc";

const sortOptions = [
  { value: "name", label: "Name" },
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
];

export default function Tags() {
  const { i18n } = useLingui();
  const {
    data: tags,
    loading,
    load: loadTags,
  } = useFetch<undefined, ITag[]>({
    url: "/tags",
    runOnMount: true,
  });

  const [filterQuery, setFilterQuery] = useState("");
  const [sortField, setSortField] = useState<TagSortField>("name");
  const [sortDirection, setSortDirection] = useState<TagSortDirection>("asc");

  // Assumes useForm is imported from '@mantine/form'
  // Assumes ITagForm is imported from the models
  const tagForm = useForm<Partial<ITagForm>>({
    initialValues: {
      name: "",
      description: "",
      color: "", // Added color field
    },
    validate: {
      name: (value) => (!value ? i18n._(t`Tag name is required`) : null),
      color: (value) => {
        // Added color validation
        if (value && value.trim() !== "" && !/^#([0-9A-Fa-f]{3}){1,2}$/.test(value)) {
          return i18n._(t`Must be a valid hex color (e.g., #RRGGBB or #RGB)`);
        }
        return null;
      },
    },
  });

  const { isDownRabbithole, includeThing } = useRabbithole();

  const {
    load: createTag,
    loading: createTagLoading,
    errors: createTagErrors,
  } = useFetch<Partial<ITagForm>, ITag>({
    // Assumes ITagForm is imported, ITag is already imported
    url: "/tags",
    method: "POST",
    body: {
      ...tagForm.getTransformedValues(),
    },
    onSuccess: (data) => {
      loadTags();
      tagForm.reset();
      if (isDownRabbithole) {
        includeThing(data.id.toString());
      }
      setAddingTag(false);
      setFilterQuery(data.name);
    },
    onError: (error) => {
      console.error("Failed to create tag:", error);
      // Error messages are automatically populated in createTagErrors by useFetch
    },
  });

  const handleCreateTagSubmit = async () => {
    try {
      await createTag();
    } catch (error) {
      console.error("Error creating tag: ", error);
    }
  };

  const filteredTags = useMemo(() => {
    if (!tags) return [];
    const query = filterQuery.toLowerCase();
    const matchingTags = filterQuery.trim()
      ? tags.filter(
          (tag) =>
            tag.name.toLowerCase().includes(query) ||
            (tag.description && tag.description.toLowerCase().includes(query))
        )
      : [...tags];

    const multiplier = sortDirection === "asc" ? 1 : -1;
    return matchingTags.sort((a, b) => {
      if (sortField === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      }

      const firstDate = a[sortField] ? new Date(a[sortField]).getTime() : 0;
      const secondDate = b[sortField] ? new Date(b[sortField]).getTime() : 0;
      return (firstDate - secondDate) * multiplier;
    });
  }, [tags, filterQuery, sortDirection, sortField]);

  const [addingTag, setAddingTag] = useState(false);

  return (
    <>
      <PageWrapper>
        <TopBar />
        <LeftSidebar />
        <Content>
<<<<<<< HEAD
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                <Title>
                  <Trans>Your tags</Trans>
                </Title>
                <ActionIcon
                  variant="light"
                  color="gray"
                  onClick={() => {
                    setAddingTag(true);
                  }}
                >
                  <PlusIcon weight="bold" />
                </ActionIcon>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                placeholder={i18n._(t`Filter tags by name or description`)}
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.currentTarget.value)}
                mb="md" // Added margin bottom for spacing
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              {loading && (
=======
          <div className={styles.tags}>
            <Stack gap="xl">
              <Stack gap="md" className={styles.header}>
                <Group justify="space-between" gap="xl" className={styles.titleRow}>
                  <Stack gap="sm">
                    <Title order={1} className={styles.title}>
                      Your tags
                    </Title>
                    <Text className={styles.intro}>
                      A shared vocabulary for your knowledge. Clear descriptions help Noeko surface
                      the right tags and ideas in both directions.
                    </Text>
                  </Stack>
                  <Button
                    className={styles.createButton}
                    leftSection={<PlusIcon weight="bold" />}
                    onClick={() => setAddingTag(true)}
                  >
                    New tag
                  </Button>
                </Group>
                <Group justify="space-between" wrap="wrap" className={styles.controls}>
                  <PaperInput
                    className={styles.search}
                    leftSection={<MagnifyingGlassIcon />}
                    aria-label="Filter tags"
                    placeholder="Search names and descriptions..."
                    value={filterQuery}
                    onChange={(event) => setFilterQuery(event.currentTarget.value)}
                  />
                  <Text size="xs" fw={650} className={styles.count}>
                    {filterQuery.trim()
                      ? `${filteredTags.length} of ${tags?.length ?? 0} tags`
                      : `${tags?.length ?? 0} ${(tags?.length ?? 0) === 1 ? "tag" : "tags"}`}
                  </Text>
                </Group>
              </Stack>

              {loading ? (
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466
                <Text size="sm" c="dimmed">
                  <Trans>Loading tags...</Trans>
                </Text>
              ) : filteredTags.length > 0 ? (
                <Stack gap="xs">
                  <Group justify="space-between" className={styles.listHeader}>
                    <Text size="xs" fw={700} className={styles.eyebrow}>
                      Name &amp; meaning
                    </Text>
                    <Group gap="xs" wrap="nowrap" className={styles.sortControls}>
                      <Text size="xs" c="dimmed" className={styles.sortLabel}>
                        Sort by
                      </Text>
                      <div className={styles.sortSelect}>
                        <PaperSelect
                          data={sortOptions}
                          value={sortField}
                          onChange={(value) => {
                            const nextField = value as TagSortField;
                            setSortField(nextField);
                            setSortDirection(nextField === "name" ? "asc" : "desc");
                          }}
                        />
                      </div>
                      <Tooltip
                        label={sortDirection === "asc" ? "Ascending" : "Descending"}
                        withArrow
                      >
                        <div>
                          <PaperIcon
                            aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
                            withBorder
                            onClick={() =>
                              setSortDirection((direction) =>
                                direction === "asc" ? "desc" : "asc"
                              )
                            }
                          >
                            {sortDirection === "asc" ? (
                              <ArrowUpIcon weight="bold" />
                            ) : (
                              <ArrowDownIcon weight="bold" />
                            )}
                          </PaperIcon>
                        </div>
                      </Tooltip>
                    </Group>
                  </Group>
                  <div className={styles.tagList}>
                    {filteredTags.map((tag) => (
                      <TagItem key={tag.id.toString()} tag={tag} onTagUpdated={loadTags} />
                    ))}
                  </div>
                </Stack>
              ) : (
                <div className={styles.emptyState}>
                  <Stack gap="sm" maw={360}>
                    <div className={styles.emptyIcon}>
                      <TagIcon size={24} weight="fill" />
                    </div>
                    <Text fw={650}>{filterQuery.trim() ? "No matching tags" : "No tags yet"}</Text>
                    <Text size="sm" c="dimmed">
                      {filterQuery.trim()
                        ? "Try a different name or phrase."
                        : "Create a tag to begin shaping your workspace vocabulary."}
                    </Text>
                    {!filterQuery.trim() && (
                      <Button variant="subtle" onClick={() => setAddingTag(true)}>
                        Create your first tag
                      </Button>
                    )}
                  </Stack>
                </div>
              )}

              {createTagErrors.length > 0 && (
                <Text c="red" size="sm">
                  {createTagErrors.join(", ")}
                </Text>
              )}
            </Stack>
          </div>
        </Content>
        <Nav />
        <RightSidebar />
      </PageWrapper>
      <Modal
        opened={addingTag}
        onClose={() => {
          setAddingTag(false);
        }}
        title={i18n._(t`Add a tag`)}
      >
        <Grid>
          <Grid.Col span={12}>
            <TextInput
              label={t`Name`}
              placeholder={t`Name your tag...`}
              {...tagForm.getInputProps("name")}
              required
            />
          </Grid.Col>
          <Grid.Col>
            <Textarea
              label={
                <Group align="center" gap="2px">
                  <Text size="sm">
                    <Trans>Description</Trans>
                  </Text>
                  <HoverCard width="300px" radius="lg">
                    <HoverCard.Target>
                      <ActionIcon size="xs" radius="lg" variant="subtle" color="gray">
                        <InfoIcon size={14} />
                      </ActionIcon>
                    </HoverCard.Target>
                    <HoverCard.Dropdown>
                      <Stack gap="xs">
                        <Text size="sm" mb="sm">
                          <Trans>
                            The better the description, the better the system will be at suggesting
                            tag applications. More detail will mean more specific suggestions.
                          </Trans>
                        </Text>
                        <Text fw="bold" size="sm">
                          <Trans>Good Description</Trans>
                        </Text>
                        <Blockquote p="xs" color="gray">
                          <Text size="sm">
                            <Trans>Fleetingness. The quality of being fleeting or transient.</Trans>
                          </Text>
                        </Blockquote>
                        <Text fw="bold" size="sm">
                          <Trans>Better Description</Trans>
                        </Text>
                        <Blockquote p="xs" color="gray">
                          <Text size="sm">
                            <Trans>
                              The concept of fleetiness. It represents a momentary, ephemeral
                              experience, like a spark of inspiration that fades, a dream upon
                              waking, or the brief scent of rain on hot pavement.
                            </Trans>
                          </Text>
                        </Blockquote>
                      </Stack>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </Group>
              }
              placeholder={t`Describe the meaning of your tag...`}
              minRows={3}
              autosize
              {...tagForm.getInputProps("description")}
            />
          </Grid.Col>
          <Grid.Col>
            <Group justify="end" align="center">
              <ActionIcon
                variant="light"
                onClick={() => {
                  const { hasErrors } = tagForm.validate(); // Run validation to display errors
                  if (!hasErrors) {
                    handleCreateTagSubmit();
                  }
                }}
                loading={createTagLoading}
                title={i18n._(t`Add a Tag`)}
                color="blue"
              >
                <PlusIcon weight="bold" />
              </ActionIcon>
            </Group>
          </Grid.Col>
        </Grid>
      </Modal>
    </>
  );
}

interface ITagItemProps {
  tag: ITag;
  onTagUpdated: () => void;
}

const TagItem: React.FC<ITagItemProps> = ({ tag, onTagUpdated }) => {
  const { i18n } = useLingui();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const editForm = useForm<Partial<ITagForm>>({
    initialValues: {
      name: tag.name,
      description: tag.description || "",
    },
    validate: {
      name: (value) => (value?.trim() === "" ? i18n._(t`Tag name is required`) : null),
    },
  });

  const {
    load: updateTag,
    loading: updateTagLoading,
    errors: updateTagErrors,
  } = useFetch<Partial<ITagForm>, ITag>({
    url: `/tags/${tag.id.toString()}`,
    method: "PUT",
    body: editForm.getTransformedValues(),
    dependencies: [editForm],
    onSuccess: (_data) => {
      onTagUpdated();
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Failed to update tag:", error);
    },
  });

  const {
    load: deleteTag,
    loading: deleteTagLoading,
    errors: deleteTagErrors,
  } = useFetch<undefined, undefined>({
    url: `/tags/${tag.id.toString()}`,
    method: "DELETE",
    onSuccess: () => {
      onTagUpdated();
      setDeleteModalOpened(false);
    },
    onError: (error) => {
      console.error("Failed to delete tag:", error);
    },
  });

  const handleSave = async () => {
    const validationResult = editForm.validate();
    if (validationResult.hasErrors) {
      return;
    }

    const currentValues = editForm.getTransformedValues();
    const valuesToUpdate: Partial<ITagForm> = {};

    if (currentValues.name !== tag.name) {
      valuesToUpdate.name = currentValues.name;
    }
    if (currentValues.description !== (tag.description || "")) {
      valuesToUpdate.description = currentValues.description;
    }
    if (Object.keys(valuesToUpdate).length > 0) {
      await updateTag();
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    editForm.reset();
    setIsEditing(false);
  };

  const openDeleteModal = () => {
    setDeleteModalOpened(true);
  };
  const closeDeleteModal = () => {
    setDeleteModalOpened(false);
  };

  const handleDeleteConfirm = async () => {
    await deleteTag();
  };

  if (isEditing) {
    return (
      <div className={styles.editRow}>
        <Stack gap="sm">
          <TextInput label="Name" size="sm" {...editForm.getInputProps("name")} required />
          <Textarea
            label="Description"
            size="sm"
            minRows={2}
            autosize
            {...editForm.getInputProps("description")}
          />
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="filled"
              onClick={handleSave}
              loading={updateTagLoading}
              title={i18n._(t`Save Tag`)}
            >
              <FloppyDiskIcon weight="bold" />
            </ActionIcon>
            <ActionIcon
              variant="outline"
              color="gray"
              onClick={handleCancel}
              title={i18n._(t`Cancel Edit`)}
            >
              <XIcon weight="bold" />
            </ActionIcon>
          </Group>
          {updateTagErrors.length > 0 && (
            <Text c="red" size="xs" mt="xs">
              {updateTagErrors.join(", ")}
            </Text>
          )}
        </Stack>
      </div>
    );
  }

  return (
    <>
      <TagCard
        tag={tag}
        variant="index"
        actions={[
          {
            id: "delete",
            label: i18n._(t`Delete`),
            onClick: (e) => {
              e.stopPropagation();
              openDeleteModal();
            },
            icon: <TrashIcon />,
            color: "red",
          },
          {
            id: "update",
            label: i18n._(t`Update`),
            onClick: (e) => {
              e.stopPropagation();
              setIsEditing(true);
            },
            icon: <PencilIcon />,
            color: "blue",
          },
        ]}
      />
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title={i18n._(t`Delete Tag: "${tag.name}"`)}
        centered
      >
        <Text size="sm">
          <Trans>Are you sure you want to delete this tag? This action cannot be undone.</Trans>
        </Text>
        {deleteTagErrors.length > 0 && (
          <Text c="red" size="xs" mt="sm">
            {i18n._(t`Failed to delete tag: ${deleteTagErrors.join(", ")}`)}
          </Text>
        )}
        <Group mt="lg" justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>
            <Trans>Cancel</Trans>
          </Button>
          <Button color="red" onClick={handleDeleteConfirm} loading={deleteTagLoading}>
            <Trans>Delete Tag</Trans>
          </Button>
        </Group>
      </Modal>
    </>
  );
};
