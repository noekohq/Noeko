import React from "react";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import { Title } from "@mantine/core";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";

export default function Rabbithole() {
  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
        <Title>Rabbithole</Title>
      </Content>
      <RightSidebar />
    </PageWrapper>
  );
}
