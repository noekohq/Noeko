import { useState, useEffect, useRef } from "react";
import { BrainIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import classes from "./SemanticDemo.module.scss";
import { Group, Text } from "@mantine/core";

interface DemoResult {
  title: string;
}

interface DemoConfig {
  query: string;
  results: DemoResult[];
}

const demoConfigurations: DemoConfig[] = [
  // Example 1: Conceptual search for a narrative's mood
  {
    query: "that novel opening about going to sea when you're depressed",
    results: [
      {
        title: "Moby-Dick; or, The Whale (Chapter 1)",
      },
      {
        title: "Loomings: Ishmael's Monologue",
      },
      {
        title: "Journal: Thoughts on the Sea",
      },
    ],
  },
  // Example 2: Searching for a specific famous speech by its theme
  {
    query: "the monologue about the seven ages of man",
    results: [
      {
        title: "As You Like It (Act II, Scene VII)",
      },
      {
        title: "First Folio: 'All the world's a stage'",
      },
      {
        title: "Notes on Jaques' Soliloquy",
      },
    ],
  },
  // Example 3: Searching for a document by its famous phrase
  {
    query: "the founding document about life, liberty, and happiness",
    results: [
      {
        title: "The Declaration of Independence (Preamble)",
      },
      {
        title: "Jefferson's First Draft (Edited)",
      },
      {
        title: "Committee of Five Meeting Notes",
      },
    ],
  },
  // Example 4: Searching for a scientific metaphor
  {
    query: "that final paragraph about the complex web of life",
    results: [
      {
        title: "On the Origin of Species (Conclusion)",
      },
      {
        title: "The 'Entangled Bank' Metaphor",
      },
      {
        title: "Field Notes: Ecosystems (1859)",
      },
    ],
  },
  // Example 5: Searching for a specific, personal correspondence
  {
    query: "the letter to John Adams about remembering the ladies",
    results: [
      {
        title: "Letter from Abigail Adams (1776-03-31)",
      },
      {
        title: "Correspondence: 'Remember the Ladies'",
      },
      {
        title: "Founding Mothers: Primary Sources",
      },
    ],
  },
];

const animationConfig = {
  typingSpeed: 10,
  postTypingDelay: 500,
  postResultsDelay: 6000,
  initialDelay: 500,
};

export const SemanticDemo = () => {
  const [typedText, setTypedText] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const runAnimationSequence = () => {
      // 1. Reset state
      setShowResults(false);
      setTypedText("");

      const currentQuery = demoConfigurations[demoIndex].query;

      // 2. Start typing animation
      let i = 0;
      const type = () => {
        if (i < currentQuery.length) {
          setTypedText(currentQuery.substring(0, i + 1));
          i++;
          timerRef.current = setTimeout(type, animationConfig.typingSpeed); // Typing speed
        } else {
          // 3. Typing finished, wait then show results
          timerRef.current = setTimeout(() => {
            setShowResults(true);

            // 4. Wait 3s, then restart the whole sequence with the next demo
            timerRef.current = setTimeout(() => {
              setDemoIndex((prevIndex) => (prevIndex + 1) % demoConfigurations.length);
            }, animationConfig.postResultsDelay);
          }, animationConfig.postTypingDelay); // Wait 500ms after typing
        }
      };

      // Wait a bit before starting the first typing animation
      timerRef.current = setTimeout(type, animationConfig.initialDelay);
    };

    // Kick off the animation sequence
    runAnimationSequence();

    // Cleanup function to clear timeout on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [demoIndex]); // Re-run effect when demoIndex changes

  return (
    <div className={classes.demoContainer}>
      {/* Search Bar */}
      <div className={classes.searchBar}>
        <Text component="span" className={classes.typedText}>
          {typedText}
          {/* Show cursor as long as results aren't visible */}
          {!showResults && <span className={classes.cursor}></span>}
        </Text>
        <div className={classes.searchIcon}>
          <MagnifyingGlassIcon weight="bold" />
        </div>
      </div>

      {/* Results Area */}
      <div className={`${classes.resultsArea} ${showResults ? classes.show : ""}`}>
        <h3 className={classes.resultsTitle}>
          <Group align="baseline" gap="sm">
            Results
            <BrainIcon weight="bold" />
          </Group>
        </h3>

        {demoConfigurations[demoIndex].results.map((result, index) => (
          <div className={classes.resultCard} key={index}>
            <div className={classes.cardContent}>
              <p className={classes.title}>{result.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
