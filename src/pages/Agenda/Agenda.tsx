import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import Nav from "../../components/UI/Layout/Nav";
import RightSidebar from "../../components/UI/Layout/Right";
import TopBar from "../../components/UI/Layout/TopBar";
import UnderConstruction from "../../components/Utils/UnderConstruction";

export default function Agenda() {
  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <h1>Your agenda</h1>
        <UnderConstruction />
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
