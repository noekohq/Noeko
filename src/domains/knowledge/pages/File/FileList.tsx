import PageWrapper from "@core/design/layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import { Group, Stack, Text, Title } from "@mantine/core";
import FileCard from "@domains/knowledge/components/Files/FileCard";
import TopBar from "@core/design/components/Layout/TopBar";
import { useFiles } from "@domains/knowledge/hooks/useFile";

export default function FileList() {
  const { data: files = [] } = useFiles();

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
          {files.map((file) => {
            return <FileCard file={file} key={file.id.toString()} />;
          })}
        </Stack>
      </Content>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
