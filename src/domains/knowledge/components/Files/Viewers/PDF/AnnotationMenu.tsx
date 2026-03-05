import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOpen = !!activeExcerpt && !!anchorElement;

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: "top",
    elements: { reference: anchorElement },
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  useEffect(() => {
    if (activeExcerpt) {
      setNoteText(activeExcerpt.note || "");
    }
  }, [activeExcerpt?.id]);

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

  const handleFocus = () => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  };

  return (
    <Portal>
      <Transition mounted={isOpen} transition="pop" duration={150} onEntered={handleFocus}>
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
                    ref={textareaRef}
                    autosize
                    minRows={2}
                    value={noteText}
                    onChange={(e) => {
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
