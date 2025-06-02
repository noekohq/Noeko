import {
  Button,
  Card,
  Container,
  Divider,
  Drawer,
  Grid,
  Group,
  List,
  Space,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import { Link } from "react-router";
import React, { useState } from "react";
import { useInteraction } from "../../contexts/InteractionContext";
import { MegaphoneSimple } from "@phosphor-icons/react";
import { capitalize, formatDate } from "../../utils/formatting";

type IUpdate = {
  title: string;
  details: React.ReactNode;
  date: Date;
};

const updates: IUpdate[] = [
  {
    date: new Date("June 1, 2025"),
    title: "Tag view UI improvements, editor updates, general UI updates",
    details: (
      <List>
        <List.Item>Made search results look better.</List.Item>
        <List.Item>Tag view no longer flashes like crazy.</List.Item>
        <List.Item>Code blocks look nicer.</List.Item>
        <List.Item>Export or Copy ideas as Markdown or HTML.</List.Item>
        <List.Item>
          You can now drag and drop search results to your connections to manual
          connect ideas.
        </List.Item>
        <List.Item>Tag suggestions should be better now.</List.Item>
      </List>
    ),
  },
  {
    date: new Date("May 31, 2025"),
    title: "Improvements to tags, more consistent idea UI",
    details: (
      <List>
        <List.Item>Find your tags to apply them in the left sidebar.</List.Item>
        <List.Item>Create a tag from idea view.</List.Item>
        <List.Item>Get suggested tags and apply those.</List.Item>
        <List.Item>
          Idea's will start to display more consistently and get better
          interactions.
        </List.Item>
      </List>
    ),
  },
  {
    date: new Date("May 29, 2025"),
    title: "Graph improvements, better shortcuts",
    details: (
      <List>
        <List.Item>
          The graph has been refined to include both "normal" and "heavy" mode,
          which allows you to tune the level of computation of your graph
        </List.Item>
        <List.Item>Tags will now appear in the graph</List.Item>
        <List.Item>
          New idea will now be (ctrl/cmd + shift + a) rather than (ctrl/cmd +
          shift + i) due to conflict with developer tools
        </List.Item>
      </List>
    ),
  },
  {
    date: new Date("May 28, 2025"),
    title: "UI Updates, Tags, and Bug Fixes",
    details: (
      <List>
        <List.Item>
          The <Link to="/ideas">All Ideas</Link> view now properly loads ideas.
        </List.Item>
        <List.Item>Add the updates page :)</List.Item>
        <List.Item>Minor styling and updates</List.Item>
        <List.Item>
          Better "At a Glance" formatting in{" "}
          <Link to="/spyglass">Spyglass</Link>
        </List.Item>
      </List>
    ),
  },
  {
    date: new Date("May 27, 2025"),
    title: "Tags, Removed Redundancy, and Some Love for Mobile",
    details: (
      <List>
        <List.Item>
          Fixed problem where the "Find an idea" and "Spyglass" options were
          both going to the same spot.
        </List.Item>
        <List.Item>Improved mobile UI experience</List.Item>
        <List.Item>
          Early phases of <Link to="/tags">Tags</Link> feature
        </List.Item>
      </List>
    ),
  },
];

// Helper function to extract text content from React nodes
const getReactNodeTextContent = (node: React.ReactNode): string => {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getReactNodeTextContent).join("");
  if (React.isValidElement(node) && node.props) {
    const children = node.props.children;
    if (children) return getReactNodeTextContent(children);
  }
  return "";
};

export default function Updates() {
  const [openedUpdate, setOpenedUpdate] = useState<IUpdate>();
  const [query, setQuery] = useState("");

  const {
    actions: {
      feedback: { openFeedbackModal },
    },
  } = useInteraction();

  return (
    <PageWrapper>
      <LeftSidebar />
      <Container w="100%" pt="lg">
        <Stack>
          <Title>Qwest Updates</Title>
          <Text c="dimmed" size="sm">
            We are constantly working to make Qwest a better app for you.
            However, we couldn't do it without your valuable input! Don't
            hesitate to submit an idea or a bug report :)
          </Text>
          <Group>
            <Button
              variant="light"
              leftSection={<MegaphoneSimple />}
              onClick={() => {
                openFeedbackModal();
              }}
            >
              Give us feedback!
            </Button>
          </Group>
          <Card withBorder radius={"lg"}>
            <Title fw="bold" order={3}>
              Roadmap
            </Title>
            <Divider my="md" />
            <Text fw="bold">In progress</Text>
            <Text>
              Currently we are working on the Spotlight feature, and next we'll
              be tackling a new project concept called "Rabbitholes".
            </Text>
            <Divider my="md" />
            <Text fw="bold">Up next</Text>
            <Text c="dimmed" size="xs" fs="italic">
              *(Potentially not in this order)
            </Text>
            <List>
              <List.Item>Idea editor improvements</List.Item>
              <List.Item>Search improvements</List.Item>
            </List>
            <Divider my="md" />
            <Group>
              <Button
                variant="light"
                leftSection={<MegaphoneSimple />}
                onClick={() => {
                  openFeedbackModal();
                }}
              >
                What do you think?
              </Button>
            </Group>
          </Card>
        </Stack>
        <Divider my="lg" />
        <TextInput
          placeholder="Filter updates by title, date, or content..."
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          mb="lg"
        />
        <Grid>
          {updates
            .filter((update) => {
              const lowerQuery = query.toLowerCase();
              if (!lowerQuery) return true; // Show all if query is empty

              const titleMatch = update.title
                .toLowerCase()
                .includes(lowerQuery);
              const dateMatchFormatted = formatDate(update.date)
                .toLowerCase()
                .includes(lowerQuery);

              // Attempt to parse the query as a date and match it directly
              const parsedQueryDate = new Date(lowerQuery);
              const isQueryDateValid = !isNaN(parsedQueryDate.getTime());

              const dateMatchObject =
                isQueryDateValid &&
                parsedQueryDate.getFullYear() === update.date.getFullYear() &&
                parsedQueryDate.getMonth() === update.date.getMonth() &&
                parsedQueryDate.getDate() === update.date.getDate();

              const dateMatch = dateMatchFormatted || dateMatchObject;
              const contentText = getReactNodeTextContent(update.details);
              const contentMatch = contentText
                .toLowerCase()
                .includes(lowerQuery);

              return titleMatch || dateMatch || contentMatch;
            })
            .map((update) => {
              return (
                <Grid.Col>
                  <Card
                    withBorder
                    radius="lg"
                    onClick={() => {
                      setOpenedUpdate(update);
                    }}
                  >
                    <Stack gap="sm">
                      <Text fw="bold">{update.title}</Text>
                      <Text c="dimmed" size="xs">
                        {capitalize(formatDate(update.date))}
                      </Text>
                      {update.details}
                    </Stack>
                  </Card>
                </Grid.Col>
              );
            })}
          <Drawer
            opened={!!openedUpdate}
            onClose={() => {
              setOpenedUpdate(undefined);
            }}
            position="right"
          >
            <Title>{openedUpdate?.title}</Title>
            {openedUpdate?.details}
          </Drawer>
        </Grid>
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}
