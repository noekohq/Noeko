import { Box, Button, Card, Group, Kbd, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import PageWrapper from "@core/design/layout/PageWrapper";
import Search from "@domains/discovery/components/Search/Search";
import StatusBar from "@core/design/components/Layout/Bottom";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import React from "react";
import { getOS } from "@core/utils/platform";
import Shortcut from "@/core/design/components/Help/Shortcut";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";

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
