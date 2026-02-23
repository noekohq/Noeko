import { useState, useEffect } from "react";
import styles from "./RabbitholePicker.module.scss";
import { Popover, Button, Stack, Text, TextInput, Group } from "@mantine/core";
import { useForm } from "@mantine/form";
import { XIcon, PlusIcon, RowsIcon } from "@phosphor-icons/react";
import { IRabbithole } from '../../../../../app/database/models/rabbithole';
import useFetch from '@core/hooks/useFetch';
import { useDisclosure } from "@mantine/hooks";
import PaperButton from '@core/design/components/Paper/PaperButton';
import { PaperSelection, usePaperSelection } from '@core/design/components/Paper/PaperSelection';
import { useLayout } from '@/contexts/LayoutContext';
import PaperDrawer from '@core/design/components/Paper/PaperDrawer';
import PaperRabbithole from '@core/design/components/Paper/Rabbitholes/PaperRabbithole';

interface RabbitholePickerProps {
  onSelectExisting: (rabbithole: IRabbithole) => void;
  onCreateNew?: (name: string) => Promise<void>;
  omitIds?: string[];
  initialSuggestions?: IRabbithole[];
  allowCreation?: boolean;
}

export function RabbitholePickerContent({
  onSelectExisting,
  onCreateNew,
  omitIds = [],
  initialSuggestions,
  allowCreation = true,
  onClose,
}: RabbitholePickerProps & { onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleClose = () => {
    onClose();
    setSearchQuery("");
  };

  const { data: suggestions, loading } = useFetch<undefined, IRabbithole[]>({
    url: "/search/rabbitholes/suggest",
    method: "GET",
    query: { query: searchQuery, limit: "5" },
    runOnDependencies: [searchQuery],
  });

  const filteredSuggestions = (suggestions || []).filter((t) => !omitIds.includes(t.id.toString()));

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (values: { name: string }) => {
    if (!onCreateNew) return;

    setIsSubmitting(true);
    try {
      await onCreateNew(values.name);
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

  console.log("Suggestions: ", suggestions);

  const renderSuggestions = (rabbitholes: IRabbithole[]) => (
    <Group gap="xs" wrap="wrap" align="center" pt="xs">
      {rabbitholes.map((rh) => (
        <PaperRabbithole
          key={rh.id.toString()}
          size="xs"
          state="suggested"
          rabbithole={rh}
          onClick={() => {
            onSelectExisting(rh);
            handleClose();
          }}
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
      formPrompt={(q) => `Create "${q}"`}
      placeholder={allowCreation ? "Find or create..." : "Find a rabbithole..."}
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

      {allowCreation && onCreateNew && (
        <PaperSelection.Form title="New Rabbithole">
          <RabbitholeCreateForm onSubmit={handleCreateSubmit} isSubmitting={isSubmitting} />
        </PaperSelection.Form>
      )}
    </PaperSelection>
  );
}

export function RabbitholePicker({
  onSelectExisting,
  onCreateNew,
  omitIds = [],
  initialSuggestions,
  allowCreation = true,
}: RabbitholePickerProps) {
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
          {opened ? "Cancel" : "Add Rabbithole"}
        </PaperButton>
        <PaperDrawer title="Add to Rabbithole" opened={opened} onClose={handleClose}>
          <RabbitholePickerContent
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
            {opened ? "Cancel" : "Add Rabbithole"}
          </PaperButton>
        </div>
      </Popover.Target>

      <Popover.Dropdown p="xs">
        <RabbitholePickerContent
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

function RabbitholeCreateForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (values: { name: string }) => Promise<void>;
  isSubmitting: boolean;
}) {
  const { searchQuery } = usePaperSelection();

  const form = useForm({
    initialValues: {
      name: searchQuery,
    },
  });

  useEffect(() => {
    form.setFieldValue("name", searchQuery);
  }, [searchQuery]);

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap="xs">
        <TextInput
          placeholder="Rabbithole Name"
          variant="unstyled"
          {...form.getInputProps("name")}
          size="md"
          data-autofocus
          classNames={{
            root: styles.textRoot,
            input: styles.input,
          }}
        />

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
