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
  Badge,
  ColorInput,
  ColorSwatch, // Added ColorInput
} from "@mantine/core";
import { ITag, ITagForm } from "../../../app/database/models/tag";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import useFetch from "../../hooks/useFetch"; // Adjust the import path as needed
import { useForm } from "@mantine/form";
import React, { useState, useMemo } from "react"; // Added React, useState, and useMemo
import { Plus, PencilSimple, FloppyDisk, X } from "@phosphor-icons/react"; // Added new icons
import Tag from "../../components/Tags/Tag";

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
      <Container w="100%" pt="lg">
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
          {/* Display errors below the table */}
          {createTagErrors.length > 0 && (
            <Grid.Col span={12}>
              <Text c="red" size="sm" mt="sm">
                {createTagErrors.join(", ")}
              </Text>
            </Grid.Col>
          )}
        </Grid>
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}

// Define TagRowProps interface and TagRow component below the Tags component
interface TagRowProps {
  tag: ITag;
  onTagUpdated: () => void;
}

const TagRow: React.FC<TagRowProps> = ({ tag, onTagUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const editForm = useForm<Partial<ITagForm>>({
    // Use Partial<ITagForm> for flexibility
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
    dependencies: [editForm], // This should be editForm.values or specific fields if you want to control re-fetch more precisely
    onSuccess: (data) => {
      onTagUpdated(); // This will trigger loadTags in the parent
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Failed to update tag:", error);
      // Errors are in updateTagErrors and can be displayed
    },
  });

  const handleSave = async () => {
    const validationResult = editForm.validate();
    if (validationResult.hasErrors) {
      return;
    }

    const currentValues = editForm.getTransformedValues();
    const valuesToUpdate: Partial<ITagForm> = {};

    // Only include changed values to send in the PUT request
    if (currentValues.name !== tag.name) {
      valuesToUpdate.name = currentValues.name;
    }
    if (currentValues.description !== (tag.description || "")) {
      valuesToUpdate.description = currentValues.description;
    }

    // If valuesToUpdate is empty, it means no actual changes were made to be saved
    // However, useFetch body is already set to editForm.getTransformedValues()
    // We trigger updateTag which will send the current form values regardless
    // Consider changing the logic to only call updateTag if Object.keys(valuesToUpdate).length > 0
    // and then pass valuesToUpdate as the body. For now, it sends all fields on save.
    if (Object.keys(valuesToUpdate).length > 0) {
      await updateTag(); // This will use the body defined in useFetch, which is fine
    } else {
      setIsEditing(false); // No changes, just exit edit mode
    }
  };

  const handleCancel = () => {
    editForm.reset(); // Resets to initialValues defined in useForm for this row
    setIsEditing(false);
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
              color="green"
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
    <Table.Tr>
      <Table.Td>
        <Tag tag={tag} />
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
          {/* Placeholder for Delete ActionIcon: <ActionIcon variant="subtle" color="red" onClick={handleDelete} title="Delete Tag"><Trash /></ActionIcon> */}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
};
