import {
  CheckIcon,
  LightbulbIcon,
  PlusIcon,
  PlusSquareIcon,
  XIcon,
} from "@phosphor-icons/react";
import StatusButton from "./StatusButton";
import { Menu } from "@mantine/core";
import { useInteraction } from "../../../contexts/InteractionContext";
import { useState } from "react";
import { RabbitholeIcon } from "../../Utils/Icons/Icons";

export default function CreateButton() {
  const {
    actions: { newIdea, newRabbithole, newTask },
  } = useInteraction();

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Menu
      onOpen={() => setMenuOpen(true)}
      onClose={() => setMenuOpen(false)}
      position="top-end"
      withArrow
      radius="md"
      width={"200px"}
    >
      <Menu.Target>
        <div style={{ height: "100%" }}>
          <StatusButton>
            {menuOpen ? (
              <XIcon weight="bold" size={16} />
            ) : (
              <PlusSquareIcon weight="bold" size={16} />
            )}
          </StatusButton>
        </div>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Create</Menu.Label>
        {/* <Menu.Item
          rightSection={<RabbitholeIcon size={16} />}
          onClick={() => {
            newRabbithole();
          }}
        >
          Rabbithole
        </Menu.Item> */}
        <Menu.Item
          rightSection={<CheckIcon weight="bold" />}
          onClick={() => {
            newTask();
          }}
        >
          Task
        </Menu.Item>
        <Menu.Item
          rightSection={<LightbulbIcon weight="bold" />}
          onClick={() => {
            newIdea();
          }}
        >
          Idea
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
