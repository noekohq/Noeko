import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollPluginPackage, useScroll, useScrollCapability } from "@embedpdf/plugin-scroll/react";
import { useSource } from "@domains/knowledge/pages/Sources/SourceContext";
import { Rect } from "@embedpdf/models";
import { useAnnotation } from "@embedpdf/plugin-annotation/react";

interface IExcerptNavigatorProps {
  documentId: string;
}

export default function ExcerptNavigator({ documentId }: IExcerptNavigatorProps) {
  const { provides: scroller, state: scrollState } = useScroll(documentId);
  const { provides: scrollCapability } = useScrollCapability();
  const {
    state: { pages },
  } = useAnnotation(documentId);
  const {
    excerpts: { all },
    excerptId: targetExcerptId,
  } = useSource();

  const lastNavigatedTo = useRef<string | null>(null);

  // NEW: Track if the PDF layout has physically painted
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  const navigateToTarget = useCallback(
    (triggerSource = "Unknown") => {
      if (!isLayoutReady) {
        return;
      }

      if (!targetExcerptId || !scroller) {
        return;
      }

      if (lastNavigatedTo.current === targetExcerptId) {
        return;
      }

      const excerpt = all.find((e) => e.id.toString() === targetExcerptId);
      if (!excerpt || !excerpt.pdfMetadata) {
        return;
      }

      if (scrollState.totalPages < excerpt.pdfMetadata.pageIndex) {
        console.error("🧭 [Navigator] 🛑 Bailing: Can't navigate to page that does not exist.", {
          totalPages: scrollState.totalPages,
          targetPage: excerpt.pdfMetadata.pageIndex,
        });
        return;
      }

      const pageNumber = excerpt.pdfMetadata.pageIndex + 1;

      const firstRect = excerpt.pdfMetadata.data.segmentRects?.[0] as Rect | undefined;

      if (firstRect) {
        scroller.scrollToPage({
          pageNumber,
          pageCoordinates: {
            x: firstRect.origin.x,
            y: firstRect.origin.y,
          },
          behavior: "smooth",
          alignY: 30,
        });
        lastNavigatedTo.current = targetExcerptId;
      }
    },
    [targetExcerptId, scroller, all, scrollState, isLayoutReady]
  );

  useEffect(() => {
    if (!scrollCapability) return;
    const unsubscribe = scrollCapability.onLayoutReady((e) => {
      if (e.documentId === documentId) {
        setIsLayoutReady(true);
        navigateToTarget("onLayoutReady Event");
      }
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [scrollCapability, documentId, navigateToTarget]);

  useEffect(() => {
    if (targetExcerptId) {
      navigateToTarget("React Dependency Array");
    }
  }, [pages, navigateToTarget, targetExcerptId]);

  return null;
}
