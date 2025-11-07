import PageWrapper from "../../components/Layout/PageWrapper";
import Search from "../../components/Search/Search";
import StatusBar from "../../components/UI/Layout/Bottom";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import Nav from "../../components/UI/Layout/Nav";
import RightSidebar from "../../components/UI/Layout/Right";

export default function SearchPage() {
  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>CLEAN SLATE</Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
