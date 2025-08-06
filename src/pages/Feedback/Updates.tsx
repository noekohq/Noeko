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
import StatusBar from "../../components/UI/Layout/Bottom";

type IUpdate = {
  title: string;
  details: React.ReactNode;
  date: Date;
};

const updates: IUpdate[] = [
  {
    date: new Date("August 5, 2025"),
    title: "Tasks! And more useful features.",
    details: (
      <>
        <Stack>
          <Text>
            Your brain isn't just full of ideas, but also actions to take and
            goals to pursue. Tasks in Qwest rise to meet these, and we're just
            getting started! We also are making consistent updates to the editor
            and the dashboard, working constantly to make the entire Qwest
            experience significantly more user friendly and cohesive. Please
            don't hesitate to leave feedback as we build features!
          </Text>
          <List>
            <List.Item>Added tasks to Qwest</List.Item>
            <List.Item>
              A new "today's tasks" widget on your dashboard, letting you see
              all of the tasks scheduled for today.
            </List.Item>
            <List.Item>
              Making connections within the editor now supports both semantic
              and text-based search
            </List.Item>
            <List.Item>
              Use familiar <code>[[]]</code> syntax to make connections instead
              of <code>$</code>
            </List.Item>
            <List.Item>
              A significantly better selection menu, highlight some text and
              work with it from the menu.
            </List.Item>
          </List>
        </Stack>
      </>
    ),
  },
  {
    date: new Date("July 31, 2025"),
    title: "A Major Dashboard Overhaul!",
    details: (
      <>
        <Stack>
          <Text>
            Introducing Widgets! Widgets are the building blocks of your
            dashboard, providing you a birds eye view and a way to easily
            interact with your entire knowledge base!
          </Text>
        </Stack>
      </>
    ),
  },
  {
    date: new Date("July 20, 2025"),
    title: "Rabbitholes, Faster Search, and other improvements",
    details: (
      <>
        <Stack>
          <Text>
            Introducing Rabbitholes! When you get that urge to go deep into a
            subject and really chew on it, you can create and then enter a
            Rabbithole. Once in a Rabbithole, every new note or tag that you add
            will be automatically added to your Rabbithole, and searches will be
            limited. This functionality is still in active development, so
            please report any bugs if you find them!
          </Text>

          <List>
            <List.Item>Rabbitholes! Try them out!</List.Item>
            <List.Item>
              Graph should feel faster now, and should be more user friendly
              (but we still have a lot of planned improvements here.)
            </List.Item>
            <List.Item>
              Search is now faster, rather than waiting seconds to find what
              you're looking for, you should be looking at sub-second search
              times.
            </List.Item>
          </List>
        </Stack>
      </>
    ),
  },
  {
    date: new Date("July 8, 2025"),
    title: "Sharing notes with other users",
    details: (
      <>
        <Stack>
          <Text>
            We got tired of copy-pasting, or having to export notes to share
            them with others, so we decided to add access controls to ideas. YOu
            can now manage access to specific ideas, and allow other users to
            view them form the right sidebar in an idea.
          </Text>

          <List>
            <List.Item>
              Access controls for ideas, share with other users
            </List.Item>
            <List.Item>Minor UI updates</List.Item>
            <List.Item>Improvements to Spyglass</List.Item>
          </List>
        </Stack>
      </>
    ),
  },
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
    title: "Constellation improvements, better shortcuts",
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
      newTask,
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
          <Card withBorder radius={"lg"}>
            <Title fw="bold" order={3}>
              Roadmap
            </Title>
            <Divider my="md" />
            <Text fw="bold">In progress</Text>
            <Text>
              Currently we are working on integrating tasks with the rest of
              Qwest, as well as general user-experience updates. In the
              background, we're also laying the ground work for a big
              integration of your own sources into Qwest, so that you can deeply
              integrate outside sources of information into the application.
            </Text>
            <Divider my="md" />
            <Text fw="bold">Up next</Text>
            <Text c="dimmed" size="xs" fs="italic">
              *(Potentially not exactly in this order)
            </Text>
            <List>
              <List.Item>
                Add your owns sources (PDFs, Websites, YouTube videos, etc)
              </List.Item>
              <List.Item>Improvements to latency and speed.</List.Item>
              <List.Item>Better knowledge capture (voice mode, etc)</List.Item>
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
              <Button onClick={() => newTask()}>Add a task!</Button>
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
      <StatusBar />
      <RightSidebar />
    </PageWrapper>
  );
}
