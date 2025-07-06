import { Title } from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";

export default function Insights() {
  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Title>Insights</Title>
      </Content>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
