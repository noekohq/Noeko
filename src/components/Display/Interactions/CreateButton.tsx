import {
  CheckIcon,
  FileIcon,
  LightbulbIcon,
  PlusIcon,
  PlusSquareIcon,
  XIcon,
} from "@phosphor-icons/react";
import StatusButton from "./StatusButton";
import { Menu } from "@mantine/core";
import { useInteraction } from '@/contexts/InteractionContext';
import { useState } from "react";
import { RabbitholeIcon } from '@core/design/icons/Icons';
import { useLayout } from '@/contexts/LayoutContext';
import { useTourStep } from '@/contexts/TourGuideContext';

export default function CreateButton() {
  const {
    actions: { newIdea, newRabbithole, newTask, newSource },
  } = useInteraction();
  const { isMobile, isTablet } = useLayout();

  const [menuOpen, setMenuOpen] = useState(false);

  const createRef = useTourStep({
    id: "feature:button_create",
    title: "Create",
    content:
      "Hit the create button whenever you want to add a new idea, task, source, or rabbithole.",
    view: "all",
    order: 1,
  });

  return (
    <Menu
      onOpen={() => setMenuOpen(true)}
      onClose={() => setMenuOpen(false)}
      position="top-end"
      withArrow
      radius="md"
      width={"200px"}
      trigger={isMobile || isTablet ? "click" : "click-hover"}
      openDelay={100}
    >
      <Menu.Target>
        <div style={{ height: "100%", position: "relative" }} ref={createRef}>
          <StatusButton variant="primary">
            {menuOpen ? <XIcon weight="bold" size={16} /> : <PlusIcon weight="bold" size={16} />}
          </StatusButton>
        </div>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>New</Menu.Label>
        <Menu.Item
          rightSection={<FileIcon weight="bold" />}
          onClick={() => {
            newSource();
          }}
        >
          Source
        </Menu.Item>
        <Menu.Item
          rightSection={<RabbitholeIcon size={16} />}
          onClick={() => {
            newRabbithole();
          }}
        >
          Rabbithole
        </Menu.Item>
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
