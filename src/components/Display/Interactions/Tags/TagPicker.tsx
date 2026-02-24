import { useState, useEffect } from "react";
import styles from "./TagPicker.module.scss";
import { Popover, Textarea, Button, Stack, Text, TextInput, Group } from "@mantine/core";
import { useForm } from "@mantine/form";
import { XIcon, PlusIcon, ArrowBendDownLeftIcon } from "@phosphor-icons/react";
import { ITag } from "../../../../../shared/types/tags";
import useFetch from "@core/hooks/useFetch";
import { useDisclosure } from "@mantine/hooks";
import PaperButton from "@core/design/components/Paper/PaperButton";
import { PaperSelection, usePaperSelection } from "@core/design/components/Paper/PaperSelection";
import PaperTag from "@core/design/components/Paper/Tags/PaperTag";
import { useLayout } from "@/contexts/LayoutContext";
import PaperDrawer from "@core/design/components/Paper/PaperDrawer";

interface TagPickerProps {
  onSelectExisting: (tag: ITag) => void;
  onCreateNew?: (name: string, description: string, color: string) => Promise<void>;
  omitIds?: string[];
  initialSuggestions?: ITag[];
  allowCreation?: boolean;
}

export function TagPickerContent({
  onSelectExisting,
  onCreateNew,
  omitIds = [],
  initialSuggestions,
  allowCreation = true,
  onClose,
}: TagPickerProps & { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleClose = () => {
    onClose();
    setSearchQuery("");
  };

  const { data: suggestions, loading } = useFetch<undefined, ITag[]>({
    url: "/search/tags/suggest",
    method: "GET",
    query: { query: searchQuery, limit: "5" },
    runOnDependencies: [searchQuery],
  });

  const filteredSuggestions = (suggestions || []).filter((t) => !omitIds.includes(t.id.toString()));

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (values: {
    name: string;
    description: string;
    color: string;
  }) => {
    if (!onCreateNew) return;

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

  const isSearching = searchQuery.trim().length > 0;
  const hasInitialSuggestions = initialSuggestions && initialSuggestions.length > 0;
  const hasFilteredSuggestions = filteredSuggestions.length > 0;

  const showInitialSuggestions = !isSearching && hasInitialSuggestions;
  const showTypeToSearch = !isSearching && !hasInitialSuggestions;
  const showFilteredSuggestions = isSearching && hasFilteredSuggestions;
  const showNoResults = isSearching && !hasFilteredSuggestions;

  const renderSuggestions = (tags: ITag[]) => (
    <Group gap="xs" wrap="wrap" align="center" pt="xs">
      {tags.map((tag) => (
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
  );

  return (
    <PaperSelection
      onSearch={setSearchQuery}
      onClear={() => setSearchQuery("")}
      onClose={handleClose}
      isLoading={loading}
      formPrompt={(q) => `Add "${q}"`}
      placeholder={allowCreation ? "Find or create..." : "Find a tag..."}
      allowCreation={allowCreation}
    >
      <PaperSelection.Menu>
        {showInitialSuggestions && initialSuggestions && renderSuggestions(initialSuggestions)}

        {showTypeToSearch && (
          <Text c="dimmed" size="xs" ta="left" py="sm">
            Type to search...
          </Text>
        )}

        {showFilteredSuggestions && renderSuggestions(filteredSuggestions)}

        {showNoResults && (
          <Text c="dimmed" size="xs" ta="left" py="sm">
            No results found.
          </Text>
        )}
      </PaperSelection.Menu>

      {/* Only render the creation form if enabled.
        This is useful for 'Filter' contexts where we only want selection.
      */}
      {allowCreation && onCreateNew && (
        <PaperSelection.Form title="New Tag">
          <TagCreateForm onSubmit={handleCreateSubmit} isSubmitting={isSubmitting} />
        </PaperSelection.Form>
      )}
    </PaperSelection>
  );
}

export function TagPicker({
  onSelectExisting,
  onCreateNew,
  omitIds = [],
  initialSuggestions,
  allowCreation = true,
}: TagPickerProps) {
  const { isMobile } = useLayout();

  const [opened, { open, close, toggle }] = useDisclosure(false);

  const handleClose = () => {
    close();
  };

  if (isMobile) {
    return (
      <>
        <PaperButton
          leftSection={
            opened ? <XIcon weight="bold" size={14} /> : <PlusIcon weight="bold" size={14} />
          }
          onClick={toggle}
          size="md"
        >
          {opened ? "Cancel" : "Add Tag"}
        </PaperButton>
        <PaperDrawer title="Add a tag" opened={opened} onClose={handleClose}>
          <TagPickerContent
            onSelectExisting={onSelectExisting}
            onCreateNew={onCreateNew}
            omitIds={omitIds}
            initialSuggestions={initialSuggestions}
            allowCreation={allowCreation}
            onClose={handleClose}
          />
        </PaperDrawer>
      </>
    );
  }

  return (
    <Popover
      opened={opened}
      onChange={handleClose}
      position="bottom-start"
      withArrow
      shadow="md"
      width={400}
      trapFocus
    >
      <Popover.Target>
        <div>
          <PaperButton
            leftSection={
              opened ? <XIcon weight="bold" size={14} /> : <PlusIcon weight="bold" size={14} />
            }
            onClick={toggle}
            size="md"
          >
            {opened ? "Cancel" : "Add Tag"}
          </PaperButton>
        </div>
      </Popover.Target>

      <Popover.Dropdown p="xs">
        <TagPickerContent
          onSelectExisting={onSelectExisting}
          onCreateNew={onCreateNew}
          omitIds={omitIds}
          initialSuggestions={initialSuggestions}
          allowCreation={allowCreation}
          onClose={handleClose}
        />
      </Popover.Dropdown>
    </Popover>
  );
}

function TagCreateForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: { name: string; description: string; color: string }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const { searchQuery } = usePaperSelection();
  const [descriptionVisible, setDescriptionVisible] = useState(false);

  const form = useForm({
    initialValues: {
      name: searchQuery,
      description: "",
      color: "",
    },
  });

  useEffect(() => {
    form.setFieldValue("name", searchQuery);
  }, [searchQuery]);

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="xs">
        <TextInput
          placeholder="Name"
          variant="unstyled"
          {...form.getInputProps("name")}
          size="md"
          data-autofocus
          classNames={{
            root: styles.textRoot,
            input: styles.input,
          }}
        />
        {descriptionVisible ? (
          <Textarea
            placeholder="What does this mean?"
            variant="unstyled"
            autosize
            minRows={3}
            maxRows={4}
            {...form.getInputProps("description")}
            size="md"
            classNames={{
              root: styles.textRoot,
              input: styles.input,
              label: styles.label,
            }}
          />
        ) : (
          <Group justify="flex-end">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => setDescriptionVisible(true)}
              leftSection={<ArrowBendDownLeftIcon weight="bold" />}
            >
              Add description
            </Button>
          </Group>
        )}
        <Button
          type="submit"
          fullWidth
          loading={isSubmitting}
          size="sm"
          radius="lg"
          color="dark.1"
          variant="light"
        >
          Create & Apply
        </Button>
      </Stack>
    </form>
  );
}
