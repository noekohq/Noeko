import { Button, Group, Text } from "@mantine/core";
import { useTourGuide } from "../../../contexts/TourGuideContext";
import { useEffect } from "react";
import styles from "./GlobalTourManager.module.scss";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
} from "@floating-ui/react";

export default function GlobalTourManager() {
  const { currentStep, completeStep, skipTour, targetElement } = useTourGuide();

  const { x, y, strategy, refs } = useFloating({
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
    middleware: [offset(8), flip(), shift()],
  });

  useEffect(() => {
    if (targetElement) {
      refs.setReference(targetElement);
      targetElement.classList.add(styles.touringElement);

      return () => {
        targetElement.classList.remove(styles.touringElement);
        refs.setReference(null);
      };
    }
  }, [targetElement, refs, styles.touringElement]);

  if (!currentStep || x == null) {
    return null;
  }

  return (
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
            size="xs"
            onClick={() => skipTour(currentStep.view)}
          >
            Skip Tour
          </Button>
          <Button size="xs" onClick={() => completeStep(currentStep.id)}>
            Next
          </Button>
        </Group>
      </div>
    </div>
  );
}
