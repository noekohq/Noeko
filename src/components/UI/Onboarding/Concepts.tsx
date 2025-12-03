import { useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BrainIcon,
  Icon,
  IntersectSquareIcon,
  UniteSquareIcon,
} from "@phosphor-icons/react";
import { IOnboardingProps } from "./Index";
import styles from "./Concepts.module.scss";
import ConnectingDots from "../../Utils/Graphics/VisualAids/ConnectingDots";
import ContextSurfacing from "../../Utils/Graphics/VisualAids/ContextSurfacing";
import SemanticWordCloud from "../../Utils/Graphics/VisualAids/SemanticCloud";
import { SemanticDemo } from "../../Utils/Graphics/VisualAids/SemanticDemo";

export default function Concepts({ next }: IOnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visitedConcepts, setVisitedConcepts] = useState(new Set([0]));
  const currentConcept = concepts[currentIndex];

  const allConceptsVisited = visitedConcepts.size === concepts.length;

  const goToPrevious = () => {
    const newIndex = Math.max(currentIndex - 1, 0);
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const newIndex = Math.min(currentIndex + 1, concepts.length - 1);
    setCurrentIndex(newIndex);
    setVisitedConcepts((prev) => new Set(prev).add(newIndex));
  };

  const goToSlide = (slideIndex: number) => {
    setCurrentIndex(slideIndex);
    setVisitedConcepts((prev) => new Set(prev).add(slideIndex));
  };

  return (
    <div className={styles.concepts}>
      <div className={styles.header}>
        <h2>First, some core concepts.</h2>
      </div>

      <div className={styles.body}>
        <div className={styles.gallery}>
          <div className={styles.concept}>
            <div className={styles.content}>
              <div className={styles.title}>
                <currentConcept.icon weight="duotone" />
                <h2>{currentConcept.title}</h2>
              </div>
              <div className={styles.description}>
                {currentConcept.description}
              </div>
            </div>
            <div className={styles.graphic}>
              <div className={styles.container}>{currentConcept.graphic}</div>
            </div>
          </div>
        </div>

        <div className={styles.navigation}>
          <button
            onClick={goToPrevious}
            className={styles.arrowButton}
            disabled={currentIndex === 0}
          >
            <ArrowLeftIcon weight="bold" />
          </button>
          <div className={styles.dotsContainer}>
            {concepts.map((_, slideIndex) => (
              <div
                key={slideIndex}
                className={`${styles.dot} ${
                  currentIndex === slideIndex ? styles.activeDot : ""
                }`}
                onClick={() => goToSlide(slideIndex)}
              />
            ))}
          </div>
          <button
            onClick={goToNext}
            className={`${styles.arrowButton} ${
              !allConceptsVisited && currentIndex < concepts.length - 1
                ? styles.pulse
                : ""
            }`}
            disabled={currentIndex === concepts.length - 1}
          >
            <ArrowRightIcon weight="bold" />
          </button>
        </div>
      </div>

      <div className={styles.action}>
        <button
          className={styles.button}
          onClick={next}
          disabled={!allConceptsVisited}
        >
          Got it, next
        </button>
      </div>
    </div>
  );
}

interface IConcept {
  title: string;
  icon: Icon;
  description: React.ReactNode;
  graphic: React.ReactNode;
}
const concepts: IConcept[] = [
  {
    title: "Connections",
    icon: UniteSquareIcon,
    description: (
      <>
        <strong>Organize how your mind actually works.</strong> Every link works
        both ways, automatically weaving your knowledge together into a
        Constellation.
      </>
    ),
    graphic: <ConnectingDots />,
  },
  {
    title: "Context",
    icon: IntersectSquareIcon,
    description: (
      <>
        <strong>Rediscover your thoughts.</strong> As you write, Noeko
        automatically surfaces relevant notes from your past, revealing
        connections you never knew you had.
      </>
    ),
    graphic: <ContextSurfacing />,
  },
  {
    title: "Semantics",
    icon: BrainIcon,
    description: (
      <>
        <strong>Less overhead, more power.</strong> Noeko understands the
        meaning behind your notes, so you can find anything without perfect tags
        or keywords.
      </>
    ),
    graphic: <SemanticDemo />,
  },
];
