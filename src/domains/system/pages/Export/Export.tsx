import {
  ActionIcon,
  Button,
  Divider,
  Group,
  HoverCard,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PageWrapper from "@core/design/layout/PageWrapper";
import StatusBar from "@core/design/components/Layout/Bottom";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import useFetch from "@core/hooks/useFetch";
import { DownloadSimple, DownloadSimpleIcon, InfoIcon } from "@phosphor-icons/react";
import { handleExportDownload } from "@/core/utils/export";
import { useState } from "react";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { showNotification } from "@mantine/notifications";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";

export default function Export() {
  const { i18n } = useLingui();
  const [loadingMarkdownExport, setLoadingMarkdownExport] = useState(false);
  const { user } = useAuth();

  const handleMarkdownExport = async () => {
    if (!user) {
      showNotification({
        message: i18n._(t`Error exporting data.`),
        color: "red",
      });
      return;
    }
    try {
      setLoadingMarkdownExport(true);
      await handleExportDownload(user);
    } catch (error) {
      console.error("Error getting markdown export: ", error);
      showNotification({
        title: i18n._(t`Something went wrong`),
        message: i18n._(t`Couldn't get markdown export`),
        color: "red",
      });
    } finally {
      setLoadingMarkdownExport(false);
    }
  };

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <Stack>
          <Title>
            <Trans>Export your data!</Trans>
          </Title>
          <SimpleGrid
            cols={{
              sm: 2,
              md: 3,
            }}
          >
            <Group gap="xs" align="center">
              <Button
                rightSection={<DownloadSimpleIcon />}
                variant="light"
                color="gray"
                loading={loadingMarkdownExport}
                disabled={loadingMarkdownExport || !user}
                onClick={() => {
                  handleMarkdownExport();
                }}
              >
                <Trans>Markdown Export</Trans>
              </Button>
              <HoverCard width={300}>
                <HoverCard.Target>
                  <ActionIcon variant="light" color="gray" size="lg">
                    <InfoIcon />
                  </ActionIcon>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Text size="sm">
                    <Trans>
                      The markdown export will export all of your ideas and quests as Markdown,
                      which will then be parsed in a Zip folder.
                    </Trans>
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
            </Group>
          </SimpleGrid>
          <Divider my="xs" />
          <Text size="sm">
            <Trans>
              Your data is always yours. Noeko is committed to keeping it portable, so that you can
              use it how you wish. If you have any trouble exporting your stuff, please don't
              hesitate to let us know.
            </Trans>
          </Text>
          <Text size="sm">
            <Trans>
              For more comprehensive timelines, check out the{" "}
              <a href="https://www.noeko.app">Noeko Roadmap.</a>
            </Trans>
          </Text>
        </Stack>
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
