import { useEffect } from "react";
import {
  IIdeaShare,
  IViewOnlyIdea,
} from "../../../../app/database/models/ideas";
import useFetch from "../../../hooks/useFetch";
import PageWrapper from "../../../components/Layout/PageWrapper";
import LeftSidebar from "../../../components/UI/Layout/Left";
import RightSidebar from "../../../components/UI/Layout/Right";
import Content from "../../../components/UI/Layout/Content";
import {
  Card,
  Flex,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "react-router";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import {
  htmlToMarkdown,
  sanitizeMarkdownForDescription,
} from "../../../utils/formatting";
import { splitBySentences } from "../../../utils/processing";
import StatusBar from "../../../components/UI/Layout/Bottom";

export default function SharedIdeas() {
  const {
    load: loadShared,
    loading: loadingShared,
    data: sharedIdeas,
  } = useFetch<undefined, IViewOnlyIdea[]>({
    url: "/ideas/shared",
  });

  console.log("Shared ideas: ", sharedIdeas);

  useEffect(() => {
    loadShared();
  }, []);

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Title>Shared with you</Title>
          {!sharedIdeas?.length && (
            <Text c="gray" size="sm">
              You do not have any ideas shared with you :(
            </Text>
          )}
          <SimpleGrid
            cols={{
              sm: 1,
              md: 2,
            }}
          >
            {sharedIdeas?.map((shared) => {
              return (
                <Link
                  to={`/ideas/shared/${shared.id.toString()}/viewonly`}
                  style={{
                    textDecoration: "none",
                  }}
                >
                  <Card
                    data-idea-id={shared.id.toString()}
                    shadow={"lg"}
                    padding={"sm"}
                    radius={"lg"}
                    withBorder
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Stack gap="xs" style={{ flexGrow: 1 }}>
                      <Flex justify="space-between" align="flex-start" gap="xs">
                        <Stack
                          gap="xs"
                          style={{
                            flexGrow: 1,
                            overflow: "hidden",
                            minWidth: 0,
                          }}
                        >
                          <Text
                            size="md"
                            c="dimmed"
                            fw={500}
                            lineClamp={2}
                            title={shared.title}
                          >
                            {shared.title || "Untitled Idea"}
                          </Text>
                        </Stack>
                      </Flex>

                      <Text size="sm" lineClamp={2}>
                        {splitBySentences(
                          sanitizeMarkdownForDescription(
                            htmlToMarkdown(shared.content),
                          ),
                        )
                          .slice(0, 2)
                          .join(" ... ")}
                      </Text>
                    </Stack>
                  </Card>
                </Link>
              );
            })}
          </SimpleGrid>
        </Stack>
      </Content>
      <StatusBar />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
