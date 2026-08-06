import {
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { ActionIcon, Group, Paper, Portal, Tooltip, Transition } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { HighlighterIcon, LightbulbIcon } from "@phosphor-icons/react";
import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { IExcerpt, ITextMetadata } from "../../../../../../../shared/types/excerpt";
import { createIdea, createIdeaConnection } from "@domains/knowledge/utils/ideas";
import { useSource } from "@domains/knowledge/pages/Sources/SourceContext";
import AnnotationMenu from "../PDF/AnnotationMenu";
import styles from "./TextExcerptLayer.module.scss";

type IOverlayRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type ISelectionData = {
  text: string;
  metadata: ITextMetadata;
  rect: IOverlayRect;
};

const getTextOffset = (root: HTMLElement, targetNode: Node, targetOffset: number) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node = walker.nextNode();

  while (node) {
    if (node === targetNode) return offset + targetOffset;
    offset += node.textContent?.length || 0;
    node = walker.nextNode();
  }

  return offset;
};

const getTextPoint = (root: HTMLElement, targetOffset: number) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let consumed = 0;
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent?.length || 0;
    if (consumed + length >= targetOffset) {
      return { node, offset: Math.max(0, targetOffset - consumed) };
    }
    consumed += length;
    node = walker.nextNode();
  }

  return null;
};

const createRangeFromMetadata = (root: HTMLElement, metadata: ITextMetadata) => {
  const start = getTextPoint(root, metadata.start);
  const end = getTextPoint(root, metadata.end);
  if (!start || !end) return null;

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    };
    return entities[character];
  });

function SelectionActions({
  selection,
  anchorElement,
  onClose,
}: {
  selection: ISelectionData | null;
  anchorElement: HTMLElement | null;
  onClose: () => void;
}) {
  const {
    sourceId,
    excerpts: { create: createExcerpt },
  } = useSource();
  const navigate = useNavigate();
  const [creatingExcerpt, setCreatingExcerpt] = useState(false);
  const [creatingIdea, setCreatingIdea] = useState(false);

  const isOpen = !!selection && !!anchorElement;
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    placement: "top",
    elements: { reference: anchorElement },
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });
  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    onClose();
  };

  const handleHighlight = async () => {
    if (!selection) return;
    setCreatingExcerpt(true);
    const created = await createExcerpt({
      sourceText: selection.text,
      note: "",
      textMetadata: selection.metadata,
    });
    setCreatingExcerpt(false);

    if (!created) {
      showNotification({
        title: "Couldn't create excerpt",
        message: "The selected text could not be saved.",
        color: "red",
      });
      return;
    }
    clearSelection();
  };

  const handleMakeIdea = async () => {
    if (!selection) return;
    setCreatingIdea(true);
    const idea = await createIdea({
      title: "",
      content: `<blockquote>${escapeHtml(selection.text)}</blockquote>`,
    });

    if (idea) {
      await createIdeaConnection(sourceId, idea.id.toString());
      clearSelection();
      navigate(`/idea/${idea.id.toString()}`);
      return;
    }

    setCreatingIdea(false);
    showNotification({
      title: "Couldn't create idea",
      message: "Something went wrong creating an idea from this excerpt.",
      color: "red",
    });
  };

  return (
    <Portal>
      <Transition mounted={isOpen} transition="pop" duration={150}>
        {(transitionStyles) => (
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, zIndex: 55 }}
            {...getFloatingProps()}
          >
            <div style={transitionStyles}>
              <Paper shadow="md" radius="md" p="xs" withBorder>
                <Group gap="xs">
                  <Tooltip label="Highlight & extract quote" withArrow withinPortal>
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={handleHighlight}
                      loading={creatingExcerpt}
                      aria-label="Highlight and extract quote"
                    >
                      <HighlighterIcon weight="fill" />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Make this an idea" withArrow withinPortal>
                    <ActionIcon
                      variant="light"
                      color="grape"
                      onClick={handleMakeIdea}
                      loading={creatingIdea}
                      disabled={creatingExcerpt}
                      aria-label="Make selection an idea"
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
  );
}

