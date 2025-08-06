import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  HoverCard,
  Loader,
  Overlay,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Transition,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import { IRabbithole } from "../../../app/database/models/rabbithole";
import { Link, useNavigate, useParams } from "react-router";
import { showNotification } from "@mantine/notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { api } from "../../server/api";
import styles from "./Rabbithole.module.scss";
import SuggestTags from "../../components/Search/SuggestTags";
import { ITag } from "../../../app/database/models/tag";
import { useLandscape } from "../../contexts/LandscapeContext";
import {
  CaretLeftIcon,
  DoorIcon,
  DoorOpenIcon,
  InfoIcon,
  PlusIcon,
  RabbitIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { IIdea } from "../../../app/database/models/ideas";
import Search from "../../components/Search/Search";
import {
  deleteRabbithole,
  includeThingInRabbithole,
  unIncludeThingInRabbithole,
} from "../../utils/rabbitholes";
import { BlockTag } from "../../components/Display/Tags/TagDisplay";
import { RecordId } from "surrealdb";
import TagCard from "../../components/Display/Tags/TagCard";
import { useLayout } from "../../contexts/LayoutContext";
import { SearchBar } from "../../components/Search/SearchBar";
import { useSearch } from "../../contexts/SearchContext";
import { IdeaAction } from "../../components/Display/Ideas/IdeaCardTypes";
import { modals } from "@mantine/modals";
import StatusBar from "../../components/UI/Layout/Bottom";
import IdeaCard from "../../components/Display/Ideas/Interactions/IdeaCard";
import RabbitholeThing from "../../components/Display/Rabbitholes/RabbitholeThing";

export default function Rabbithole() {
  const [error, setError] = useState("");
  const { rabbitholeId } = useParams();
  const { data: rabbithole, load: loadRabbithole } = useFetch<
    undefined,
    IRabbithole
  >({
    url: `/rabbitholes/${rabbitholeId}`,
    dependencies: [rabbitholeId],
    onError: (error) => {
      console.error("Something went wrong fetching rabbithole", error);
      setError("Something went wrong fetching rabbithole.");
      showNotification({
        title: "Something went wrong",
        message: "Please try again later",
        color: "red",
      });
    },
  });

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

  useEffect(() => {
    if (rabbitholeId) {
      (async () => {
        await loadRelatedIdeas();
      })();
    }
  }, [rabbitholeId]);

  const {
    rabbitholes: {
      entered: {
        set: setEntered,
        get: currentlyEntered,
        reload: reloadRabbitholeContext,
      },
    },
  } = useLandscape();

  const handleRefresh = () => {
    loadRabbithole();
    loadRelatedIdeas();
    reloadRabbitholeContext();
  };

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

  const isIncluded = (thingId: string) => {
    return !!rabbithole?.includes?.find((i) => i.id.toString() === thingId);
  };

  const currentlyAddingTag = useRef(false);
  const handleAddTag = async (tag: ITag) => {
    try {
      if (currentlyAddingTag.current) {
        return false;
      }
      if (isIncluded(tag.id.toString()) || !rabbitholeId) {
        showNotification({
          title: "Can't connect again",
          message: "Can't connect this idea again.",
          color: "yellow",
        });
        return;
      }
      currentlyAddingTag.current = true;
      await includeThingInRabbithole(
        rabbitholeId.toString(),
        tag.id.toString(),
      );
    } catch (error) {
      console.error("Error adding tag: ", error);
      showNotification({
        title: "Error adding tag",
        message: "Something went wrong adding the tag",
        color: "red",
      });
    } finally {
      currentlyAddingTag.current = false;
      handleRefresh();
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

  const handleConnectionDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      try {
        if (!rabbithole) {
          return;
        }
        const jData = e.dataTransfer.getData("application/json");
        const data = JSON.parse(jData) as { ideaId: string };
        const { ideaId } = data;
        if (isIncluded(ideaId)) {
          showNotification({
            title: "Can't connect again",
            message: "Can't connect this idea again.",
            color: "yellow",
          });
          return;
        }
        await includeThingInRabbithole(
          rabbithole.id.toString(),
          ideaId.toString(),
        );
        handleRefresh();
      } catch (error) {
        console.error("Error creating connection: ", error);
      } finally {
        setDraggingOver(false);
      }
    },
    [rabbithole],
  );

  const [includingThing, setIsIncludingThing] = useState<string>();
  const handleInclude = (thingId: string | RecordId) => {
    if (!rabbithole?.id.toString()) {
      return;
    }
    setIsIncludingThing(thingId.toString());
    includeThingInRabbithole(
      rabbithole?.id.toString(),
      thingId.toString(),
    ).finally(() => {
      handleRefresh();
      setIsIncludingThing(undefined);
    });
  };

  const isIncludingThing = (thingId: string) => {
    return includingThing === thingId;
  };

  const [unincluding, setUnincluding] = useState<string>();
  const handleUninclude = (thingId: string | RecordId) => {
    if (!rabbithole?.id.toString()) {
      showNotification({
        title: "Something went wrong.",
        message: "Something went wrong unincluding this item.",
      });
      return;
    }
    setUnincluding(thingId.toString());
    unIncludeThingInRabbithole(
      rabbithole?.id.toString(),
      thingId.toString(),
    ).finally(() => {
      handleRefresh();
      setUnincluding(undefined);
    });
  };
  const isUnincluding = (thingId: string) => {
    return unincluding === thingId;
  };

  const navigate = useNavigate();

  const handleDeleteRabbithole = () => {
    modals.openConfirmModal({
      title: "Are you sure?",
      children: <Text>Are you sure you want to delete this Rabbithole?</Text>,
      labels: { confirm: "Yes, Delete", cancel: "No, nevermind" },
      confirmProps: {
        color: "red",
      },
      onConfirm: async () => {
        try {
          if (rabbithole) {
            await deleteRabbithole(rabbithole.id.toString());
            navigate("/");
            showNotification({
              title: "Rabbithole Deleted",
              message: "Rabbithole deleted successfully.",
            });
          }
        } catch (error) {
          console.error(error);
          showNotification({
            title: "Something went wrong",
            message: "Something went wrong deleting this rabbithole.",
          });
        }
      },
    });
  };

  const { isMobile } = useLayout();

  const {
    global: {
      results: { get: searchResults },
    },
  } = useSearch();

  const rabbitholeEnterInfo = () => {
    return `When you enter a rabbithole, every new idea or tag that you create will automatically be included. An indicator will appear to tell you which rabbithole you're in, and you can include things as you go.`;
  };

  const ActionCenter = (
    <Group justify="center" mt="lg">
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
      <HoverCard width="300px">
        <HoverCard.Target>
          <ActionIcon variant="subtle" size="xs" color="gray">
            <InfoIcon />
          </ActionIcon>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Text size="sm">{rabbitholeEnterInfo()}</Text>
        </HoverCard.Dropdown>
      </HoverCard>
      <ActionIcon
        variant="subtle"
        size="xs"
        color="gray"
        onClick={() => {
          handleDeleteRabbithole();
        }}
      >
        <TrashIcon />
      </ActionIcon>
    </Group>
  );

  if (!!error.length) {
    return (
      <PageWrapper>
        <LeftSidebar />
        <Content>
          <Text>
            An unexpected error occured loading this Rabbithole. Please try
            again or <Link to="/">Return home.</Link>
          </Text>
        </Content>
        <RightSidebar />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <LeftSidebar>
        <LeftSidebar.Collapsed>
          {loadingSaveChanges && <Loader size="xs" color="gray" />}
        </LeftSidebar.Collapsed>
        <LeftSidebar.Open>
          <Stack>
            <Title order={3}>Suggested Ideas</Title>
            {!relatedIdeas?.length && (
              <Text>No currently suggested ideas.</Text>
            )}
            <Transition
              mounted={!includingThing && !loadingRelatedIdeas}
              transition="fade-up"
            >
              {(style) => {
                return (
                  <Stack style={style}>
                    {relatedIdeas
                      ?.filter((r) => {
                        return !isIncluded(r.id.toString());
                      })
                      ?.map((idea) => {
                        return (
                          <IdeaCard
                            key={idea.id.toString()}
                            idea={idea}
                            actionsVisible={isMobile ? 1 : undefined}
                            actions={[
                              {
                                id: "connect",
                                icon: isIncludingThing(idea.id.toString()) ? (
                                  <Loader size="sm" />
                                ) : (
                                  <PlusIcon />
                                ),
                                label: "Include",
                                onClick: () => {
                                  handleInclude(idea.id.toString());
                                },
                              },
                            ]}
                          />
                        );
                      })}
                  </Stack>
                );
              }}
            </Transition>
            <Transition
              mounted={!!includingThing || loadingRelatedIdeas}
              transition="fade-up"
            >
              {(styles) => {
                return (
                  <div style={styles}>
                    <Group gap="xs" align="center">
                      <Loader size="xs" />
                      <Text>Looking for related ideas...</Text>
                    </Group>
                  </div>
                );
              }}
            </Transition>
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <Group mb="lg">
          <Link
            to="/rabbitholes"
            style={{
              textDecoration: "none",
            }}
          >
            <Group c="dark.3" gap="xs">
              <CaretLeftIcon weight="bold" size={13} />
              <Text c="dark.3" size="sm">
                Back to Rabbitholes
              </Text>
            </Group>
          </Link>
        </Group>
        <div
          onDragOver={() => {
            setDraggingOver(true);
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
                setDraggingOver(false);
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
            {!isEntered && isMobile && ActionCenter}
            <SuggestTags onSelect={handleAddTag} size="sm" />
            <Transition
              mounted={isEntered}
              transition="fade-up"
              duration={300}
              enterDelay={300}
            >
              {(style) => {
                if (
                  !(isEntered && !!rabbithole && !!rabbithole.includes?.length)
                ) {
                  return (
                    <Text style={style} size="sm" ta="center">
                      There is no content in this rabbithole.
                    </Text>
                  );
                }
                return (
                  <SimpleGrid
                    cols={{
                      sm: 1,
                      md: 2,
                      lg: 3,
                    }}
                    style={style}
                  >
                    {rabbithole.includes
                      .map((thing) => {
                        return (
                          <RabbitholeThing
                            rabbithole={rabbithole}
                            key={thing.id.toString()}
                            thing={thing}
                          />
                        );
                      })
                      .filter((i) => !!i)
                      .slice(0, isEntered ? rabbithole.includes.length : 8)}
                  </SimpleGrid>
                );
              }}
            </Transition>
            <Transition
              mounted={!isEntered}
              transition="fade-up"
              duration={300}
              enterDelay={300}
            >
              {(style) => {
                return (
                  <Card
                    withBorder={!isEntered}
                    radius="lg"
                    classNames={{
                      root: styles.contentArea,
                    }}
                    style={style}
                  >
                    {!rabbithole?.includes?.length && (
                      <Text size="sm" ta="center">
                        Start by adding tags or ideas to your rabbithole!
                      </Text>
                    )}
                    {!rabbithole?.includes?.length && !isMobile && (
                      <Alert
                        color="gray"
                        title="Tip"
                        icon={<InfoIcon />}
                        radius="lg"
                      >
                        You can drag and drop ideas from the search results into
                        this area to include them!
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
                                <IdeaCard
                                  key={idea.id.toString()}
                                  idea={idea}
                                  actions={[
                                    {
                                      icon: <DoorOpenIcon />,
                                      id: "uninclude",
                                      label: `Remove`,
                                      onClick: () => {
                                        handleUninclude(thing.id.toString());
                                      },
                                      tooltip: `Uninclude ${idea?.title} from ${rabbithole?.name}`,
                                      color: "gray",
                                    },
                                  ]}
                                />
                              );
                            }
                            if (thing.id.toString().startsWith("tag")) {
                              const tag = thing as ITag;
                              return (
                                <TagCard
                                  key={tag.id.toString()}
                                  tag={tag}
                                  actions={[
                                    {
                                      icon: <DoorOpenIcon />,
                                      id: "uninclude",
                                      label: `Uninclude`,
                                      onClick: () => {
                                        handleUninclude(thing.id.toString());
                                      },
                                      tooltip: `Uninclude ${tag?.name} from ${rabbithole?.name}`,
                                      color: "red",
                                    },
                                  ]}
                                />
                              );
                            }
                          })
                          .filter((i) => !!i)
                          .slice(0, isEntered ? rabbithole.includes.length : 8)}
                      </SimpleGrid>
                    )}
                    <Transition
                      mounted={!isEntered && !isMobile}
                      transition="fade-up"
                      timingFunction="ease-out"
                      duration={200}
                    >
                      {(style) => {
                        return <div style={style}>{ActionCenter}</div>;
                      }}
                    </Transition>
                  </Card>
                );
              }}
            </Transition>
          </Stack>
        </div>
      </Content>
      <StatusBar />
      <RightSidebar>
        <RightSidebar.Open>
          <Search
            ignoreRabbithole
            resultFilter={(id) => {
              return !isIncluded(id);
            }}
            resultActions={
              isMobile
                ? [
                    (idea) => {
                      return {
                        id: "connect",
                        icon: isIncludingThing(idea.id.toString()) ? (
                          <Loader size="sm" />
                        ) : (
                          <PlusIcon />
                        ),
                        label: "Include",
                        onClick: () => {
                          handleInclude(idea.id.toString());
                        },
                      };
                    },
                  ]
                : undefined
            }
          />
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
