import {
  Title,
  Text,
  Group,
  Stack,
  Loader,
  Alert,
  Button,
  Overlay,
  ActionIcon,
  Modal,
  TextInput,
  HoverCard,
  Textarea,
  Blockquote,
  Menu,
  Tooltip,
  Box,
  Flex,
} from "@mantine/core";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import { ITag, ITagForm, ITagDescribes } from "../../../../../app/database/models/tag";
import { useNavigate, useParams } from "react-router";
import {
  ClockIcon,
  FloppyDiskIcon,
  InfoIcon,
  LightbulbIcon,
  ListIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  SquaresFourIcon,
  TagIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
  DotsThreeVerticalIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { showNotification } from "@mantine/notifications";
import styles from "./ViewTag.module.scss";
import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "@mantine/form";
import Content from "@core/design/components/Layout/Content";
import Search from "@domains/discovery/components/Search/Search";
import { useLayout } from "@/contexts/LayoutContext";
import { RecordId } from "surrealdb";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import {
  getThingPropsFromConnectable,
  getThingsFromConnectables,
} from "@core/design/components/Paper/Things/thingUtils";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import PaperThings from "@core/design/components/Paper/Things/PaperThings";
import GraphContainer from "@domains/constellation/components/Graph/Graph";
import { fromConstellation } from "@infrastructure/graph/utils";
import PaperEyebrow from "@/core/design/components/Paper/PaperEyebrow/PaperEyebrow";
import PaperDrawer from "@core/design/components/Paper/PaperDrawer";
import { formatDate, formatDateTime } from "@core/utils/formatting";
import useTag from "../../hooks/useTag";

export default function ViewTag() {
  const navigate = useNavigate();
  const { tagId } = useParams<{ tagId: string }>();

  const {
    tag,
    things,
    suggestions,
    isLoading,
    isUpdating,
    isDeleting,
    thingsError,
    updateTag,
    deleteTag,
    applyTo,
    removeFrom,
  } = useTag({ tagId: tagId as string });

  const [draggingOver, setDraggingOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  // New state for mobile drawer and optimistic suggestion loading
  const [viewingSuggestions, setViewingSuggestions] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const editForm = useForm<Partial<ITagForm>>({
    initialValues: {
      name: "",
      description: "",
    },
    validate: {
      name: (value) => (value?.trim() === "" ? "Tag name is required" : null),
    },
  });

  useEffect(() => {
    if (tag) {
      editForm.setValues({
        name: tag.name,
        description: tag.description || "",
      });
    }
  }, [tag]);

  const thingIsConnected = (thingId: string) => {
    return !!things?.find((i) => i.id.toString() === thingId);
  };

  const handleAddTag = async (thingId: string | RecordId) => {
    if (!tag) {
      console.error("Cannot add tag: Tag data not loaded.");
      return;
    }
    try {
      await applyTo(thingId);
    } catch (error) {
      console.error(`Failed to add tag ${tag.name} to thing ${thingId}:`, error);
      showNotification({
        title: "Error",
        message: "Something went wrong adding the tag",
        color: "red",
      });
    }
  };

  const handleRemoveTag = async (thing: ITagDescribes) => {
    if (!tag) {
      console.error("Cannot remove tag: Tag data not loaded.");
      return;
    }
    try {
      await removeFrom(thing.id);
    } catch (error) {
      console.error(`Failed to remove tag ${tag.name} from thing ${thing.id}:`, error);
      showNotification({
        title: "Error",
        message: "Something went wrong removing the tag",
        color: "red",
      });
    }
  };

  const handleConnectionDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    try {
      if (!tag) return;

      const jData = e.dataTransfer.getData("application/json");
      const data = JSON.parse(jData) as { thingId: string };
      const { thingId } = data;

      if (thingIsConnected(thingId)) {
        showNotification({
          title: "Can't connect again",
          message: "Can't connect this item again.",
          color: "yellow",
        });
        return;
      }

      await applyTo(thingId);
    } catch (error) {
      console.error("Error creating connection: ", error);
    } finally {
      setDraggingOver(false);
    }
  };

  const handleSave = async () => {
    const validationResult = editForm.validate();
    if (validationResult.hasErrors) {
      return;
    }

    const currentValues = editForm.getTransformedValues();
    const valuesToUpdate: Partial<ITagForm> = {};

    if (currentValues.name !== tag?.name) {
      valuesToUpdate.name = currentValues.name;
    }
    if (currentValues.description !== (tag?.description || "")) {
      valuesToUpdate.description = currentValues.description;
    }

    if (Object.keys(valuesToUpdate).length > 0) {
      try {
        await updateTag(valuesToUpdate);
        setIsEditing(false);
        showNotification({
          title: "Success",
          message: "Tag updated successfully",
        });
      } catch (error) {
        console.error("Failed to update tag:", error);
        showNotification({
          title: "Error",
          message: "Failed to update tag",
          color: "red",
        });
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (tag) {
      editForm.setValues({
        name: tag.name,
        description: tag.description || "",
      });
    }
    setIsEditing(false);
  };

  const openDeleteModal = () => setDeleteModalOpened(true);
  const closeDeleteModal = () => setDeleteModalOpened(false);

  const handleDeleteConfirm = async () => {
    try {
      await deleteTag();
      showNotification({
        title: "Success",
        message: "Tag deleted successfully",
      });
      navigate("/tags");
    } catch (error) {
      console.error("Failed to delete tag:", error);
      showNotification({
        title: "Error",
        message: "Failed to delete tag",
        color: "red",
      });
    }
  };

  const {
    elements: {
      rightSidebar: {
        mode: { set: setRightSidebar },
      },
    },
    isMobile,
  } = useLayout();

  const graphData = useMemo(() => {
    if (!things) return undefined;
    return fromConstellation({ things: things });
  }, [things]);

  function TagConstellationView({ graph }: { graph: any }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
      const updateDimensions = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      const resizeObserver = new ResizeObserver(updateDimensions);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      updateDimensions();

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div ref={containerRef} className={styles.constellationContainer}>
        {dimensions.width > 0 && (
          <GraphContainer graph={graph} width={dimensions.width} height={dimensions.height} />
        )}
      </div>
    );
  }

  const renderSuggestions = () => (
    <Stack gap="md">
      {!isMobile && (
        <Text size="sm" c="dark.4" fw="bold">
          <Group gap="xs">
            <LightbulbIcon weight="bold" />
            SUGGESTED
          </Group>
        </Text>
      )}
      {!suggestions?.length && (
        <Text size="sm" c="dimmed">
          Suggestions will populate based on usage.
        </Text>
      )}
      {suggestions?.map((thing) => {
        const isApplying = applyingId === thing.id.toString();
        const props = getThingPropsFromConnectable(
          thing,
          {
            action: {
              icon: isApplying ? CircleNotchIcon : TagIcon,
              onClick: async (id, e) => {
                e.stopPropagation();
                if (isApplying) return; // Prevent double-clicks
                try {
                  setApplyingId(id);
                  await applyTo(id);
                } catch (error) {
                  console.error("Failed to apply suggestion:", error);
                } finally {
                  setApplyingId(null);
                }
              },
              tooltip: isApplying ? "Applying..." : `Apply tag "${tag?.name}"`,
            },
            state: "suggested",
          },
          true
        );
        return (
          <Box
            key={thing.id.toString()}
            style={{
              opacity: isApplying ? 0.5 : 1,
              pointerEvents: isApplying ? "none" : "auto",
              transition: "opacity 0.2s ease",
            }}
          >
            <PaperThing {...props} draggable={!isApplying} />
          </Box>
        );
      })}
    </Stack>
  );

  const paperThingsModes = [
    { value: "list", icon: ListIcon },
    { value: "grid", icon: SquaresFourIcon },
    // { value: "constellation", icon: GraphIcon },
  ];

  const customPaperThingViews = {
    constellation: graphData ? <TagConstellationView graph={graphData} /> : <Loader />,
  };

  const eyebrowActions = isEditing
    ? [
        {
          icon: FloppyDiskIcon,
          name: "Save",
          run: handleSave,
          disabled: isUpdating,
        },
        {
          icon: XIcon,
          name: "Cancel",
          run: handleCancel,
          disabled: isUpdating,
        },
      ]
    : [
        {
          icon: PencilSimpleIcon,
          name: "Edit",
          run: () => setIsEditing(true),
          disabled: false,
        },
        {
          icon: LightbulbIcon,
          name: "Suggestions",
          run: () => setViewingSuggestions(true),
          disabled: !suggestions?.length,
          invisible: !isMobile,
        },
      ];

  return (
    <PageWrapper>
      <TopBar />
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title={`Delete Tag: "${tag?.name}"`}
        centered
      >
        <Text size="sm">
          Are you sure you want to delete this tag? This action cannot be undone and will remove the
          tag from all associated items.
        </Text>
        <Group mt="lg" justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteConfirm} loading={isDeleting}>
            Delete Tag
          </Button>
        </Group>
      </Modal>

      <LeftSidebar>
        <LeftSidebar.Open>{!!tag && !isMobile && renderSuggestions()}</LeftSidebar.Open>
      </LeftSidebar>

      <Content>
        <div
          className={styles.viewtag}
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
              }}
              radius={"lg"}
            >
              <Group align="center" justify="center" style={{ height: "100%" }}>
                <Text c="white" mx="lg" size="sm">
                  Drop here to create a connection
                </Text>
              </Group>
            </Overlay>
          )}
          {!!tag && (
            <Stack gap="xl">
              <PaperEyebrow
                actions={eyebrowActions}
                right={
                  <Menu
                    width={200}
                    shadow="md"
                    position="bottom-end"
                    radius="md"
                    withArrow
                    arrowOffset={14}
                    zIndex={700}
                  >
                    <Menu.Target>
                      <div>
                        <ActionIcon
                          aria-label="More options"
                          size="md"
                          radius="md"
                          variant="subtle"
                          color="gray"
                        >
                          <DotsThreeVerticalIcon weight="bold" />
                        </ActionIcon>
                      </div>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Tooltip label="Delete Tag">
                        <Menu.Item
                          color="red"
                          leftSection={<TrashIcon />}
                          onClick={openDeleteModal}
                        >
                          Delete
                        </Menu.Item>
                      </Tooltip>
                    </Menu.Dropdown>
                  </Menu>
                }
              />
              <Box>
                {isEditing ? (
                  <Stack gap="md">
                    <TextInput
                      label="Name"
                      placeholder="Name your tag..."
                      {...editForm.getInputProps("name")}
                      required
                    />
                    <Textarea
                      label={
                        <Group align="center" gap="2px">
                          <Text size="sm">Description</Text>
                          <HoverCard width="300px" radius="lg">
                            <HoverCard.Target>
                              <ActionIcon size="xs" radius="lg" variant="subtle" color="gray">
                                <InfoIcon size={14} />
                              </ActionIcon>
                            </HoverCard.Target>
                            <HoverCard.Dropdown>
                              <Stack gap="xs">
                                <Text size="sm" mb="sm">
                                  The better the description, the better the system will be at
                                  suggesting tag applications. More detail will mean more specific
                                  suggestions.
                                </Text>
                                <Text fw="bold" size="sm">
                                  Good Description
                                </Text>
                                <Blockquote p="xs" color="gray">
                                  <Text size="sm">
                                    Fleetingness. The quality of being fleeting or transient.
                                  </Text>
                                </Blockquote>
                                <Text fw="bold" size="sm">
                                  Better Description
                                </Text>
                                <Blockquote p="xs" color="gray">
                                  <Text size="sm">
                                    The concept of fleetiness. It represents a momentary, ephemeral
                                    experience, like a spark of inspiration that fades, a dream upon
                                    waking, or the brief scent of rain on hot pavement.
                                  </Text>
                                </Blockquote>
                              </Stack>
                            </HoverCard.Dropdown>
                          </HoverCard>
                        </Group>
                      }
                      placeholder="Describe the meaning of your tag..."
                      minRows={3}
                      autosize
                      {...editForm.getInputProps("description")}
                    />
                  </Stack>
                ) : (
                  <Stack gap="md">
                    <Group gap="sm" align="center">
                      <TagIcon size={32} weight="fill" style={{ opacity: 0.3 }} />
                      <Title order={1}>{tag.name}</Title>
                    </Group>
                    {tag.description && (
                      <Text size="md" c="dimmed" lh={1.4} maw={600}>
                        {tag.description}
                      </Text>
                    )}
                    <Box
                      bg="dark.9"
                      c="dark.1"
                      style={{ borderRadius: "var(--mantine-radius-md)" }}
                      p="4px 8px"
                      w="fit-content"
                    >
                      <Flex gap="xs" direction={"row"} align="center" wrap={"wrap"}>
                        <Tooltip
                          label="Created at"
                          transitionProps={{
                            transition: "rotate-right",
                            duration: 200,
                          }}
                        >
                          <Group gap="4px" align="center">
                            <ClockIcon
                              color="var(--mantine-color-dark-3)"
                              size={12}
                              weight="bold"
                            />
                            <Text size="xs" fw="500">
                              {tag.createdAt ? `${formatDate(tag.createdAt)}` : "Now"}
                            </Text>
                          </Group>
                        </Tooltip>
                        {tag.updatedAt && tag.updatedAt !== tag.createdAt && (
                          <>
                            <Text size="sm" fw="bold" c="dark.4">
                              •
                            </Text>
                            <Tooltip
                              label="Last updated"
                              transitionProps={{
                                transition: "rotate-right",
                                duration: 200,
                              }}
                            >
                              <Group gap="4px" align="center">
                                <PencilSimpleIcon
                                  color="var(--mantine-color-dark-3)"
                                  size={12}
                                  weight="bold"
                                />
                                <Text size="xs" fw="500">
                                  {tag.updatedAt ? `${formatDateTime(tag.updatedAt)}` : "Now"}
                                </Text>
                              </Group>
                            </Tooltip>
                          </>
                        )}
                      </Flex>
                    </Box>
                  </Stack>
                )}
              </Box>

              <Stack gap="md">
                {things && things.length > 0 && (
                  <PaperThings
                    modes={paperThingsModes}
                    things={getThingsFromConnectables(things, {}, true)}
                    storageKey={tag.id.toString()}
                    // customViews={customPaperThingViews}
                  />
                )}
                {thingsError && (
                  <Alert icon={<WarningCircleIcon size={24} />} title="Error!" color="red" mt="md">
                    Failed to load items for this tag: {thingsError.message}
                  </Alert>
                )}
                {(!things || things.length === 0) && (
                  <Text size="sm">
                    {isMobile
                      ? "Nothing here yet :/"
                      : "Nothing yet, try dragging something here to tag it!"}
                  </Text>
                )}
              </Stack>
            </Stack>
          )}
        </div>
      </Content>
      <Nav />
      <RightSidebar>
        <RightSidebar.Collapsed>
          <ActionIcon
            onClick={() => {
              setRightSidebar("open");
            }}
            variant="subtle"
            size="sm"
          >
            <MagnifyingGlassIcon size={16} />
          </ActionIcon>
        </RightSidebar.Collapsed>
        <RightSidebar.Open>
          <Search />
        </RightSidebar.Open>
      </RightSidebar>

      {/* Render the mobile drawer for suggestions */}
      {isMobile && tag && (
        <PaperDrawer
          title="Suggested Items"
          opened={viewingSuggestions}
          onClose={() => setViewingSuggestions(false)}
        >
          {renderSuggestions()}
        </PaperDrawer>
      )}
    </PageWrapper>
  );
}
