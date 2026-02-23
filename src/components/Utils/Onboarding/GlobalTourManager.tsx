import { Button, Group, Text } from "@mantine/core";
import { useTourGuide } from '@/contexts/TourGuideContext';
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GlobalTourManager.module.scss";
import { useFloating, autoUpdate, offset, flip, shift } from "@floating-ui/react";
import { createPortal } from "react-dom";

export default function GlobalTourManager() {
  const { currentStep, completeStep, skipTour, targetElement } = useTourGuide();
  const [highlightStyle, setHighlightStyle] = useState<CSSProperties>({
    display: "none",
  });

  const { x, y, strategy, refs } = useFloating({
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
    middleware: [offset(8), flip(), shift()],
  });

  useEffect(() => {
    if (targetElement) {
      refs.setReference(targetElement);

      const updatePosition = () => {
        const rect = targetElement.getBoundingClientRect();
        const PADDING = 4;
        setHighlightStyle({
          display: "block",
          position: "absolute",
          width: rect.width + PADDING * 2,
          height: rect.height + PADDING * 2,
          top: rect.top + window.scrollY - PADDING,
          left: rect.left + window.scrollX - PADDING,
        });
      };

      updatePosition();

      const observer = new ResizeObserver(updatePosition);
      observer.observe(targetElement);
      observer.observe(document.body);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", updatePosition, true);
      };
    } else {
      refs.setReference(null);
      setHighlightStyle({ display: "none" });
    }
  }, [targetElement, refs]);

  const tourTip =
    currentStep && x !== null ? (
      <div
        ref={refs.setFloating}
        className={styles.tourTipWrapper}
        style={{
          position: strategy,
          top: y ?? 0,
          left: x ?? 0,
          zIndex: 10000,
        }}
      >
        <div style={{ maxWidth: 300 }} className={styles.body}>
          <Text fw={500}>{currentStep.title}</Text>
          <div className={styles.content}>{currentStep.content}</div>

          <Group justify="right" mt="md">
            <Button
              variant="subtle"
              size="sm"
              color="gray"
              onClick={() => skipTour(currentStep.view)}
            >
              Skip Tour
            </Button>
            <Button
              size="sm"
              color="gray"
              variant="light"
              onClick={() => completeStep(currentStep.id)}
            >
              Next
            </Button>
          </Group>
        </div>
      </div>
    ) : null;

  return createPortal(
    <>
      <div className={styles.tourHighlight} style={highlightStyle} />
      {tourTip}
    </>,
    document.body
  );
}
