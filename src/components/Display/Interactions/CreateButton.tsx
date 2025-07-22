import {
  LightbulbIcon,
  PlusIcon,
  PlusSquareIcon,
  XIcon,
} from "@phosphor-icons/react";
import StatusButton from "./StatusButton";
import { Menu } from "@mantine/core";
import { useInteraction } from "../../../contexts/InteractionContext";
import { useState } from "react";

export default function CreateButton() {
  const {
    actions: { newIdea, newRabbithole },
  } = useInteraction();

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Menu
      onOpen={() => setMenuOpen(true)}
      onClose={() => setMenuOpen(false)}
      position="top-end"
      withArrow
      radius="md"
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
        <Menu.Item
          rightSection={<PlusIcon weight="bold" />}
          onClick={() => {
            newIdea();
          }}
        >
          New Idea
        </Menu.Item>
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
