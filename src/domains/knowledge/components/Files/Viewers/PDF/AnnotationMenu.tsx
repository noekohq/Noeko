import { useEffect, useState } from "react";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import { ActionIcon, Group, Paper, Stack, Text, Textarea, Transition, Portal } from "@mantine/core";
import { CheckIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useSource } from "@domains/knowledge/pages/Sources/SourceContext";
import { IExcerpt } from "../../../../../../../shared/types/excerpt";

interface IAnnotationMenuProps {
  activeExcerpt: IExcerpt | null;
  anchorElement: HTMLElement | null;
  onClose: () => void;
}

export default function AnnotationMenu({
  activeExcerpt,
  anchorElement,
  onClose,
}: IAnnotationMenuProps) {
  const {
    excerpts: { edit: updateExcerpt, delete: deleteExcerpt },
  } = useSource();

  const [noteText, setNoteText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const isOpen = !!activeExcerpt && !!anchorElement;

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: "top",
    elements: { reference: anchorElement },
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  // 1. DELETE the rogue if-statement here

  // 2. ADD this useEffect block:
  useEffect(() => {
    if (activeExcerpt) {
      // We only overwrite the local note text state when the active excerpt actually changes
      setNoteText(activeExcerpt.note || "");
    }
  }, [activeExcerpt?.id]); // Note the dependency is specifically the ID

  const handleUpdate = async () => {
    if (!activeExcerpt) return;
    setIsUpdating(true);
    try {
      await updateExcerpt(activeExcerpt.id, { note: noteText });
      onClose();
    } catch (err) {
      console.error("Failed to update note", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!activeExcerpt) return;
    onClose();
    await deleteExcerpt(activeExcerpt.id);
  };

  useEffect(() => {
    console.log("Note text: ", noteText);
  }, [noteText]);

  return (
    <Portal>
      <Transition mounted={isOpen} transition="pop" duration={150}>
        {(transitionStyles) => (
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              zIndex: 55,
            }}
          >
            <div style={transitionStyles}>
              <Paper
                shadow="xl"
                radius="md"
                p="sm"
                withBorder
                style={{ width: 300, backgroundColor: "var(--mantine-color-body)" }}
              >
                <Stack gap="sm">
                  <Text size="xs" c="dimmed" lineClamp={3} fs="italic">
                    "{activeExcerpt?.sourceText}"
                  </Text>

                  <Textarea
                    placeholder="Add your thoughts here..."
                    autosize
                    minRows={2}
                    value={noteText}
                    onChange={(e) => {
                      console.log("Value: ", e.currentTarget.value);
                      setNoteText(e.currentTarget.value);
                    }}
                    variant="filled"
                  />

                  <Group justify="space-between">
                    <ActionIcon variant="subtle" color="gray" onClick={onClose}>
                      <XIcon />
                    </ActionIcon>

                    <Group gap="xs">
                      <ActionIcon variant="light" color="red" onClick={handleDelete}>
                        <TrashIcon />
                      </ActionIcon>

                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={handleUpdate}
                        loading={isUpdating}
                        disabled={noteText === activeExcerpt?.note}
                      >
                        <CheckIcon weight="bold" />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Stack>
              </Paper>
            </div>
          </div>
        )}
      </Transition>
    </Portal>
  );
}
