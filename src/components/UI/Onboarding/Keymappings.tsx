import { Box, Card, Stack, Title } from "@mantine/core";
import PageWrapper from "../../Layout/PageWrapper";
import Content from "../Layout/Content";
import LeftSidebar from "../Layout/Left";
import { IOnboardingProps } from "./Index";
import RightSidebar from "../Layout/Right";
import StatusBar from "../Layout/Bottom";
import { getOS } from "../../../utils/platform";
import Shortcut from "../../Utils/Help/Shortcut";

export default function Hotkeys({}: IOnboardingProps) {
  const isMacos = getOS() === "macos";
  const primaryKey = isMacos ? "⌘" : "Ctrl";

  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
        <Stack>
          <Title></Title>
          <Card radius="lg" withBorder>
            <Stack gap="sm">
              <Shortcut keys={[primaryKey, "K"]} description="Open Spotlight" />
            </Stack>
          </Card>
        </Stack>
      </Content>
      <StatusBar />
      <RightSidebar />
    </PageWrapper>
  );
}
