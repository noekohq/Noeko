import { useEffect } from "react";
import { IUserFile } from "../../../shared/types/userfile";
import PageWrapper from "@/components/Layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import useFetch from "@core/hooks/useFetch";
import { Group, Stack, Text, Title } from "@mantine/core";
import FileCard from "@domains/knowledge/components/Files/FileCard";
import TopBar from "@core/design/components/Layout/TopBar";

export default function FileList() {
  const { load: getFiles, data: files } = useFetch<undefined, IUserFile[]>({
    url: "/files",
  });

  useEffect(() => {
    getFiles();
  }, []);

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Title>
            <Group>Your Files</Group>
          </Title>
          <Text c="dimmed" size="xs">
            All of the files you've uploaded to Noeko...
          </Text>
          {files?.map((file) => {
            return <FileCard file={file} key={file.id.toString()} />;
          })}
        </Stack>
      </Content>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
