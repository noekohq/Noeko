import { Container } from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";

export default function Oracle() {
  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Container w="100%">I am the Oracle</Container>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
