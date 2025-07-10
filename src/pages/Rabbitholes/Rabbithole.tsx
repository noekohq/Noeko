import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Overlay,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import { IRabbithole } from "../../../app/database/models/rabbithole";
import { useNavigate, useParams } from "react-router";
import { showNotification } from "@mantine/notifications";
import { useEffect, useRef, useState } from "react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { api } from "../../server/api";
import styles from "./Rabbithole.module.scss";
import SuggestTags from "../../components/Search/SuggestTags";
import { ITag } from "../../../app/database/models/tag";
import { useLandscape } from "../../contexts/LandscapeContext";
import { DoorOpenIcon, InfoIcon, RabbitIcon } from "@phosphor-icons/react";
import { IIdea } from "../../../app/database/models/ideas";
import { CompactIdeaCard } from "../../components/Display/Ideas/IdeaCards";
import Search from "../../components/Search/Search";
import { includeThing, unIncludeThing } from "../../utils/rabbitholes";
import { BlockTag } from "../../components/Tags/TagDisplay";
import { RecordId } from "surrealdb";

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
    console.log("Mounting!");
  }, []);

  useEffect(() => {
    loadRabbithole();
  }, [rabbitholeId]);

  const {
    data: relatedIdeas,
    loading: loadingRelatedIdeas,
    errors: relatedIdeaErrors,
    load: loadRelatedIdeas,
  } = useFetch<undefined, IIdea[]>({
    url: `/rabbitholes/${rabbitholeId}/similar-ideas`,
    dependencies: [rabbitholeId],
  });

  const sendingRequest = useRef(false);
  useEffect(() => {
    if (rabbitholeId && !sendingRequest.current) {
      (async () => {
        sendingRequest.current = true;
        await loadRelatedIdeas();
        sendingRequest.current = false;
      })();
    }
  }, [rabbitholeId]);

  const handleRefresh = () => {
    loadRabbithole();
    loadRelatedIdeas();
  };

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

  const thingIsConnected = (thingId: string) => {
    return !!rabbithole?.includes?.find((i) => i.id.toString() === thingId);
  };

  const currentlyAddingTag = useRef(false);
  const handleAddTag = async (tag: ITag) => {
    try {
      if (currentlyAddingTag.current) {
        console.log("Not adding when currently adding...");
        return false;
      }
      if (thingIsConnected(tag.id.toString()) || !rabbitholeId) {
        showNotification({
          title: "Can't connect again",
          message: "Can't connect this idea again.",
          color: "yellow",
        });
        return;
      }
      currentlyAddingTag.current = true;
      await includeThing(rabbitholeId, tag.id.toString());
    } catch (error) {
      console.error("Error adding tag: ", error);
      showNotification({
        title: "Error adding tag",
        message: "Something went wrong adding the tag",
        color: "red",
      });
    } finally {
      currentlyAddingTag.current = false;
    }
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

  const [draggingOver, setDraggingOver] = useState(false);

  const currentlyAdding = useRef(false);
  const handleConnectionDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    try {
      console.log(
        "Handling drop: ",
        e.dataTransfer.getData("application/json"),
      );
      if (!rabbithole) {
        console.log("Rabbithole gone");
        return;
      }
      if (currentlyAdding.current) {
        console.log("Currently adding is true");
        return;
      }
      const jData = e.dataTransfer.getData("application/json");
      const data = JSON.parse(jData) as { ideaId: string };
      const { ideaId } = data;
      if (thingIsConnected(ideaId)) {
        showNotification({
          title: "Can't connect again",
          message: "Can't connect this idea again.",
          color: "yellow",
        });
        return;
      }
      currentlyAdding.current = true;
      await includeThing(rabbithole.id.toString(), ideaId);
      currentlyAddingTag.current = false;
      handleRefresh();
    } catch (error) {
      console.error("Error creating connection: ", error);
    } finally {
      setDraggingOver(false);
      currentlyAddingTag.current = false;
    }
  };

  const handleUninclude = (thingId: string | RecordId) => {
    if (!rabbithole?.id.toString()) {
      return;
    }
    unIncludeThing(rabbithole?.id.toString(), thingId.toString()).then(() => {
      handleRefresh();
    });
  };

  const navigate = useNavigate();

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Collapsed>
          {loadingSaveChanges && <Loader size="xs" color="gray" />}
        </LeftSidebar.Collapsed>
        <LeftSidebar.Open>
          <Stack>
            <Title order={3}>Suggested Ideas</Title>
            {relatedIdeas?.map((idea) => {
              return (
                <CompactIdeaCard
                  key={idea.id.toString()}
                  onCardClick={() => {
                    navigate(`/idea/${idea.id.toString()}`);
                  }}
                  idea={idea}
                  draggable
                />
              );
            })}
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <div
          onDragOver={() => {
            setDraggingOver(true);
          }}
          onDrop={(e) => {
            handleConnectionDrop(e);
          }}
          onDragLeave={(e) => {
            setDraggingOver(false);
          }}
        >
          {draggingOver && (
            <Overlay
              backgroundOpacity={0}
              blur={4}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                handleConnectionDrop(e);
              }}
              radius={"lg"}
            >
              <Group align="center" justify="center" style={{ height: "100%" }}>
                <Text c="white" mx="lg" size="sm">
                  Drop here to include an idea!
                </Text>
              </Group>
            </Overlay>
          )}
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
              radius="lg"
              classNames={{
                root: styles.contentArea,
              }}
            >
              {!rabbithole?.includes?.length && (
                <Text size="sm" ta="center">
                  Start by adding tags or ideas to your rabbithole!
                </Text>
              )}
              {!rabbithole?.includes?.length && (
                <Alert color="gray" title="Tip" icon={<InfoIcon />} radius="lg">
                  You can drag and drop ideas from the search results into this
                  area to include them!
                </Alert>
              )}
              {!!rabbithole?.includes?.length && (
                <SimpleGrid
                  cols={{
                    sm: 1,
                    md: 2,
                    lg: 3,
                  }}
                >
                  {rabbithole.includes
                    .map((thing) => {
                      if (thing.id.toString().startsWith("idea")) {
                        const idea = thing as IIdea;
                        return (
                          <CompactIdeaCard
                            key={idea.id.toString()}
                            onCardClick={() => {
                              navigate(`/idea/${idea.id.toString()}`);
                            }}
                            idea={idea}
                            actions={[
                              {
                                icon: <DoorOpenIcon />,
                                id: "uninclude",
                                label: `Uninclude`,
                                onClick: () => {
                                  handleUninclude(thing.id.toString());
                                },
                                tooltip: `Uninclude ${idea?.title} from ${rabbithole?.name}`,
                                color: "red",
                              },
                            ]}
                          />
                        );
                      }
                      if (thing.id.toString().startsWith("tag")) {
                        const tag = thing as ITag;
                        return (
                          <Card key={tag.id.toString()} withBorder radius="lg">
                            <BlockTag tag={tag} />
                          </Card>
                        );
                      }
                    })
                    .filter((i) => !!i)
                    .slice(0, 8)}
                </SimpleGrid>
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
            </Card>
          </Stack>
        </div>
      </Content>
      <RightSidebar>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
