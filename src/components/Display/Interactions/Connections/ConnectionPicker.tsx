import { useState, useEffect } from "react";
import { Popover, Text, Stack, TextInput, Textarea, Button, Group } from "@mantine/core";
import { useDisclosure, useDebouncedValue } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { PlusIcon, XIcon, ArrowBendDownLeftIcon } from "@phosphor-icons/react";
import { IConnectable } from "../../../../../app/services/Graph";
import useFetch from "../../../../hooks/useFetch";
import { PaperSelection, usePaperSelection } from "../../Paper/PaperSelection";
import PaperButton from "../../Paper/PaperButton";
import PaperThing from "../../Paper/Things/PaperThing";
import { getThingPropsFromConnectable } from "../../Paper/Things/thingUtils";
import { useLayout } from "../../../../contexts/LayoutContext";
import PaperDrawer from "../../Paper/PaperDrawer";
// Import your creation logic
import { handleCreateIdea } from "../../../../utils/ideas";
import { connect } from "../../../../utils/graph";
import { RecordId } from "surrealdb";

interface ConnectionPickerProps {
  onSelect: (id: string) => Promise<void>;
  omitIds?: string[];
  initialSuggestions?: IConnectable[];
  connectableId?: string;
}

export function ConnectionPicker({
  onSelect,
  omitIds = [],
  connectableId,
  initialSuggestions,
}: ConnectionPickerProps) {
  const { isMobile } = useLayout();
  const [opened, { toggle, close }] = useDisclosure(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(searchQuery, 500);

  const handleClose = () => {
    close();
    setSearchQuery("");
  };

  const { data: suggestions, loading } = useFetch<undefined, IConnectable[]>({
    url: "/search/smartSuggest",
    method: "GET",
    query: { query: debouncedQuery, limit: "5" },
    runOnDependencies: [debouncedQuery],
  });

  const filteredSuggestions = (suggestions || []).filter((t) => !omitIds.includes(t.id.toString()));

  const isSearching = searchQuery.trim().length > 0;
  const hasInitialSuggestions = initialSuggestions && initialSuggestions.length > 0;
  const hasFilteredSuggestions = filteredSuggestions.length > 0;

  const showInitialSuggestions = !isSearching && hasInitialSuggestions;
  const showTypeToSearch = !isSearching && !hasInitialSuggestions;
  const showFilteredSuggestions = isSearching && hasFilteredSuggestions;
  const showNoResults = isSearching && !hasFilteredSuggestions && !loading;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (values: { title: string; content: string }) => {
    setIsSubmitting(true);

    const ideaForm = {
      title: values.title,
      content: values.content,
    };

    await handleCreateIdea(
      ideaForm,
      async (newIdea) => {
        try {
          await onSelect(newIdea.id.toString());
          handleClose();
        } catch (e) {
          console.error("Created but failed to connect", e);
        } finally {
          setIsSubmitting(false);
        }
      },
      (err) => {
        console.error(err);
        setIsSubmitting(false);
      }
    );
  };

  const renderSuggestions = (things: IConnectable[]) => (
    <Group style={{ paddingTop: 8 }} wrap="wrap" gap="xs">
      {things.map((thing) => (
        <PaperThing
          key={thing.id.toString()}
          {...getThingPropsFromConnectable(thing, {
            state: "suggested",
            action: {
              icon: PlusIcon,
              tooltip: "Connect",
              onClick: async (id, e) => {
                e.stopPropagation();
                await onSelect(id);
                handleClose();
              },
            },
          })}
          onClick={async () => {
            await onSelect(thing.id.toString());
            handleClose();
          }}
        />
      ))}
    </Group>
  );

  const paperSelectionContent = (
    <PaperSelection
      onSearch={setSearchQuery}
      onClear={() => setSearchQuery("")}
      onClose={handleClose}
      isLoading={loading}
      formPrompt={(q) => `Create new idea "${q}"`}
    >
      <PaperSelection.Menu>
        {showInitialSuggestions && initialSuggestions && renderSuggestions(initialSuggestions)}

        {showTypeToSearch && (
          <Text c="dimmed" size="xs" ta="left" py="sm">
            Type to search your graph...
          </Text>
        )}

        {showFilteredSuggestions && renderSuggestions(filteredSuggestions)}

        {showNoResults && (
          <Text c="dimmed" size="xs" ta="center" py="md">
            No results found.
          </Text>
        )}
      </PaperSelection.Menu>

      <PaperSelection.Form title="New Connected Note">
        <ConnectionCreateForm onSubmit={handleCreateSubmit} isSubmitting={isSubmitting} />
      </PaperSelection.Form>
    </PaperSelection>
  );

  if (isMobile) {
    return (
      <>
        <PaperButton
          leftSection={opened ? <XIcon weight="bold" /> : <PlusIcon weight="bold" />}
          onClick={toggle}
          size="md"
          withBorder
        >
          {opened ? "Cancel" : "Add Connection"}
        </PaperButton>
        <PaperDrawer title="New Connection" opened={opened} onClose={handleClose}>
          {paperSelectionContent}
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
      width={360}
      trapFocus
    >
      <Popover.Target>
        <div>
          <PaperButton
            leftSection={opened ? <XIcon weight="bold" /> : <PlusIcon weight="bold" />}
            onClick={toggle}
            size="md"
            withBorder
          >
            {opened ? "Cancel" : "Add Connection"}
          </PaperButton>
        </div>
      </Popover.Target>
      <Popover.Dropdown p="xs">{paperSelectionContent}</Popover.Dropdown>
    </Popover>
  );
}

function ConnectionCreateForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: { title: string; content: string }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const { searchQuery } = usePaperSelection();
  const [contentVisible, setContentVisible] = useState(false);

  const form = useForm({
    initialValues: {
      title: searchQuery,
      content: "",
    },
  });

  useEffect(() => {
    if (!form.isDirty("title")) {
      form.setFieldValue("title", searchQuery);
    }
  }, [searchQuery]);

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="xs">
        <TextInput
          placeholder="Title"
          variant="unstyled"
          size="md"
          data-autofocus
          {...form.getInputProps("title")}
          styles={{
            input: { fontWeight: 600 }, // Make it look like a title
          }}
        />

        {contentVisible ? (
          <Textarea
            placeholder="Add some context..."
            variant="unstyled"
            autosize
            minRows={3}
            maxRows={6}
            size="sm"
            {...form.getInputProps("content")}
          />
        ) : (
          <Group justify="flex-start">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => setContentVisible(true)}
              leftSection={<ArrowBendDownLeftIcon weight="bold" />}
              fullWidth={false}
            >
              Add some content
            </Button>
          </Group>
        )}

        <Button
          type="submit"
          fullWidth
          loading={isSubmitting}
          size="sm"
          radius="lg"
          color="gray"
          variant="light"
          mt="xs"
        >
          Create & Connect
        </Button>
      </Stack>
    </form>
  );
}
