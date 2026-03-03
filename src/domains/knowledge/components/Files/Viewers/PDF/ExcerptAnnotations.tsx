import { useState } from "react";
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
  } = useSource();

  const scale = zoomState.currentZoomLevel;

  const [activeMenuExcerpt, setActiveMenuExcerpt] = useState<IExcerpt | null>(null);
  const [activeMenuAnchor, setActiveMenuAnchor] = useState<HTMLElement | null>(null);

  const pageExcerpts = allExcerpts.filter(
    (excerpt) => excerpt.pdfMetadata?.pageIndex === pageIndex
  );

  return (
    <>
      {pageExcerpts.map((excerpt) => {
        const rects = excerpt.pdfMetadata?.data.segmentRects as Rect[];
        if (!rects) return null;

        return (
          <div key={`overlay-${excerpt.id.toString()}`}>
            {rects.map((rect, index) => {
              const scaledTop = rect.origin.y * scale;
              const scaledHeight = rect.size.height * scale;

              const adjustedTop = scaledTop + scaledHeight * 0.15;
              const adjustedHeight = scaledHeight * 0.7;

              return (
                <div
                  key={`rect-${index}`}
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