export default function TextExcerptLayer({
  children,
  contentKey,
}: {
  children: ReactNode;
  contentKey: string;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const {
    excerptId,
    excerpts: { all: allExcerpts },
  } = useSource();

  const textExcerpts = useMemo(
    () => allExcerpts.filter((excerpt) => !!excerpt.textMetadata),
    [allExcerpts]
  );
  const [selection, setSelection] = useState<ISelectionData | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<HTMLElement | null>(null);
  const [highlightRects, setHighlightRects] = useState<Record<string, IOverlayRect[]>>({});
  const [activeExcerpt, setActiveExcerpt] = useState<IExcerpt | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<HTMLElement | null>(null);

  const measureHighlights = useCallback(() => {
    const layer = layerRef.current;
    const content = contentRef.current;
    if (!layer || !content) return;

    const layerRect = layer.getBoundingClientRect();
    const nextRects: Record<string, IOverlayRect[]> = {};

    for (const excerpt of textExcerpts) {
      if (!excerpt.textMetadata) continue;
      const range = createRangeFromMetadata(content, excerpt.textMetadata);
      if (!range) continue;

      nextRects[excerpt.id.toString()] = Array.from(range.getClientRects())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => ({
          left: rect.left - layerRect.left,
          top: rect.top - layerRect.top,
          width: rect.width,
          height: rect.height,
        }));
    }

    setHighlightRects(nextRects);
  }, [textExcerpts]);

  useLayoutEffect(() => {
    measureHighlights();
    const layer = layerRef.current;
    if (!layer) return;

    const observer = new ResizeObserver(measureHighlights);
    observer.observe(layer);
    window.addEventListener("resize", measureHighlights);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureHighlights);
    };
  }, [contentKey, measureHighlights]);

  useEffect(() => {
    if (!excerptId) return;
    const excerpt = textExcerpts.find((candidate) => candidate.id.toString() === excerptId);
    const anchor = document.getElementById(`text-excerpt-${excerptId}-0`);
    if (!excerpt || !anchor) return;

    anchor.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveExcerpt(excerpt);
    setActiveAnchor(anchor);
  }, [excerptId, highlightRects, textExcerpts]);

  const handleSelection = () => {
    const content = contentRef.current;
    const layer = layerRef.current;
    const browserSelection = window.getSelection();
    if (!content || !layer || !browserSelection || browserSelection.rangeCount === 0) return;

    const range = browserSelection.getRangeAt(0);
    if (range.collapsed || !content.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    const rawText = range.toString();
    const text = rawText.trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const leadingWhitespace = rawText.length - rawText.trimStart().length;
    const trailingWhitespace = rawText.length - rawText.trimEnd().length;
    const start =
      getTextOffset(content, range.startContainer, range.startOffset) + leadingWhitespace;
    const end = getTextOffset(content, range.endContainer, range.endOffset) - trailingWhitespace;
    const fullText = content.textContent || "";
    const selectionRect = range.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();

    setSelection({
      text,
      metadata: {
        start,
        end,
        quote: text,
        prefix: fullText.slice(Math.max(0, start - 32), start),
        suffix: fullText.slice(end, end + 32),
      },
      rect: {
        left: selectionRect.left - layerRect.left,
        top: selectionRect.top - layerRect.top,
        width: selectionRect.width,
        height: selectionRect.height,
      },
    });
  };

  return (
    <div className={styles.layer} ref={layerRef}>
      <div ref={contentRef} onMouseUp={handleSelection}>
        {children}
      </div>

      {Object.entries(highlightRects).flatMap(([excerptId, rects]) => {
        const excerpt = textExcerpts.find((candidate) => candidate.id.toString() === excerptId);
        if (!excerpt) return [];

        return rects.map((rect, index) => (
          <button
            type="button"
            key={`${excerptId}-${index}`}
            id={index === 0 ? `text-excerpt-${excerptId}-0` : undefined}
            className={styles.highlight}
            style={rect}
            aria-label={`Open excerpt: ${excerpt.sourceText}`}
            onClick={(event) => {
              setActiveExcerpt(excerpt);
              setActiveAnchor(event.currentTarget);
            }}
          />
        ));
      })}

      {selection && (
        <span ref={setSelectionAnchor} className={styles.selectionAnchor} style={selection.rect} />
      )}

      <SelectionActions
        selection={selection}
        anchorElement={selectionAnchor}
        onClose={() => setSelection(null)}
      />
      <AnnotationMenu
        activeExcerpt={activeExcerpt}
        anchorElement={activeAnchor}
        onClose={() => {
          setActiveExcerpt(null);
          setActiveAnchor(null);
        }}
      />
    </div>
  );
}
