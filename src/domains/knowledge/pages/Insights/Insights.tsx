import { Title } from "@mantine/core";
import { Trans } from "@lingui/react/macro";
import PageWrapper from "@core/design/layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import StatusBar from "@core/design/components/Layout/Bottom";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";

export default function Insights() {
  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar></LeftSidebar>
      <Content>
        <Title>
          <Trans>Insights</Trans>
        </Title>
      </Content>
      <Nav />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
