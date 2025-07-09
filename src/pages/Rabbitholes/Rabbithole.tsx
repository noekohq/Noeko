import { Stack, Text, Title } from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import { IRabbithole } from "../../../app/database/models/rabbithole";
import { useParams } from "react-router";
import { showNotification } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { api } from "../../server/api";
import styles from "./Rabbithole.module.scss";

export default function Rabbithole() {
  const { rabbitholeId } = useParams();
  const { data: rabbithole, load: loadRabbithole } = useFetch<
    undefined,
    IRabbithole
  >({
    url: `/rabbitholes/${rabbitholeId}`,
    onError: (error) => {
      console.error("Something went wrong fetching rabbithole", error);
      showNotification({
        title: "Something went wrong",
        message: "Please try again later",
        color: "red",
      });
    },
  });

  const [loadingSaveChanges, setLoadingSaveChanges] = useState(false);
  useEffect(() => {
    console.log("Rabbithole id: ", rabbitholeId);
    loadRabbithole();
  }, []);

  useDocumentTitle(`${rabbithole?.name || "Loading..."} - Qwest`);

  const updateTitle = async (newTitle: string) => {
    setLoadingSaveChanges(true);
    await api
      .put(`/rabbitholes/${rabbitholeId}`, {
        title: newTitle,
      })
      .then(() => {
        loadRabbithole();
      })
      .finally(() => {
        setLoadingSaveChanges(false);
      });
  };
  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
        <Stack>
          <Title
            order={1}
            m="0"
            pr="md"
            suppressContentEditableWarning
            onBlur={(e) => {
              updateTitle(e.currentTarget.innerText);
            }}
            dangerouslySetInnerHTML={{ __html: rabbithole?.name || "" }}
            className={styles.editableTitle}
          />
          <Text c="gray" size="md">
            Nothing here yet...
          </Text>
        </Stack>
      </Content>
      <RightSidebar />
    </PageWrapper>
  );
}
