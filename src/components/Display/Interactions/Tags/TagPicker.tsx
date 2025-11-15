import { useState, useEffect } from "react";
import styles from "./TagPicker.module.scss";
import {
  Popover,
  Textarea,
  Button,
  Stack,
  Text,
  TextInput,
  ScrollArea,
  Box,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { XIcon, PlusIcon } from "@phosphor-icons/react";
import { ITag } from "../../../../../app/database/models/tag"; // Adjust path as needed
import useFetch from "../../../../hooks/useFetch"; // Adjust path
import { useDisclosure } from "@mantine/hooks";
import PaperButton from "../../Paper/PaperButton"; // Assuming you have this
import { PaperSelection, usePaperSelection } from "../../Paper/PaperSelection";
import PaperTag from "../../Paper/Tags/PaperTag";

// --- Extracted Create Form ---
// This form component uses the context to get the default name.
function TagCreateForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: {
    name: string;
    description: string;
    color: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}) {
  // Pull the current search query from the context
  const { searchQuery } = usePaperSelection();

  const form = useForm({
    initialValues: {
      name: searchQuery,
      description: "",
      color: "", // You can add your color picker logic here
    },
  });

  // Sync defaultName to form *only when it changes*
  // This updates the form if the user types *after* clicking "create"
  // and then flips back and forth.
  useEffect(() => {
    form.setFieldValue("name", searchQuery);
  }, [searchQuery]);

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="xs">
        <TextInput
          placeholder="Name"
          {...form.getInputProps("name")}
          data-autofocus
        />
        <Textarea
          placeholder="Short description (required)"
          autosize
          minRows={2}
          maxRows={4}
          {...form.getInputProps("description")}
        />
        <Button type="submit" fullWidth loading={isSubmitting} size="xs">
          Create & Apply
        </Button>
      </Stack>
    </form>
  );
}

// --- Main TagPicker Component ---
interface TagPickerProps {
  onSelectExisting: (tag: ITag) => void;
  onCreateNew: (
    name: string,
    description: string,
    color: string,
  ) => Promise<void>;
  omitIds?: string[];
}

export function TagPicker({
  onSelectExisting,
  onCreateNew,
  omitIds = [],
}: TagPickerProps) {
  const [opened, { open, close, toggle }] = useDisclosure(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleClose = () => {
    close();
    setSearchQuery("");
  };

  const { data: suggestions, loading } = useFetch<undefined, ITag[]>({
    url: "/search/tags/suggest",
    method: "GET",
    query: { query: searchQuery, limit: "5" },
    runOnDependencies: [searchQuery],
  });

  const filteredSuggestions = (suggestions || []).filter(
    (t) => !omitIds.includes(t.id.toString()),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleCreateSubmit = async (values: {
    name: string;
    description: string;
    color: string;
  }) => {
    setIsSubmitting(true);
    try {
      await onCreateNew(values.name, values.description, values.color);
      handleClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover
      opened={opened}
      onChange={handleClose}
      position="bottom-start"
      withArrow
      shadow="md"
      width={320}
      trapFocus
    >
      <Popover.Target>
        <div>
          <PaperButton
            leftSection={opened ? <XIcon size={14} /> : <PlusIcon size={14} />}
            onClick={toggle}
          >
            {opened ? "Cancel" : "Add Tag"}
          </PaperButton>
        </div>
      </Popover.Target>

      <Popover.Dropdown p="xs">
        <PaperSelection
          onSearch={setSearchQuery}
          onClear={() => setSearchQuery("")}
          onClose={handleClose}
          isLoading={loading}
          formPrompt={(q) => `Add "${q}"`}
        >
          <PaperSelection.Menu>
            <ScrollArea.Autosize mah={200} type="scroll">
              <Stack gap="xs">
                {filteredSuggestions.length === 0 ||
                  (searchQuery.length <= 1 && searchQuery.trim() === "" && (
                    <Text c="dimmed" size="xs" ta="left" py="sm">
                      Type to search...
                    </Text>
                  ))}
                {searchQuery.length > 0 && filteredSuggestions.length === 0 && (
                  <Text c="dimmed" size="xs" ta="left" py="sm">
                    No results found.
                  </Text>
                )}
                {searchQuery.length > 0 && filteredSuggestions.length > 0 && (
                  <Group gap="xs" wrap="wrap" align="center" pt="xs">
                    {filteredSuggestions.map((tag) => (
                      <PaperTag
                        key={tag.id.toString()}
                        state="suggested"
                        onApply={() => {
                          onSelectExisting(tag);
                          handleClose();
                        }}
                        tag={tag}
                      />
                    ))}
                  </Group>
                )}
              </Stack>
            </ScrollArea.Autosize>
          </PaperSelection.Menu>

          <PaperSelection.Form title="New Tag">
            <TagCreateForm
              onSubmit={handleCreateSubmit}
              isSubmitting={isSubmitting}
            />
          </PaperSelection.Form>
        </PaperSelection>
      </Popover.Dropdown>
    </Popover>
  );
}
