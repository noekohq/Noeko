import { useEffect, useRef, useState } from "react";
import IconToggle from "../../../components/Display/Interactions/Toggle/IconToggle";
import PageWrapper from "../../../components/Layout/PageWrapper";
import StatusBar from "../../../components/UI/Layout/Bottom";
import Content from "../../../components/UI/Layout/Content";
import LeftSidebar from "../../../components/UI/Layout/Left";
import RightSidebar from "../../../components/UI/Layout/Right";
import styles from "./Mobile.module.scss";
import {
  CheckIcon,
  IntersectSquareIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { ActionIcon, Group, Stack, Text, Title } from "@mantine/core";
import Think from "./Think";
import Do from "./Do";
import { SearchBar } from "../../../components/Search/SearchBar";
import { useInteraction } from "../../../contexts/InteractionContext";

type IDashboardView = "think" | "do";

export default function MobileDashboard() {
  const [view, setView] = useState<IDashboardView>("think");

  const viewToComponent: Record<IDashboardView, React.FC> = {
    think: Think,
    do: Do,
  };

  const viewToTitle: Record<IDashboardView, string> = {
    think: "Think",
    do: "Do",
  };

  const View = viewToComponent[view];

  const isInitialized = useRef(false);
  useEffect(() => {
    if (isInitialized.current) {
      localStorage.setItem("dashboardView", view);
    }
  }, [view]);

  useEffect(() => {
    const defaultView = localStorage.getItem("dashboardView");
    if (defaultView) {
      setView(defaultView as IDashboardView);
    }
    isInitialized.current = true;
  }, []);

  const {
    actions: { newIdea, newTask },
  } = useInteraction();

  const handleNew = () => {
    switch (view) {
      case "think":
        newIdea();
        break;
      case "do":
        newTask();
        break;
      default:
        break;
    }
  };

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <div className={styles.dashboard}>
          <Group justify="space-between" align="center">
            <Title order={1}>{viewToTitle[view]}</Title>
            <IconToggle
              value={view}
              options={[
                {
                  icon: IntersectSquareIcon,
                  value: "think" satisfies IDashboardView,
                },
                {
                  icon: CheckIcon,
                  value: "do" satisfies IDashboardView,
                },
              ]}
              onChange={(view) => {
                setView(view as IDashboardView);
              }}
            />
          </Group>
          <Group gap="xs" align="center" wrap="nowrap">
            <SearchBar />
            <ActionIcon
              variant="light"
              size="lg"
              radius="md"
              onClick={() => {
                handleNew();
              }}
            >
              <PlusIcon weight="bold" />
            </ActionIcon>
          </Group>
          <View />
        </div>
      </Content>
      <StatusBar></StatusBar>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
