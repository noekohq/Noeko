<<<<<<< HEAD
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  HoverCard,
  SimpleGrid,
  Space,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
=======
import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { SquaresFourIcon, ListIcon, PlusIcon } from "@phosphor-icons/react";
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466
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
  const { i18n } = useLingui();
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
<<<<<<< HEAD
        <Stack>
          <Group>
            <Group>
              <RabbitIcon size="36px" weight="bold" />
              <Title>
                <Trans>Rabbitholes</Trans>
              </Title>
              <HoverCard openDelay={400} width="300px">
                <HoverCard.Target>
                  <Badge color="orange" size="sm" variant="light">
                    <Trans>ALPHA</Trans>
                  </Badge>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Stack gap="xs">
                    <Text size="sm">
                      <Trans>
                        Rabbitholes are currently under active development and some features might
                        not work as expected. We're looking for feedback as we learn and grow :)
                      </Trans>
                    </Text>
                    <Text size="xs" c="dimmed">
                      <Trans>
                        This feature will remain free during its experimental phases, limits may
                        apply in future iterations.
                      </Trans>
                    </Text>
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="gray"
                      onClick={() => {
                        openFeedbackModal();
                      }}
                    >
                      <MegaphoneIcon />
                    </ActionIcon>
                  </Stack>
                </HoverCard.Dropdown>
              </HoverCard>
            </Group>
            <Group>
              <ActionIcon
                variant="light"
                color="green"
                onClick={() => {
                  newRabbithole();
                }}
              >
                <PlusIcon weight="bold" />
              </ActionIcon>
            </Group>
          </Group>
          <TextInput
            placeholder={i18n._(t`Filter rabbitholes...`)}
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.currentTarget.value)}
            mb="md"
            radius="md"
          />
          {!rabbitholes?.length && (
            <>
              <Text c="gray" size="sm">
                <Trans>You do not have any rabbitholes.</Trans>
              </Text>
              <Group>
                <Button
                  rightSection={<PlusIcon />}
                  variant="light"
                  onClick={() => {
                    newRabbithole();
                  }}
                >
                  <Trans>Create One</Trans>
                </Button>
=======
        <Stack gap="xl" pt="md" pb="xl">
          <Group justify="space-between" align="flex-start">
            <div>
              <Group gap="xs">
                <Title order={1}>Rabbitholes</Title>
                <span className={styles.versionIndicator} aria-label="Alpha version">
                  Alpha
                </span>
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466
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
<<<<<<< HEAD
          {!!filteredRabbitholes?.length && (
            <SimpleGrid
              spacing="xs"
              cols={{
                base: 2,
                sm: 2,
                md: 3,
                lg: 4,
              }}
            >
              {filteredRabbitholes.map((rabbithole) => {
                const props = getThingPropsFromRabbithole(rabbithole, {
                  detail: i18n._(t`Last active ${formatDateTime(rabbithole.updatedAt)}`),
                });
                return <GridCard key={rabbithole.id.toString()} {...props} />;
              })}
            </SimpleGrid>
          )}
          <Space my="lg" />
=======
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466
        </Stack>
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
