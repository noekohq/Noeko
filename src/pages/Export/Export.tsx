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
import PageWrapper from '@/components/Layout/PageWrapper';
import StatusBar from '@core/design/components/Layout/Bottom';
import Content from '@core/design/components/Layout/Content';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import useFetch from '@/hooks/useFetch';
import { DownloadSimple, DownloadSimpleIcon, InfoIcon } from "@phosphor-icons/react";
import { handleExportDownload } from '@/utils/export';
import { useState } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { showNotification } from "@mantine/notifications";
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';

export default function Export() {
  const [loadingMarkdownExport, setLoadingMarkdownExport] = useState(false);
  const { user } = useAuth();

  const handleMarkdownExport = async () => {
    if (!user) {
      showNotification({
        message: "Error exporting data.",
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
        title: "Something went wrong",
        message: "Couldn't get markdown export",
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
          <Title>Export your data!</Title>
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
                Markdown Export
              </Button>
              <HoverCard width={300}>
                <HoverCard.Target>
                  <ActionIcon variant="light" color="gray" size="lg">
                    <InfoIcon />
                  </ActionIcon>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <Text size="sm">
                    The markdown export will export all of your ideas and tasks as Markdown, which
                    will then be parsed in a Zip folder.
                  </Text>
                </HoverCard.Dropdown>
              </HoverCard>
            </Group>
          </SimpleGrid>
          <Divider my="xs" />
          <Text size="sm">
            Your data is always yours. Noeko is committed to keeping it portable, so that you can
            use it how you wish. If you have any trouble exporting your stuff, please don't hesitate
            to let us know.
          </Text>
          <Text size="sm">
            For more comprehensive timelines, check out the{" "}
            <a href="https://www.noeko.app">Noeko Roadmap.</a>
          </Text>
        </Stack>
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
