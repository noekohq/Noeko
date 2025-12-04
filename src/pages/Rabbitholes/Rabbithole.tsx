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
  TextInput,
  Title,
  Transition,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import {
  IRabbithole,
  IRabbitholeIncludes,
} from "../../../app/database/models/rabbithole";
import { Link, useNavigate, useParams } from "react-router";
import { showNotification } from "@mantine/notifications";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { api } from "../../server/api";
import styles from "./Rabbithole.module.scss";
import SuggestTags from "../../components/Search/SuggestTags";
import { ITag } from "../../../app/database/models/tag";
import { useLandscape } from "../../contexts/LandscapeContext";
import {
  CaretLeftIcon,
  CirclesThreePlus,
  CirclesThreePlusIcon,
  DoorIcon,
  DoorOpenIcon,
  InfoIcon,
  LightbulbIcon,
  PlusIcon,
  RabbitIcon,
  TagIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { IIdea } from "../../../app/database/models/ideas";
import Search from "../../components/Search/Search";
import {
  deleteRabbithole,
  getRabbitholeThingDescription,
  getRabbitholeThingName,
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
import { Tabs } from "../../components/UI/Layout/Utils/Tabs";
import ConnectableThing from "../../components/Display/Interactions/Connections/ConnectableThing";
import CollapseButton from "../../components/Display/Interactions/CollapseButton";
import TagButton from "../../components/Display/Tags/TagButton";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";

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
    data: suggestedThings,
    loading: loadingSuggestedThings,
    errors: suggestedThingsErrors,
    load: loadSuggestedThings,
  } = useFetch<undefined, IRabbitholeIncludes[]>({
    url: `/rabbitholes/${rabbitholeId}/suggestions`,
    dependencies: [rabbitholeId],
  });

  useEffect(() => {
    if (rabbitholeId) {
      (async () => {
        await loadSuggestedThings();
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
    loadSuggestedThings();
    reloadRabbitholeContext();
  };

  const isEntered =
    currentlyEntered?.id.toString() === rabbithole?.id.toString();

  useDocumentTitle(`${rabbithole?.name || "Loading..."} - Noeko`);

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
        const data = JSON.parse(jData) as { thingId: string };
        const { thingId } = data;
        if (isIncluded(thingId)) {
          showNotification({
            title: "Can't connect again",
            message: "Can't connect this idea again.",
            color: "yellow",
          });
          return;
        }
        await includeThingInRabbithole(
          rabbithole.id.toString(),
          thingId.toString(),
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

  const [filterQuery, setFilterQuery] = useState(""); // State for filter query
  const filteredThings = useMemo(() => {
    if (!rabbithole?.includes) return [];
    if (!filterQuery.trim()) return rabbithole.includes;

    const query = filterQuery.toLowerCase();
    return rabbithole.includes.filter((thing) => {
      const name = getRabbitholeThingName(thing);
      const hasName = !!name?.toLowerCase().includes(query);
      const description = getRabbitholeThingDescription(thing);
      const hasDescription = !!description?.toLowerCase().includes(query);
      return hasName || hasDescription;
    });
  }, [rabbithole?.includes, filterQuery]);

  const ActionCenter = (
    <Group justify="center" mt="lg">
      <Button
        variant="light"
        leftSection={<RabbitIcon />}
        onClick={() => {
          if (isEntered) {
            handleExitRabbithole();
          } else {
            handleEnterRabbithole();
          }
        }}
        color={isEntered ? "red" : "green"}
      >
        {isEntered ? "Exit" : "Enter"} Rabbithole
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
        <TopBar />
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
      <TopBar />
      <LeftSidebar>
        <LeftSidebar.Collapsed>
          {loadingSaveChanges && <Loader size="xs" color="gray" />}
        </LeftSidebar.Collapsed>
        <LeftSidebar.Open>
          <Stack>
            <Text size="sm" c="dark.4" fw="bold">
              <Group gap="xs">
                <LightbulbIcon weight="bold" />
                SUGGESTED
              </Group>
            </Text>
            {!suggestedThings?.length && (
              <Text size="xs" c="dimmed">
                No current suggestions.
              </Text>
            )}
            <Transition
              mounted={!includingThing && !loadingSuggestedThings}
              transition="fade-up"
            >
              {(style) => {
                return (
                  <Stack style={style}>
                    {suggestedThings
                      ?.filter((r) => {
                        return !isIncluded(r.id.toString());
                      })
                      ?.map((thing) => {
                        if (thing.type === "tag") {
                          const tag = thing as ITag;
                          return (
                            <CollapseButton
                              target={<TagButton tag={tag} />}
                              details={
                                <>
                                  <Group gap="xs">
                                    <Button
                                      variant="light"
                                      radius="md"
                                      size="xs"
                                      color="dark.3"
                                      leftSection={
                                        <CirclesThreePlusIcon weight="bold" />
                                      }
                                      title="Include this thing"
                                      onClick={() => {
                                        handleInclude(tag.id.toString());
                                      }}
                                    >
                                      Include
                                    </Button>
                                  </Group>
                                </>
                              }
                            />
                          );
                        }
                        return (
                          <CollapseButton
                            target={<ConnectableThing thing={thing} />}
                            details={
                              <>
                                <Group gap="xs">
                                  <Button
                                    variant="light"
                                    radius="md"
                                    size="xs"
                                    color="dark.3"
                                    leftSection={
                                      <CirclesThreePlusIcon weight="bold" />
                                    }
                                    title="Include this thing"
                                    onClick={() => {
                                      handleInclude(thing.id.toString());
                                    }}
                                  >
                                    Include
                                  </Button>
                                </Group>
                              </>
                            }
                          />
                        );
                      })}
                  </Stack>
                );
              }}
            </Transition>
            <Transition
              mounted={!!includingThing || loadingSuggestedThings}
              transition="fade-up"
            >
              {(styles) => {
                return (
                  <div style={styles}>
                    <Group gap="xs" align="center">
                      <Loader size="xs" />
                      <Text>Looking for suggestions...</Text>
                    </Group>
                  </div>
                );
              }}
            </Transition>
          </Stack>
        </LeftSidebar.Open>
      </LeftSidebar>
      <Content>
        <div className={styles.rabbithole}>
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
                <Group
                  align="center"
                  justify="center"
                  style={{ height: "100%" }}
                >
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
              {isMobile && ActionCenter}
              {isEntered && (
                <TextInput
                  placeholder="Filter things..."
                  value={filterQuery}
                  onChange={(event) =>
                    setFilterQuery(event.currentTarget.value)
                  }
                  mb="md" // Added margin bottom for spacing
                  radius="md"
                />
              )}
              <Transition
                mounted={isEntered}
                transition="fade-up"
                duration={300}
                enterDelay={300}
              >
                {(style) => {
                  if (
                    !(
                      isEntered &&
                      !!rabbithole &&
                      !!rabbithole.includes?.length
                    )
                  ) {
                    return (
                      <Text style={style} size="sm" ta="center">
                        There are no things in this rabbithole.
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
                      {filteredThings
                        .map((thing) => {
                          return (
                            <RabbitholeThing
                              rabbithole={rabbithole}
                              key={thing.id.toString()}
                              thing={thing}
                              handleRemove={handleUninclude}
                            />
                          );
                        })
                        .filter((i) => !!i)}
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
                          You can drag and drop ideas from the search results
                          into this area to include them!
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
                              return (
                                <RabbitholeThing
                                  rabbithole={rabbithole}
                                  key={thing.id.toString()}
                                  thing={thing}
                                  handleRemove={handleUninclude}
                                />
                              );
                            })
                            .filter((i) => !!i)
                            .slice(0, 9)}
                        </SimpleGrid>
                      )}
                      {!!(
                        rabbithole?.includes?.length &&
                        rabbithole.includes.length > 9
                      ) && (
                        <Text size="sm" c="dimmed">
                          {rabbithole.includes.length - 9} more thing
                          {rabbithole.includes.length - 9 === 1 ? "" : "s"}{" "}
                          hidden...
                        </Text>
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
        </div>
      </Content>
      <Nav />
      <RightSidebar>
        <RightSidebar.Open>
          <Tabs defaultValue="ideas">
            <Tabs.List>
              <Tabs.Tab value="ideas">
                <Group gap="xs">
                  <LightbulbIcon />
                  Ideas
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="tags">
                <Group gap="xs">
                  <TagIcon />
                  Tags
                </Group>
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="ideas">
              <Search
                ignoreRabbithole
                resultFilter={(id) => {
                  return !isIncluded(id);
                }}
                resultActions={
                  isMobile
                    ? [
                        (thing) => {
                          return {
                            id: "connect",
                            icon: isIncludingThing(thing.id.toString()) ? (
                              <Loader size="xs" color="gray" />
                            ) : (
                              <PlusIcon />
                            ),
                            label: "Include",
                            onClick: () => {
                              handleInclude(thing.id.toString());
                            },
                          };
                        },
                      ]
                    : undefined
                }
              />
            </Tabs.Panel>
            <Tabs.Panel value="tags">
              <SuggestTags onSelect={handleAddTag} size="sm" />
            </Tabs.Panel>
          </Tabs>
        </RightSidebar.Open>
      </RightSidebar>
    </PageWrapper>
  );
}
