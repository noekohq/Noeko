import { Box, Button, Card, Group, Kbd, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import Search from "../../components/Search/Search";
import StatusBar from "../../components/UI/Layout/Bottom";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import React from "react";
import { getOS } from "../../utils/platform";
import Shortcut from "../../components/Utils/Help/Shortcut";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";

export default function Keymap() {
  const isMacos = getOS() === "macos";
  const primaryKey = isMacos ? "⌘" : "Ctrl";

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <Stack gap="sm">
          <Title>Keymap</Title>
          <Text>
            Noeko is built with power-users in mind, providing a rich hotkey specification. In the
            future, these will be modifiable.
          </Text>
          <SimpleGrid
            cols={{
              sm: 1,
              md: 2,
            }}
          >
            <Card radius="lg" withBorder>
              <Stack gap="sm">
                <Text fw="bold">UTILITIES</Text>
                <Text>Use these to execute commands or perform actions.</Text>
                <Shortcut keys={[primaryKey, "K"]} description="Open Spotlight" />
                <Shortcut keys={[primaryKey, "shift", "i"]} description="New idea" />
                <Shortcut keys={[primaryKey, "shift", "u"]} description="New source" />
              </Stack>
            </Card>
            <Card radius="lg" withBorder>
              <Stack gap="sm">
                <Text fw="bold">NAVIGATION</Text>
                <Text>Use these to get around Noeko faster.</Text>
                <Shortcut keys={[primaryKey, "shift", "h"]} description="Home" />
                <Shortcut keys={[primaryKey, "shift", "g"]} description="Constellation" />
                <Shortcut keys={[primaryKey, "shift", "b"]} description="Idea list" />
                <Shortcut keys={[primaryKey, "."]} description="Settings" />
                <Shortcut keys={[primaryKey, "shift", "/"]} description="Spyglass" />
              </Stack>
            </Card>
          </SimpleGrid>
        </Stack>
      </Content>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
