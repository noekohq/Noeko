import {
  MinusIcon,
  PlusIcon,
  PlusSquareIcon,
  RabbitIcon,
  XIcon,
} from "@phosphor-icons/react";
import styles from "./RabbitholeIndicator.module.scss";
import { ActionIcon, Group, Text } from "@mantine/core";
import { useLandscape } from "../../../contexts/LandscapeContext";
import { Link, useNavigate } from "react-router";
import useRabbithole from "../../../hooks/useRabbithole";
import { useCallback } from "react";

export function RabbitholeIndicator() {
  const {
    rabbitholes: {
      entered: { get: currentRabbithole, set: setRabbithole },
    },
    idea: {
      viewing: { get: currentIdea },
    },
  } = useLandscape();

  const { includeThing, unIncludeThing, isIncludedThing, loading } =
    useRabbithole();

  const navigate = useNavigate();

  const ideaIsIncluded = useCallback(() => {
    if (!currentIdea) {
      return false;
    }
    console.log("ideaIsIncluded: ", currentIdea.id);
    return isIncludedThing(currentIdea.id.toString());
  }, [currentIdea, isIncludedThing]);

  console.log("idea is included: ", ideaIsIncluded());
  console.log("idea: ", currentIdea);

  if (!currentRabbithole) {
    return null;
  }

  return (
    <Link
      to={`/rabbitholes/${currentRabbithole.id.toString()}`}
      style={{
        textDecoration: "none",
      }}
    >
      <div className={styles.rabbitholeIndicator}>
        <Group gap="2px" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <RabbitIcon weight="fill" />
          <Text
            w={"100%"}
            truncate={"end"}
            size="xs"
            fw="bold"
            tt="uppercase"
            title={currentRabbithole?.name}
          >
            {currentRabbithole?.name}
          </Text>
        </Group>
        <Group>
          {currentIdea && !ideaIsIncluded() && (
            <ActionIcon
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                includeThing(currentIdea.id.toString());
              }}
              variant="subtle"
              size="sm"
              color="dark.4"
              loading={loading}
              title="Add this thing to the current rabbithole"
            >
              <PlusIcon weight="bold" />
            </ActionIcon>
          )}
          {currentIdea && ideaIsIncluded() && (
            <ActionIcon
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                unIncludeThing(currentIdea.id.toString());
              }}
              variant="subtle"
              size="sm"
              color="dark.4"
              loading={loading}
              title="Remove this thing from the current rabbithole"
            >
              <MinusIcon weight="bold" />
            </ActionIcon>
          )}

          <ActionIcon
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setRabbithole(null);
            }}
            variant="subtle"
            size="sm"
            color="dark.4"
            title="Exit the current rabbithole"
          >
            <XIcon weight="bold" />
          </ActionIcon>
        </Group>
      </div>
    </Link>
  );
}
