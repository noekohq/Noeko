import PageWrapper from "@core/design/layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import Nav from "@core/design/components/Layout/Nav";
import RightSidebar from "@core/design/components/Layout/Right";
import TopBar from "@core/design/components/Layout/TopBar";
import UnderConstruction from "@core/design/components/Utils/UnderConstruction";
import { Trans } from "@lingui/react/macro";

export default function Agenda() {
  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <h1>
          <Trans>Your agenda</Trans>
        </h1>
        <UnderConstruction />
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
