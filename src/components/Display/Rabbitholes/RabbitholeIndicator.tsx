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
import { ActionIcon, Button, Card, Group, Menu, Text } from "@mantine/core";
import { useLandscape } from "../../../contexts/LandscapeContext";
import { Link, useNavigate } from "react-router";
import useRabbithole from "../../../hooks/useRabbithole";
import { useCallback, useState } from "react";
import { RabbitholeIcon } from "../../Utils/Icons/Icons";
import useFetch from "../../../hooks/useFetch";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import StatusButton from "../Interactions/StatusButton";
import { useInteraction } from "../../../contexts/InteractionContext";
import RabbitholeCard from "./RabbitholeCard";

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
  const { exitRabbithole } = useRabbithole();

  const [menuOpen, setMenuOpen] = useState(false);

  const truncatedIdeaTitle = () => {
    if (!currentIdea) return "";
    if (currentIdea.title.length > 24)
      return currentIdea.title.slice(0, 24) + "...";
    return currentIdea.title;
  };

  return (
    <Menu
      onOpen={() => {
        loadRabbitholes();
        setMenuOpen(true);
      }}
      onClose={() => {
        setMenuOpen(false);
      }}
      position="top"
      withArrow
      radius="md"
      shadow="lg"
    >
      <Menu.Target>
        <div
          style={{
            height: "100%",
          }}
          className={`${styles.rabbitholeIndicator} ${!!currentRabbithole ? styles.down : styles.notDown}`}
        >
          {menuOpen ? (
            <XIcon size={16} weight="bold" />
          ) : (
            <RabbitholeIcon size={16} />
          )}
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
        {!!currentRabbithole && (
          <>
            <Menu.Divider />
            <Menu.Label>Current Rabbithole</Menu.Label>
            <Menu.Item>
              <RabbitholeCard rabbithole={currentRabbithole} />
            </Menu.Item>
            <Menu.Item
              onClick={() => {
                exitRabbithole();
              }}
              leftSection={<DoorOpenIcon />}
            >
              Exit Rabbithole
            </Menu.Item>
            {currentIdea &&
              (ideaIsIncluded() ? (
                <Menu.Item
                  onClick={() => unIncludeThing(currentIdea.id.toString())}
                  leftSection={<XIcon />}
                >
                  Remove {truncatedIdeaTitle()}
                </Menu.Item>
              ) : (
                <Menu.Item
                  onClick={() => includeThing(currentIdea.id.toString())}
                  leftSection={<PlusIcon />}
                >
                  Include {truncatedIdeaTitle()}
                </Menu.Item>
              ))}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
