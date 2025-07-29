import { Button, Stack, Text } from "@mantine/core";
import styles from "./ExpandableCardStack.module.scss";
import React from "react";
import { useDisclosure } from "@mantine/hooks";
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";

interface IExpandableCardStackProps {
  cards: React.ReactNode[];
  topLabel: string | JSX.Element;
  expandLabel: string | JSX.Element;
}

export default function ExpandableCardStack({
  cards,
  topLabel,
  expandLabel,
}: IExpandableCardStackProps) {
  const topCard = cards[0];
  const otherCards = cards.slice(1);

  const [expanded, { toggle }] = useDisclosure();

  if (!cards.length) {
    return null;
  }

  return (
    <div className={styles.expandableCardStack}>
      <div className={styles.content}>
        <Stack>
          <Text c="dimmed" fw="bold" tt="uppercase" size="sm">
            {topLabel}
          </Text>
          <div className={styles.topCard}>{topCard}</div>
          {!!otherCards.length && (
            <>
              <Button
                onClick={toggle}
                color="gray"
                variant="subtle"
                size="xs"
                fw="bold"
                rightSection={expanded ? <CaretUpIcon /> : <CaretDownIcon />}
              >
                {expanded ? `Hide` : expandLabel}
              </Button>
              {expanded &&
                otherCards.map((other) => {
                  return other;
                })}
            </>
          )}
        </Stack>
      </div>
    </div>
  );
}
