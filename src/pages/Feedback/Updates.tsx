import {
  Button,
  Card,
  Container,
  Divider,
  Drawer,
  Grid,
  Group,
  Kbd,
  List,
  Space,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { Link } from "react-router";
import React, { useState } from "react";
import { useInteraction } from "../../contexts/InteractionContext";
import { MegaphoneSimple, MegaphoneSimpleIcon } from "@phosphor-icons/react";
import { capitalize, formatDate } from "../../utils/formatting";
import Content from "../../components/UI/Layout/Content";

type IUpdate = {
  title: string;
  details: React.ReactNode;
  date: Date;
};

const updates: IUpdate[] = [
  {
    date: new Date("July 5, 2025"),
    title: "Spyglass follow-ups, better highlighting",
    details: (
      <>
        <Stack>
          <Text>
            We are continuing to work on Spyglass, working to constantly improve
            it. Now we are also moving towards a project-creation flow which
            will allow for more streamlined thought.
          </Text>

          <List>
            <List.Item>Spyglass Follow-up questions</List.Item>
            <List.Item>
              Spyglass highlighting and more robust citations.
            </List.Item>
          </List>
        </Stack>
      </>
    ),
  },
  {
    date: new Date("July 3, 2025"),
    title: "Layout updates and Spyglass Continues to Improve",
    details: (
      <>
        <Stack>
          <List>
            <List.Item>
              Sidebars will no longer have jerky movements, and are cleaner in
              nature
            </List.Item>
            <List.Item>
              Mobile and Tablet platforms now work responsively
            </List.Item>
            <List.Item>
              Generally, the UI has improved substantially, though more updates
              are always underway
            </List.Item>
            <List.Item>
              Continued work on Spyglass has brought improvements to accuracy,
              speed, and flow
            </List.Item>
          </List>
        </Stack>
      </>
    ),
  },
  {
    date: new Date("June 21, 2025"),
    title: "Even more Spyglass updates",
    details: (
      <Stack>
        <Text>
          Spyglass will now stream text, and all you to see more details about
          your search.
        </Text>
        <Text>
          We would love any feedback you might have on{" "}
          <Link to="/spyglass">Spyglass</Link> :)
        </Text>
      </Stack>
    ),
  },
  {
    date: new Date("June 18, 2025"),
    title: "Major refresh to Spyglass",
    details: (
      <Stack>
        <Text>
          We took some time to increase the usability and utility of Spyglass
          search.
        </Text>
        <List>
          <List.Item>
            Drastically improved UI for <Link to={"/spyglass"}>Spyglass</Link>.
          </List.Item>
          <List.Item>
            Better grounding of search results in source material.
          </List.Item>
          <List.Item>
            More intuitive indication of current step in multi-stage Spyglass
            process.
          </List.Item>
          <List.Item>
            Removing redundant information and making it easy to get utility.
          </List.Item>
          <List.Item>
            View your <Link to="/spyglass/search">Spyglass Search History</Link>{" "}
            now from <Link to="/settings">Settings</Link>.
          </List.Item>
        </List>
      </Stack>
    ),
  },
  {
    date: new Date("June 13, 2025"),
    title: "Some editor features, find ideas quickly",
    details: (
      <Stack>
        <Text>
          We took some time to make navigation around the application
          significantly better, as well as generally improving search.
        </Text>
        <List>
          <List.Item>Added YouTube videos to the editor.</List.Item>
          <List.Item>More robust keyboard shortcuts.</List.Item>
          <List.Item>Updates to Spotlight usability.</List.Item>
          <List.Item>
            You can now reach us directly at{" "}
            <a href="mailto:support@qwest.so">support@qwest.so</a>
          </List.Item>
        </List>
      </Stack>
    ),
  },
  {
    date: new Date("June 12, 2025"),
    title: "Editor overhaul, additional updates",
    details: (
      <Stack>
        <Text>Overall we took some time to make the editor a better.</Text>
        <List>
          <List.Item>Added tables to editor.</List.Item>
          <List.Item>Improved connections UI (use '$').</List.Item>
          <List.Item>Added "/" prefix for suggestion menu.</List.Item>
          <List.Item>Improvements to code blocks in the editor.</List.Item>
        </List>
      </Stack>
    ),
  },
  {
    date: new Date("June 2, 2025"),
    title: "Improvements to Spyglass, Initial Spotlight Search feature",
    details: (
      <List>
        <List.Item>Made Spyglass results more informative.</List.Item>
        <List.Item>Improved Spyglass UI overall.</List.Item>
        <List.Item>
          Most instances of Right Sidebar search results are not draggable, and
          can be used to create connections to tags or ideas.
        </List.Item>
        <List.Item>
          Started on Spotlight Search Feature <Kbd>Ctrl + k</Kbd>
        </List.Item>
      </List>
    ),
  },
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
      <Content>
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
              leftSection={<MegaphoneSimpleIcon />}
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
                leftSection={<MegaphoneSimpleIcon />}
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
                <Grid.Col key={update.title + update.date.toISOString()}>
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
      </Content>
      <RightSidebar />
    </PageWrapper>
  );
}
