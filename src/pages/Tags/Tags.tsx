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
  Modal, // Added Modal for delete confirmation
} from "@mantine/core";
import { ITag, ITagForm } from "../../../app/database/models/tag";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch"; // Adjust the import path as needed
import { useForm } from "@mantine/form";
import React, { useState, useMemo } from "react"; // Added React, useState, and useMemo
import {
  Plus,
  PencilSimple,
  FloppyDisk,
  X,
  Trash,
  ArrowRight,
} from "@phosphor-icons/react"; // Added new icons, including Trash
import { InlineTag } from "../../components/Display/Tags/TagDisplay";
import { Link } from "react-router";
import styles from "./Tags.module.scss";
import Content from "../../components/UI/Layout/Content";
import useRabbithole from "../../hooks/useRabbithole";
import StatusBar from "../../components/UI/Layout/Bottom";

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
        if (
          value &&
          value.trim() !== "" &&
          !/^#([0-9A-Fa-f]{3}){1,2}$/.test(value)
        ) {
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
    },
    onError: (error) => {
      console.error("Failed to create tag:", error);
      // Error messages are automatically populated in createTagErrors by useFetch
    },
  });

  const handleCreateTagSubmit = async () => {
    await createTag();
  };

  const filteredTags = useMemo(() => {
    if (!tags) return [];
    if (!filterQuery.trim()) return tags;

    const query = filterQuery.toLowerCase();
    return tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(query) ||
        (tag.description && tag.description.toLowerCase().includes(query)) ||
        (tag.color && tag.color.toLowerCase().includes(query)),
    );
  }, [tags, filterQuery]);

  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
        <Grid>
          <Grid.Col span={{ sm: 12 }}>
            <Title>Your tags</Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <TextInput
              placeholder="Filter tags by name, description, or color"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.currentTarget.value)}
              mb="md" // Added margin bottom for spacing
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            {loading && <p>Loading tags...</p>}
            {!!errors.length && <p>Error loading tags: {errors}</p>}
            {/* Always render table structure to include form in header */}
            <Table withRowBorders={false}>
              <Table.Thead>
                {/* Form row for adding new tags */}
                {/* Standard table headers */}
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* Form Row */}
                <Table.Tr>
                  <Table.Td>
                    <TextInput
                      placeholder="New Tag Name"
                      size="xs"
                      {...tagForm.getInputProps("name")}
                      required
                      style={{ flexGrow: 1 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      placeholder="New Tag Description (Optional)"
                      size="xs"
                      {...tagForm.getInputProps("description")}
                      style={{ flexGrow: 1 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="filled"
                      onClick={() => {
                        const { hasErrors } = tagForm.validate(); // Run validation to display errors
                        if (!hasErrors) {
                          // Check the form's hasErrors state after validating
                          handleCreateTagSubmit();
                        }
                      }}
                      loading={createTagLoading}
                      title="Add Tag"
                    >
                      <Plus weight="bold" />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
                {/* Display Existing Tags */}
                {filteredTags &&
                  filteredTags.map((tag) => (
                    <TagRow
                      key={tag.id.toString()}
                      tag={tag}
                      onTagUpdated={loadTags}
                    />
                  ))}
                {/* Display "No tags found" or "No matching tags" */}
                {!loading && filteredTags && filteredTags.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4} style={{ textAlign: "center" }}>
                      {filterQuery.trim() !== ""
                        ? "No tags match your filter."
                        : "No tags found. Add one above!"}
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
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
      <StatusBar />
      <RightSidebar />
    </PageWrapper>
  );
}

interface TagRowProps {
  tag: ITag;
  onTagUpdated: () => void;
}

const TagRow: React.FC<TagRowProps> = ({ tag, onTagUpdated }) => {
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

  const openDeleteModal = () => setDeleteModalOpened(true);
  const closeDeleteModal = () => {
    setDeleteModalOpened(false);
  };

  const handleDeleteConfirm = async () => {
    await deleteTag();
  };

  if (isEditing) {
    return (
      <Table.Tr>
        <Table.Td>
          <TextInput size="xs" {...editForm.getInputProps("name")} required />
        </Table.Td>
        <Table.Td>
          <TextInput size="xs" {...editForm.getInputProps("description")} />
        </Table.Td>
        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="filled"
              onClick={handleSave}
              loading={updateTagLoading}
              title="Save Tag"
            >
              <FloppyDisk weight="bold" />
            </ActionIcon>
            <ActionIcon
              variant="outline"
              color="gray"
              onClick={handleCancel}
              title="Cancel Edit"
            >
              <X weight="bold" />
            </ActionIcon>
          </Group>
          {updateTagErrors.length > 0 && (
            <Text c="red" size="xs" mt="xs">
              {updateTagErrors.join(", ")}
            </Text>
          )}
        </Table.Td>
      </Table.Tr>
    );
  }

  return (
    <React.Fragment>
      <Table.Tr>
        <Table.Td>
          <InlineTag tag={tag} />
        </Table.Td>
        <Table.Td>{tag.description || ""}</Table.Td>
        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="subtle"
              onClick={() => setIsEditing(true)}
              title="Edit Tag"
            >
              <PencilSimple />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={openDeleteModal}
              title="Delete Tag"
            >
              <Trash />
            </ActionIcon>
            <Link to={`/tags/${tag.id.toString()}`}>
              <ActionIcon variant="subtle" title="View Tag">
                <ArrowRight />
              </ActionIcon>
            </Link>
          </Group>
        </Table.Td>
      </Table.Tr>
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title={`Delete Tag: "${tag.name}"`}
        centered
      >
        <Text size="sm">
          Are you sure you want to delete this tag? This action cannot be
          undone.
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
          <Button
            color="red"
            onClick={handleDeleteConfirm}
            loading={deleteTagLoading}
          >
            Delete Tag
          </Button>
        </Group>
      </Modal>
    </React.Fragment>
  );
};
