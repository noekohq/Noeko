import { useEffect } from "react";
import { useParams } from "react-router";
import useFetch from "../../../hooks/useFetch";
import { IViewOnlyIdea } from "../../../../app/database/models/ideas";
import PageWrapper from "../../../components/Layout/PageWrapper";
import LeftSidebar from "../../../components/UI/Layout/Left";
import Content from "../../../components/UI/Layout/Content";
import RightSidebar from "../../../components/UI/Layout/Right";
import { Stack, Text, Title } from "@mantine/core";
import { IPublicUser } from "../../../../app/database/models/user";
import { userFormattedName } from "../../../utils/user";
import StatusBar from "../../../components/UI/Layout/Bottom";

export default function ViewonlyIdea() {
  const { ideaId } = useParams();

  const { load: loadIdea, data } = useFetch<
    undefined,
    { idea: IViewOnlyIdea; authors: IPublicUser[] }
  >({
    url: `/ideas/shared/${ideaId}`,
  });

  useEffect(() => {
    loadIdea();
  }, []);

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Title>{data?.idea?.title}</Title>
          <Text fs="italic" c="dimmed">
            by{" "}
            {data?.authors
              .map((author) => {
                return userFormattedName(author);
              })
              .join(", ")}
          </Text>
          <div
            dangerouslySetInnerHTML={{
              __html: data?.idea?.content || "",
            }}
          />
        </Stack>
      </Content>
      <StatusBar />
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
