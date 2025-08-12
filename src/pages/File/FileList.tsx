import { useEffect } from "react";
import { IUserFile } from "../../../app/database/models/userfile";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import styles from "./FileList.module.scss";
import { ActionIcon, Group, Stack, Title } from "@mantine/core";
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

  console.log("Files: ", files);

  const {
    actions: { newFile },
  } = useInteraction();

  return (
    <PageWrapper>
      <LeftSidebar></LeftSidebar>
      <Content>
        <Stack>
          <Title>
            <Group>
              Your Sources
              <ActionIcon
                variant="light"
                color="gray"
                onClick={() => {
                  newFile();
                }}
              >
                <PlusIcon weight="bold" />
              </ActionIcon>
            </Group>
          </Title>
          {files?.map((file) => {
            return <FileCard file={file} key={file.id.toString()} />;
          })}
        </Stack>
      </Content>
      <RightSidebar></RightSidebar>
    </PageWrapper>
  );
}
