import { useEffect, useState } from "react";
// 1. Import useDismiss and useInteractions
import {
  useFloating,
  offset,
  flip,
  shift,
  inline,
  autoUpdate,
  useDismiss,
  useInteractions,
} from "@floating-ui/react";
import { ActionIcon, Group, Paper, Tooltip, Transition, Portal } from "@mantine/core";
import { HighlighterIcon, LightbulbIcon } from "@phosphor-icons/react";
import { useSelectionCapability } from "@embedpdf/plugin-selection/react";
import { useZoom } from "@embedpdf/plugin-zoom/react";
import { PdfAnnotationSubtype, Rect } from "@embedpdf/models";
import { useSource } from "@domains/knowledge/pages/Sources/SourceContext";
import { createIdea, createIdeaConnection } from "@/domains/knowledge/utils/ideas";
import { useNavigate } from "react-router";
import { showNotification } from "@mantine/notifications";

interface ISelectionMenuProps {
  pageIndex: number;
  documentId: string;
}

interface ISelectionData {
  text: string;
  rects: Rect[];
  boundingBox: Rect;
}

export default function SelectionMenu({ pageIndex, documentId }: ISelectionMenuProps) {
  const { provides: selections } = useSelectionCapability();
  const { state: zoomState } = useZoom(documentId);
  const {
    sourceId,
    excerpts: { create: createExcerpt },
  } = useSource();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [selectionData, setSelectionData] = useState<ISelectionData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const scale = zoomState.currentZoomLevel;

  // 2. Extract context and add onOpenChange for state synchronization
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      // When Floating UI detects an outside click or Escape key, it calls this
      if (!open) {
        selections?.clear();
        setIsOpen(false);
        setSelectionData(null);
      }
    },
    placement: "top",
    elements: { reference: anchorEl },
    whileElementsMounted: autoUpdate,
    middleware: [inline(), offset(8), flip(), shift({ padding: 8 })],
  });

  // 3. Register the dismiss interaction
  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    if (!selections) return;

    const handleSelectionEnd = () => {
      const formatted = selections.getFormattedSelection();
      const pageSelection = formatted.find((f) => f.pageIndex === pageIndex);

      if (pageSelection) {
        selections.getSelectedText().wait(
          (textResult) => {
            const text = textResult.join("");
            if (!text.trim()) return;
            setSelectionData({
              text,
              rects: pageSelection.segmentRects,
              boundingBox: pageSelection.rect,
            });
            setIsOpen(true);
          },
          (err) => {
            console.error("Failed to extract text from selection", err);
            setIsOpen(false);
          }
        );
      } else {
        setIsOpen(false);
        setSelectionData(null);
      }
    };

    // 4. Ensure engine clears trigger our UI to close (e.g. clicking empty page space)
    const handleSelectionChange = () => {
      const formatted = selections.getFormattedSelection();
      if (formatted.length === 0) {
        setIsOpen(false);
        setSelectionData(null);
      }
    };

    const unsubscribeEnd = selections.onEndSelection(handleSelectionEnd);
    const unsubscribeChange = selections.onSelectionChange(handleSelectionChange);

    return () => {
      setIsOpen(false);
      if (typeof unsubscribeEnd === "function") unsubscribeEnd();
      if (typeof unsubscribeChange === "function") unsubscribeChange();
    };
  }, [selections, pageIndex]);

  const handleHighlight = async () => {
    if (!selectionData) return;
    setIsProcessing(true);

    try {
      const metadata = {
        pageIndex,
        type: PdfAnnotationSubtype.HIGHLIGHT,
        segmentRects: selectionData.rects,
        rect: selectionData.boundingBox,
      };

      await createExcerpt({
        sourceText: selectionData.text,
        note: "",
        pdfMetadata: { pageIndex, data: metadata },
      });

      selections?.clear();
      setIsOpen(false);
      setSelectionData(null);
    } catch (error) {
      console.error("Failed to create highlight:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const [creatingIdea, setCreatingIdea] = useState(false);
  const handleMakeIdea = async () => {
    setCreatingIdea(true);
    selections?.clear();
    setIsOpen(false);
    setSelectionData(null);
    const idea = await createIdea({
      title: "",
      content: `
      <blockquote>
        ${selectionData?.text}
      </blockquote>
      `,
    });
    if (idea) {
      await createIdeaConnection(sourceId, idea.id.toString());
      navigate(`/idea/${idea.id.toString()}`);
      setCreatingIdea(false);
      return;
    }
    console.error("Failed to create idea from excerpt.");
    showNotification({
      message: "Something went wrong creating the idea.",
      color: "red",
    });
    setCreatingIdea(false);
  };

  return (
    <>
      {selectionData && (
        <div
          ref={setAnchorEl}
          style={{
            position: "absolute",
            left: selectionData.boundingBox.origin.x * scale,
            top: selectionData.boundingBox.origin.y * scale,
            width: selectionData.boundingBox.size.width * scale,
            height: selectionData.boundingBox.size.height * scale,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      <Portal>
        <Transition mounted={isOpen} transition="pop" duration={150}>
          {(transitionStyles) => (
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                zIndex: 50,
              }}
              // 5. Spread interaction props onto the floating container
              {...getFloatingProps()}
            >
              <div style={transitionStyles}>
                <Paper shadow="md" radius="md" p="xs" withBorder>
                  <Group gap="xs">
                    <Tooltip label="Highlight & Extract Quote" withArrow withinPortal>
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={handleHighlight}
                        loading={isProcessing}
                      >
                        <HighlighterIcon weight="fill" />
                      </ActionIcon>
                    </Tooltip>

                    <Tooltip label="Make this an idea" withArrow withinPortal>
                      <ActionIcon
                        variant="light"
                        color="grape"
                        onClick={handleMakeIdea}
                        disabled={isProcessing}
                        loading={creatingIdea}
                      >
                        <LightbulbIcon weight="fill" />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Paper>
              </div>
            </div>
          )}
        </Transition>
      </Portal>
    </>
  );
}
