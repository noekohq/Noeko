import React, { useState, useEffect, useMemo } from "react";
import styles from "./ContextSurfacing.module.scss";
import {
  CheckIcon,
  FileIcon,
  IntersectIcon,
  IntersectSquareIcon,
  LightbulbIcon,
} from "@phosphor-icons/react";

const DEFAULT_TIMINGS = {
  typingSpeed: 10,
  pauseAfterType: 500,
  glintDuration: 2000,
  dotsVisible: 4000,
  pauseBeforeLoop: 1000,
};

const historicalExcerpts = [
  // 1. The Assertive (Formal, Political)
  // Declaration of Independence
  `"We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness."`,

  // 2. The Analytical (Philosophical, First-Person)
  // René Descartes, "Discourse on the Method"
  `"I observed that there was nothing at all in the phrase 'I think, therefore I am' to assure me that I was speaking the truth, except that I saw very clearly that in order to think one must exist."`,

  // 3. The Metaphorical (Dramatic, Rhythmic)
  // William Shakespeare, "As You Like It"
  `"All the world's a stage, And all the men and women merely players; They have their exits and their entrances, And one man in his time plays many parts, His acts being seven ages."`,

  // 4. The Narrative (Evocative, Voice-Driven)
  // Herman Melville, "Moby-Dick"
  `"Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world."`,

  // 5. The Observational (Naturalistic, Complex)
  // Charles Darwin, "On the Origin of Species"
  `"It is interesting to contemplate an entangled bank, clothed with many plants of many kinds, with birds singing on the bushes, with various insects flitting about, and with worms crawling through the damp earth..."`,

  // 6. The Interconnected (Poetic Prose, Metaphysical)
  // John Donne, "Meditation XVII"
  `"No man is an island, entire of itself; every man is a piece of the continent, a part of the main. ... Any man's death diminishes me, because I am involved in mankind; and therefore never send to know for whom the bell tolls; it tolls for thee."`,

  // 7. The Personal (Epistolary, Persuasive)
  // Abigail Adams, Letter to John Adams
  `"I long to hear that you have declared an independency. And by the way, in the new code of laws... I desire you would remember the ladies, and be more generous and favorable to them than your ancestors."`,
];

const getRandomExcerpt = (currentExcerpt?: string): string => {
  if (historicalExcerpts.length <= 1) {
    return historicalExcerpts[0] || "";
  }

  let newExcerpt;
  do {
    const randomIndex = Math.floor(Math.random() * historicalExcerpts.length);
    newExcerpt = historicalExcerpts[randomIndex];
  } while (newExcerpt === currentExcerpt);

  return newExcerpt;
};

const TypeToIcon = {
  idea: LightbulbIcon,
  task: CheckIcon,
  source: FileIcon,
};

type ItemType = keyof typeof TypeToIcon;
const itemTypes = Object.keys(TypeToIcon) as ItemType[];

const generateRandomItems = (): ItemType[] => {
  const size = Math.floor(Math.random() * 3) + 3; // Random size from 3 to 6
  const items: ItemType[] = [];
  for (let i = 0; i < size; i++) {
    const randomIndex = Math.floor(Math.random() * itemTypes.length);
    items.push(itemTypes[randomIndex]);
  }
  return items;
};

type Timings = typeof DEFAULT_TIMINGS;
type AnimationPhase = "typing" | "glinting" | "items-appearing" | "done";

interface ContextSurfacingProps {
  loop?: boolean;
  timings?: Partial<Timings>;
}

export default function ContextSurfacing({
  loop = true,
  timings: propTimings = {},
}: ContextSurfacingProps) {
  const timings = useMemo(
    () => ({ ...DEFAULT_TIMINGS, ...propTimings }),
    [JSON.stringify(propTimings)],
  );

  const [phase, setPhase] = useState<AnimationPhase>("typing");
  const [text, setText] = useState("");
  const [textToType, setTextToType] = useState(() => getRandomExcerpt());
  const [items, setItems] = useState<ItemType[]>(() => generateRandomItems());

  useEffect(() => {
    let typingInterval: ReturnType<typeof setInterval>;
    let phaseTimer1: ReturnType<typeof setTimeout>,
      phaseTimer2: ReturnType<typeof setTimeout>,
      phaseTimer3: ReturnType<typeof setTimeout>,
      loopTimer: ReturnType<typeof setTimeout>;

    setText("");
    setPhase("typing");
    setItems(generateRandomItems());
    let charIndex = 0;

    typingInterval = setInterval(() => {
      if (charIndex < textToType.length) {
        setText(textToType.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        phaseTimer1 = setTimeout(() => {
          setPhase("glinting");

          phaseTimer2 = setTimeout(() => {
            setPhase("items-appearing");

            phaseTimer3 = setTimeout(() => {
              setPhase("done");
              if (loop) {
                loopTimer = setTimeout(
                  () => setTextToType(getRandomExcerpt(textToType)),
                  timings.pauseBeforeLoop,
                );
              }
            }, timings.dotsVisible);
          }, timings.glintDuration);
        }, timings.pauseAfterType);
      }
    }, timings.typingSpeed);

    return () => {
      clearInterval(typingInterval);
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(phaseTimer3);
      clearTimeout(loopTimer);
    };
  }, [textToType, loop, timings]);

  return (
    <div className={styles.root}>
      <div className={styles.sidebar}>
        <div
          className={`${styles.iconWrapper} ${
            phase === "glinting" ? styles.glintingIcon : ""
          }`}
        >
          <IntersectSquareIcon weight="bold" />
        </div>

        <div
          className={`${styles.itemsContainer} ${
            phase === "items-appearing" ? styles.itemsVisible : ""
          }`}
        >
          {items.map((type, i) => {
            const Icon = TypeToIcon[type];
            return (
              <div
                key={`${type}-${i}`}
                className={`${styles[type]} ${styles.item}`}
                style={{
                  transitionDelay: `${i * 0.2}s`,
                }}
              >
                {Icon ? <Icon weight="bold" /> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.textArea}>
        <span>{text}</span>
        {phase === "typing" && (
          <span
            className={styles.cursor}
            style={{
              verticalAlign: "-4px",
            }}
          />
        )}

        <div
          className={`${styles.glint} ${
            phase === "glinting" ? styles.glintVisible : ""
          }`}
          style={{
            transitionDuration: `${timings.glintDuration}ms`,
          }}
        />
      </div>
    </div>
  );
}
