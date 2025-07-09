import { Button, Card, Group, Loader, Stack, Text, Title } from "@mantine/core";
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
import SuggestTags from "../../components/Search/SuggestTags";
import { ITag } from "../../../app/database/models/tag";
import { useLandscape } from "../../contexts/LandscapeContext";
import { DoorOpenIcon, RabbitIcon } from "@phosphor-icons/react";
import { IIdea } from "../../../app/database/models/ideas";

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

  useEffect(() => {
    console.log("Rabbithole id: ", rabbitholeId);
    loadRabbithole();
  }, []);

  const {
    data: relatedIdeas,
    loading: loadingRelatedIdeas,
    errors: relatedIdeaErrors,
    load: reloadRelatedIdeas,
  } = useFetch<undefined, IIdea[]>({
    url: `/rabbitholes/${rabbitholeId}/similar-ideas`,
    runOnMount: true,
  });

  const {
    rabbitholes: {
      entered: { set: setEntered, get: currentlyEntered },
    },
  } = useLandscape();
  const isEntered =
    currentlyEntered?.id.toString() === rabbithole?.id.toString();

  useDocumentTitle(`${rabbithole?.name || "Loading..."} - Qwest`);

  const [loadingSaveChanges, setLoadingSaveChanges] = useState(false);

  const updateTitle = async (newTitle: string) => {
    setLoadingSaveChanges(true);
    await api
      .put(`/rabbitholes/${rabbitholeId}`, {
        name: newTitle,
      })
      .then(() => {
        loadRabbithole();
      })
      .finally(() => {
        setTimeout(() => {
          setLoadingSaveChanges(false);
        }, 1000);
      });
  };

  const handleAddTag = async (tag: ITag) => {
    try {
    } catch (error) {}
  };

  const handleEnterRabbithole = () => {
    if (!rabbithole) {
      showNotification({
        title: "Something went wrong",
        message: "Please try again later",
        color: "red",
      });
      return;
    }
    setEntered(rabbithole);
  };

  const handleExitRabbithole = () => {
    setEntered(null);
  };

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Collapsed>
          {loadingSaveChanges && <Loader size="xs" color="gray" />}
        </LeftSidebar.Collapsed>
      </LeftSidebar>
      <Content>
        <Stack gap="xl">
          <Title
            ta="center"
            order={1}
            m="0"
            pr="md"
            contentEditable={true}
            suppressContentEditableWarning
            onBlur={(e) => {
              updateTitle(e.currentTarget.innerText);
            }}
            dangerouslySetInnerHTML={{ __html: rabbithole?.name || "" }}
            className={styles.editableTitle}
          />
          <SuggestTags onSelect={handleAddTag} size="sm" />
          <Card
            withBorder
            classNames={{
              root: styles.contentArea,
            }}
          >
            <Stack>
              {!rabbithole?.includes?.length && (
                <Text size="sm" ta="center">
                  Start by adding tags or ideas to your rabbithole!
                </Text>
              )}
              <Group justify="center">
                {isEntered ? (
                  <Button
                    variant="default"
                    leftSection={<DoorOpenIcon />}
                    onClick={() => {
                      handleExitRabbithole();
                    }}
                  >
                    Exit Rabbithole
                  </Button>
                ) : (
                  <Button
                    variant="light"
                    leftSection={<RabbitIcon />}
                    onClick={() => {
                      handleEnterRabbithole();
                    }}
                    color="green"
                  >
                    Enter Rabbithole
                  </Button>
                )}
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Content>
      <RightSidebar />
    </PageWrapper>
  );
}
