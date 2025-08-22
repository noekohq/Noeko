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
import { useCallback, useEffect, useState } from "react";
import { RabbitholeIcon } from "../../Utils/Icons/Icons";
import useFetch from "../../../hooks/useFetch";
import { IRabbithole } from "../../../../app/database/models/rabbithole";
import StatusButton from "../Interactions/StatusButton";
import { useInteraction } from "../../../contexts/InteractionContext";
import RabbitholeCard from "./RabbitholeCard";
import RabbitholeThing from "./RabbitholeThing";
import { getNodeTitle } from "../../../utils/graph";

export function RabbitholeIndicator() {
  const {
    rabbitholes: {
      entered: { get: currentRabbithole },
    },
  } = useLandscape();

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Menu
      onOpen={() => {
        setMenuOpen(true);
      }}
      onClose={() => {
        setMenuOpen(false);
      }}
      position="top"
      radius="md"
      shadow="lg"
      width={"300px"}
      closeOnItemClick={false}
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
      <Menu.Dropdown style={{ overflowY: "scroll", maxHeight: "400px" }}>
        <DropdownEmpty />
        <DropdownForRabbithole />
      </Menu.Dropdown>
    </Menu>
  );
}

function DropdownForRabbithole() {
  const navigate = useNavigate();

  const {
    connectable: {
      viewing: { get: currentConnectable },
    },
  } = useLandscape();

  const {
    currentRabbithole,
    exitRabbithole,
    includeThing,
    unIncludeThing,
    isIncludedThing,
    loading,
  } = useRabbithole();

  console.log(
    "Included: ",
    currentConnectable
      ? isIncludedThing(currentConnectable.id.toString())
      : "Unapplicable",
  );

  const truncatedConnectableTitle = () => {
    if (!currentConnectable) return "";
    const name = getNodeTitle({
      ...currentConnectable,
    });
    if (!name) {
      return "";
    }
    if (name.length > 24) return name.slice(0, 24) + "...";
    return name;
  };

  const connectableIsIncluded = () => {
    if (!currentConnectable) {
      return false;
    }
    return isIncludedThing(currentConnectable.id.toString());
  };

  const maxIncludedDisplayed = 5;
  const truncatedIncludedThings = currentRabbithole?.includes?.slice(
    0,
    maxIncludedDisplayed,
  );
  const hasAdditionalThings =
    currentRabbithole &&
    currentRabbithole?.includes &&
    currentRabbithole.includes?.length > maxIncludedDisplayed;

  if (!currentRabbithole) {
    return null;
  }

  return (
    <>
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
      <Menu.Item
        onClick={() => {
          navigate(`/rabbitholes/${currentRabbithole.id.toString()}`);
        }}
        leftSection={<ArrowRightIcon />}
      >
        Go to Rabbithole
      </Menu.Item>
      {loading && <Menu.Item>Loading...</Menu.Item>}
      {currentConnectable &&
        !loading &&
        (connectableIsIncluded() ? (
          <Menu.Item
            onClick={() => unIncludeThing(currentConnectable.id.toString())}
            leftSection={<XIcon />}
          >
            Remove {truncatedConnectableTitle()}
          </Menu.Item>
        ) : (
          <Menu.Item
            onClick={() => includeThing(currentConnectable.id.toString())}
            leftSection={<PlusIcon />}
          >
            Include {truncatedConnectableTitle()}
          </Menu.Item>
        ))}
      <Menu.Label>Included Things</Menu.Label>
      {!truncatedIncludedThings?.length && (
        <Menu.Item>
          <Text size="xs" c="dimmed">
            Nothing included.
          </Text>
        </Menu.Item>
      )}
      {truncatedIncludedThings?.map((i) => {
        return (
          <Menu.Item>
            <RabbitholeThing rabbithole={currentRabbithole} thing={i} />
          </Menu.Item>
        );
      })}
      {hasAdditionalThings && (
        <Menu.Item
          onClick={() => {
            navigate(`/rabbitholes/${currentRabbithole.id.toString()}`);
          }}
          rightSection={<ArrowRightIcon weight="bold" />}
        >
          See the rest...
        </Menu.Item>
      )}
    </>
  );
}

function DropdownEmpty() {
  const navigate = useNavigate();

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
      entered: { set: enterRabbithole, get: currentRabbithole },
    },
  } = useLandscape();

  useEffect(() => {
    loadRabbitholes();
  }, []);

  if (!!currentRabbithole) {
    return null;
  }

  return (
    <>
      <Menu.Label>Recent Rabbitholes...</Menu.Label>
      {recentRabbitholes?.map((r) => {
        return (
          <Menu.Item
            key={r.id.toString()}
            leftSection={
              <RabbitholeIcon size={14} color={"var(--mantine-color-dimmed)"} />
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
    </>
  );
}
