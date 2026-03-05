import { useEffect, useState } from "react";
import { useZoom } from "@embedpdf/plugin-zoom/react";
import { useSource } from "@domains/knowledge/pages/Sources/SourceContext";
import { Rect } from "@embedpdf/models";
import { IExcerpt } from "../../../../../../../shared/types/excerpt";
import AnnotationMenu from "./AnnotationMenu";

interface IExcerptAnnotationSyncProps {
  pageIndex: number;
  documentId: string;
}

export default function ExcerptAnnotationSync({
  pageIndex,
  documentId,
}: IExcerptAnnotationSyncProps) {
  const { state: zoomState } = useZoom(documentId);
  const {
    excerpts: { all: allExcerpts },
    excerptId,
  } = useSource();

  const scale = zoomState.currentZoomLevel;

  const [activeMenuExcerpt, setActiveMenuExcerpt] = useState<IExcerpt | null>(null);
  const [activeMenuAnchor, setActiveMenuAnchor] = useState<HTMLElement | null>(null);

  const pageExcerpts = allExcerpts.filter(
    (excerpt) => excerpt.pdfMetadata?.pageIndex === pageIndex
  );

  useEffect(() => {
    if (!excerptId) {
      setActiveMenuExcerpt(null);
      setActiveMenuAnchor(null);
      return;
    }

    const excerpt = allExcerpts.find((e) => e.id.toString() === excerptId);

    // 1. Check if the excerpt belongs to THIS specific page instance
    if (!excerpt || excerpt.pdfMetadata?.pageIndex !== pageIndex) {
      return;
    }

    // 2. Yield to the browser paint so the DOM elements actually exist
    const timer = setTimeout(() => {
      // Find the specific DOM node we added the ID to below
      const targetRect = document.getElementById(`excerpt-${excerptId}-rect-0`);

      if (targetRect) {
        setActiveMenuExcerpt(excerpt);
        setActiveMenuAnchor(targetRect);
      }
    }, 150); // 150ms gives the virtual scroller enough time to mount the page

    return () => clearTimeout(timer);
  }, [excerptId, allExcerpts, pageIndex]);

  return (
    <>
      {pageExcerpts.map((excerpt) => {
        const rects = excerpt.pdfMetadata?.data.segmentRects as Rect[];
        if (!rects) return null;

        return (
          <div key={`overlay-${excerpt.id.toString()}`} id={`excerpt-${excerpt.id.toString()}`}>
            {rects.map((rect, index) => {
              const scaledTop = rect.origin.y * scale;
              const scaledHeight = rect.size.height * scale;

              const adjustedTop = scaledTop + scaledHeight * 0.15;
              const adjustedHeight = scaledHeight * 0.7;

              return (
                <div
                  key={`rect-${index}`}
                  // Add an ID to the very first rect so Floating UI has a precise anchor point
                  id={index === 0 ? `excerpt-${excerpt.id.toString()}-rect-0` : undefined}
                  onClick={(e) => {
                    setActiveMenuExcerpt(excerpt);
                    setActiveMenuAnchor(e.currentTarget);
                  }}
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    left: rect.origin.x * scale,
                    top: adjustedTop,
                    width: rect.size.width * scale,
                    height: adjustedHeight,
                    backgroundColor: "var(--color-highlight, #ffeb3b)",
                    opacity: 0.4,
                    zIndex: 40,
                    borderRadius: "3px",
                  }}
                />
              );
            })}
          </div>
        );
      })}

      <AnnotationMenu
        activeExcerpt={activeMenuExcerpt}
        anchorElement={activeMenuAnchor}
        onClose={() => {
          setActiveMenuExcerpt(null);
          setActiveMenuAnchor(null);
        }}
      />
    </>
  );
}
