import {
  ActionIcon,
  Blockquote,
  Box,
  Card,
  Container,
  Drawer,
  Grid,
  Group,
  List,
  Modal,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import styles from "./History.module.scss";
import useSpyglassHistory from "./hooks/useSpyglassHistory";
import { useState } from "react";
import { ISpyglassSearch } from "../../../app/database/models/search";
import { DotsThreeIcon, SparkleIcon } from "@phosphor-icons/react";
import { getNodeAsIdeaOrNull } from "../../utils/graph";
import { CompactIdeaCard } from "../../components/Display/Ideas/IdeaCards";
import { markdownToHtml } from "../../utils/formatting";

export default function SpyglassHistory() {
  const { history } = useSpyglassHistory();

  const [viewing, setViewing] = useState<ISpyglassSearch>();
  console.log("Viewing: ", viewing);

  return (
    <>
      <Drawer
        opened={viewing !== undefined}
        onClose={() => setViewing(undefined)}
        position="right"
      >
        <Stack>
          <Text>"{viewing?.baseQuery}"</Text>
          <Blockquote>
            <Text fw="bold" c="dimmed" size="xs" mb="sm">
              ANSWER
            </Text>
            <Text
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(viewing?.analysis?.overview || ""),
              }}
            />
          </Blockquote>
          <Title order={3}>Results</Title>
          <Stack>
            {viewing?.results?.map((result) => {
              if ("type" in result && !(result.type === "idea")) {
                return null;
              }
              return (
                <CompactIdeaCard key={result.id.toString()} idea={result} />
              );
            })}
          </Stack>
        </Stack>
      </Drawer>
      <PageWrapper>
        <LeftSidebar />
        <Container className={styles.container} py="lg">
          <Grid>
            <Grid.Col>
              <Title>Your Spyglass History</Title>
            </Grid.Col>
            {history.map((item, index) => (
              <Grid.Col key={index}>
                <Group>
                  <Group>
                    <ActionIcon
                      onClick={() => setViewing(item)}
                      variant="default"
                    >
                      <DotsThreeIcon weight="bold" />
                    </ActionIcon>
                  </Group>
                  <Box p="md">
                    <Text>"{item.baseQuery}"</Text>
                    <Text>
                      Found {item.results?.length} result
                      {item.results?.length === 1 ? "" : "s"}
                    </Text>
                  </Box>
                </Group>
              </Grid.Col>
            ))}
          </Grid>
        </Container>
        <RightSidebar />
      </PageWrapper>
    </>
  );
}
