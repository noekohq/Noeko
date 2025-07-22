import {
  ArrowRightIcon,
  DoorOpenIcon,
  MinusIcon,
  PlusIcon,
  PlusSquareIcon,
  RabbitIcon,
  XIcon,
} from "@phosphor-icons/react";
import styles from "./RabbitholeIndicator.module.scss";
import { ActionIcon, Button, Group, Menu, Text } from "@mantine/core";
import { useLandscape } from "../../../contexts/LandscapeContext";
import { Link, useNavigate } from "react-router";
import useRabbithole from "../../../hooks/useRabbithole";
import { useCallback, useState } from "react";
import { RabbitholeIcon } from "../../Utils/Icons/Icons";
import useFetch from "../../../hooks/useFetch";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import StatusButton from "../Interactions/StatusButton";
import { useInteraction } from "../../../contexts/InteractionContext";

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

  const { data: recentRabbitholes, load: loadRabbitholes } = useFetch<
    undefined,
    IRabbithole[]
  >({
    url: `/rabbitholes?limit=10`,
  });

  const {
    actions: { newRabbithole },
  } = useInteraction();
  const {
    rabbitholes: {
      entered: { set: enterRabbithole },
    },
  } = useLandscape();

  const [menuOpen, setMenuOpen] = useState(false);

  if (!currentRabbithole) {
    return (
      <Menu
        onOpen={() => {
          loadRabbitholes();
          setMenuOpen(true);
        }}
        onClose={() => {
          setMenuOpen(false);
        }}
        position="top-end"
        withArrow
        radius="md"
      >
        <Menu.Target>
          <div
            style={{
              height: "100%",
            }}
          >
            <StatusButton>
              {menuOpen ? (
                <XIcon size={16} weight="bold" />
              ) : (
                <RabbitholeIcon size={16} />
              )}
            </StatusButton>
          </div>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Recent Rabbitholes...</Menu.Label>
          {recentRabbitholes?.map((r) => {
            return (
              <Menu.Item
                key={r.id.toString()}
                leftSection={
                  <RabbitholeIcon
                    size={14}
                    color={"var(--mantine-color-dimmed)"}
                  />
                }
                rightSection={
                  <ActionIcon
                    onClick={(e) => {
                      e.stopPropagation();
                      enterRabbithole(r);
                    }}
                    size="sm"
                    variant="light"
                    color="green"
                  >
                    <DoorOpenIcon weight="bold" />
                  </ActionIcon>
                }
                onClick={() => {
                  navigate(`/rabbitholes/${r.id.toString()}`);
                }}
              >
                {r.name}
              </Menu.Item>
            );
          })}
          <Menu.Item
            onClick={() => {
              navigate("/rabbitholes");
            }}
            rightSection={<ArrowRightIcon weight="bold" />}
          >
            See the rest...
          </Menu.Item>
          <Menu.Divider />
          <Menu.Label>Actions</Menu.Label>
          <Menu.Item
            rightSection={<PlusIcon weight="bold" />}
            onClick={() => {
              newRabbithole();
            }}
          >
            New Rabbithole
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    );
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
