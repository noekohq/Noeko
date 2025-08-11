import { useEffect } from "react";
import { IUserFile } from "../../../app/database/models/userfile";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import styles from "./FileList.module.scss";
import { Group, Stack, Title } from "@mantine/core";
import FileCard from "../../components/Display/Files/FileCard";

export default function FileList() {
  const { load: getFiles, data: files } = useFetch<undefined, IUserFile[]>({
    url: "/files",
  });

  useEffect(() => {
    getFiles();
  }, []);

  console.log("Files: ", files);

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Group>
            <Title>Your files</Title>
          </Group>
          {files?.map((file) => {
            return <FileCard file={file} key={file.id.toString()} />;
          })}
        </Stack>
      </Content>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
