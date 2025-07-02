import PageWrapper from "../../components/Layout/PageWrapper";
import Search from "../../components/Search/Search";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";

export default function SearchPage() {
  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
        <Search />
      </Content>
      <RightSidebar />
    </PageWrapper>
  );
}
