import { useEffect } from "react";
import { IUserFile } from "../../../app/database/models/userfile";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import styles from "./FileList.module.scss";
import { ActionIcon, Group, Stack, Text, Title } from "@mantine/core";
import FileCard from "../../components/Display/Files/FileCard";
import { useInteraction } from "../../contexts/InteractionContext";
import { PlusIcon } from "@phosphor-icons/react";

export default function FileList() {
  const { load: getFiles, data: files } = useFetch<undefined, IUserFile[]>({
    url: "/files",
  });

  useEffect(() => {
    getFiles();
  }, []);

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Title>
            <Group>Your Files</Group>
          </Title>
          <Text c="dimmed" size="xs">
            All of the files you've uploaded to Qwest...
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
