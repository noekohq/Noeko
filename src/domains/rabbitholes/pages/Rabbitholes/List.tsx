import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { SquaresFourIcon, ListIcon, PlusIcon } from "@phosphor-icons/react";
import PageWrapper from "@core/design/layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import PaperThings from "@core/design/components/Paper/Things/PaperThings";
import PaperButton from "@core/design/components/Paper/PaperButton";
import { getThingPropsFromRabbithole } from "@core/design/components/Paper/Things/thingUtils";
import { useInteraction } from "@/contexts/InteractionContext";
import useRabbitholes from "../../hooks/useRabbitholes";
import styles from "./List.module.scss";

export default function Rabbitholes() {
  const {
    all: { data: rabbitholes, loading },
  } = useRabbitholes();
  const {
    actions: { newRabbithole },
  } = useInteraction();

  const things = useMemo(
    () => rabbitholes.map((rabbithole) => getThingPropsFromRabbithole(rabbithole)),
    [rabbitholes]
  );

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <Stack gap="xl" pt="md" pb="xl">
          <Group justify="space-between" align="flex-start">
            <div>
              <Group gap="xs">
                <Title order={1}>Rabbitholes</Title>
                <span className={styles.versionIndicator} aria-label="Alpha version">
                  Alpha
                </span>
              </Group>
              <Text c="dimmed" mt="xs" maw={620}>
                Living workspaces that gather context around the subjects you are exploring.
              </Text>
            </div>
            <PaperButton leftSection={<PlusIcon weight="bold" />} onClick={newRabbithole}>
              New Rabbithole
            </PaperButton>
          </Group>

          {loading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          ) : rabbitholes.length ? (
            <PaperThings
              things={things}
              modes={[
                { value: "grid", icon: SquaresFourIcon },
                { value: "list", icon: ListIcon },
              ]}
              defaultMode="grid"
              storageKey="rabbitholes-library"
              mobileGridColumns={2}
            />
          ) : (
            <Stack align="flex-start" gap="sm" py="xl">
              <Text fw="bold">No Rabbitholes yet</Text>
              <Text c="dimmed">Create one for a subject you want to keep exploring.</Text>
              <PaperButton leftSection={<PlusIcon />} onClick={newRabbithole}>
                Create your first Rabbithole
              </PaperButton>
            </Stack>
          )}
        </Stack>
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
