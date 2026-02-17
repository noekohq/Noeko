import {
  Button,
  Card,
  Container,
  Grid,
  Group,
  Table,
  Text,
  TextInput,
  Title,
  ActionIcon,
  Modal,
  Stack,
  SimpleGrid,
  Textarea,
  HoverCard,
  Blockquote, // Added Modal for delete confirmation
} from "@mantine/core";
import { ITag, ITagForm } from "../../../app/database/models/tag";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch"; // Adjust the import path as needed
import { useForm } from "@mantine/form";
import React, { useState, useMemo } from "react"; // Added React, useState, and useMemo
import {
  TrashIcon,
  PencilIcon,
  FloppyDiskIcon,
  XIcon,
  PlusIcon,
  InfoIcon,
} from "@phosphor-icons/react"; // Added new icons, including Trash
import Content from "../../components/UI/Layout/Content";
import useRabbithole from "../../hooks/useRabbithole";
import StatusBar from "../../components/UI/Layout/Bottom";
import TagCard from "../../components/Display/Tags/TagCard";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";

export default function Tags() {
  const {
    data: tags,
    loading,
    errors,
    load: loadTags,
  } = useFetch<undefined, ITag[]>({
    url: "/tags",
    runOnMount: true,
  });

  const [filterQuery, setFilterQuery] = useState(""); // State for filter query

  // Assumes useForm is imported from '@mantine/form'
  // Assumes ITagForm is imported from the models
  const tagForm = useForm<Partial<ITagForm>>({
    initialValues: {
      name: "",
      description: "",
      color: "", // Added color field
    },
    validate: {
      name: (value) => (!value ? "Tag name is required" : null),
      color: (value) => {
        // Added color validation
        if (value && value.trim() !== "" && !/^#([0-9A-Fa-f]{3}){1,2}$/.test(value)) {
          return "Must be a valid hex color (e.g., #RRGGBB or #RGB)";
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
    if (!filterQuery.trim()) return tags;

    const query = filterQuery.toLowerCase();
    return tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(query) ||
        (tag.description && tag.description.toLowerCase().includes(query))
    );
  }, [tags, filterQuery]);

  const [addingTag, setAddingTag] = useState(false);

  return (
    <>
      <PageWrapper>
        <TopBar />
        <LeftSidebar />
        <Content>
          <Grid>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                <Title>Your tags</Title>
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
                placeholder="Filter tags by name or description"
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.currentTarget.value)}
                mb="md" // Added margin bottom for spacing
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              {loading && (
                <Text size="sm" c="dimmed">
                  Loading tags...
                </Text>
              )}
              <SimpleGrid
                cols={{
                  xs: 1,
                  sm: 2,
                  md: 3,
                }}
              >
                {filteredTags.map((t) => {
                  return <TagItem key={t.id.toString()} tag={t} onTagUpdated={loadTags} />;
                })}
              </SimpleGrid>
            </Grid.Col>
            {createTagErrors.length > 0 && (
              <Grid.Col span={12}>
                <Text c="red" size="sm" mt="sm">
                  {createTagErrors.join(", ")}
                </Text>
              </Grid.Col>
            )}
          </Grid>
        </Content>
        <Nav />
        <RightSidebar />
      </PageWrapper>
      <Modal
        opened={addingTag}
        onClose={() => {
          setAddingTag(false);
        }}
        title="Add a tag"
      >
        <Grid>
          <Grid.Col span={12}>
            <TextInput
              label="Name"
              placeholder="Name your tag..."
              {...tagForm.getInputProps("name")}
              required
            />
          </Grid.Col>
          <Grid.Col>
            <Textarea
              label={
                <Group align="center" gap="2px">
                  <Text size="sm">Description</Text>
                  <HoverCard width="300px" radius="lg">
                    <HoverCard.Target>
                      <ActionIcon size="xs" radius="lg" variant="subtle" color="gray">
                        <InfoIcon size={14} />
                      </ActionIcon>
                    </HoverCard.Target>
                    <HoverCard.Dropdown>
                      <Stack gap="xs">
                        <Text size="sm" mb="sm">
                          The better the description, the better the system will be at suggesting
                          tag applications. More detail will mean more specific suggestions.
                        </Text>
                        <Text fw="bold" size="sm">
                          Good Description
                        </Text>
                        <Blockquote p="xs" color="gray">
                          <Text size="sm">
                            Fleetingness. The quality of being fleeting or transient.
                          </Text>
                        </Blockquote>
                        <Text fw="bold" size="sm">
                          Better Description
                        </Text>
                        <Blockquote p="xs" color="gray">
                          <Text size="sm">
                            The concept of fleetiness. It represents a momentary, ephemeral
                            experience, like a spark of inspiration that fades, a dream upon waking,
                            or the brief scent of rain on hot pavement.
                          </Text>
                        </Blockquote>
                      </Stack>
                    </HoverCard.Dropdown>
                  </HoverCard>
                </Group>
              }
              placeholder="Describe the meaning of your tag..."
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
                title="Add a Tag"
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
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const editForm = useForm<Partial<ITagForm>>({
    initialValues: {
      name: tag.name,
      description: tag.description || "",
    },
    validate: {
      name: (value) => (value?.trim() === "" ? "Tag name is required" : null),
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
    onSuccess: (data) => {
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
      <Grid>
        <Grid.Col>
          <TextInput size="xs" {...editForm.getInputProps("name")} required />
        </Grid.Col>
        <Grid.Col>
          <TextInput size="xs" {...editForm.getInputProps("description")} />
        </Grid.Col>
        <Grid.Col>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="filled"
              onClick={handleSave}
              loading={updateTagLoading}
              title="Save Tag"
            >
              <FloppyDiskIcon weight="bold" />
            </ActionIcon>
            <ActionIcon variant="outline" color="gray" onClick={handleCancel} title="Cancel Edit">
              <XIcon weight="bold" />
            </ActionIcon>
          </Group>
          {updateTagErrors.length > 0 && (
            <Text c="red" size="xs" mt="xs">
              {updateTagErrors.join(", ")}
            </Text>
          )}
        </Grid.Col>
      </Grid>
    );
  }

  return (
    <>
      <TagCard
        tag={tag}
        actions={[
          {
            id: "delete",
            label: "Delete",
            onClick: (e) => {
              e.stopPropagation();
              openDeleteModal();
            },
            icon: <TrashIcon />,
            color: "red",
          },
          {
            id: "update",
            label: "Update",
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
        title={`Delete Tag: "${tag.name}"`}
        centered
      >
        <Text size="sm">
          Are you sure you want to delete this tag? This action cannot be undone.
        </Text>
        {deleteTagErrors.length > 0 && (
          <Text c="red" size="xs" mt="sm">
            Failed to delete tag: {deleteTagErrors.join(", ")}
          </Text>
        )}
        <Group mt="lg" justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteConfirm} loading={deleteTagLoading}>
            Delete Tag
          </Button>
        </Group>
      </Modal>
    </>
  );
};
