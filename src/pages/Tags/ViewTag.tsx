import {
  Title,
  Text,
  Card,
  Group,
  Stack,
  Loader,
  Alert,
  Button,
  Overlay,
  ActionIcon,
  Modal,
  TextInput,
  SimpleGrid,
  HoverCard,
  Textarea,
  Blockquote,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import useFetch from "../../hooks/useFetch";
import { ITag, ITagForm } from "../../../app/database/models/tag";
import { Link, useNavigate, useParams } from "react-router";
import { ITagDescribes } from "../../../app/database/models/tag";
import {
  ArrowLeftIcon,
  FloppyDiskIcon,
  InfoIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  TagIcon,
  TagSimpleIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { BlockTag } from "../../components/Display/Tags/TagDisplay";
import { showNotification } from "@mantine/notifications";
import styles from "./ViewTag.module.scss";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "@mantine/form";
import Content from "../../components/UI/Layout/Content";
import Search from "../../components/Search/Search";
import { useLayout } from "../../contexts/LayoutContext";
import StatusBar from "../../components/UI/Layout/Bottom";
import { getNodeDescription, getNodeTitle } from "../../utils/graph";
import CollapseButton from "../../components/Display/Interactions/CollapseButton";
import ConnectableThing from "../../components/Display/Interactions/Connections/ConnectableThing";
import { RecordId } from "surrealdb";
import { applyTagToThing, removeTagFromThing } from "../../utils/tags";
import ConnectableTable from "../../components/Display/Data/ConnectableTable";
import Nav from "../../components/UI/Layout/Nav";
import TopBar from "../../components/UI/Layout/TopBar";
import { getThingPropsFromConnectable } from "../../components/Display/Paper/Things/thingUtils";
import PaperThing from "../../components/Display/Paper/Things/PaperThing";

export default function ViewTag() {
  const navigate = useNavigate();
  const { tagId } = useParams<{ tagId: string }>();

  const {
    data: tag,
    loading: loadingTag,
    errors: tagErrors,
    load: reloadTag,
  } = useFetch<undefined, ITag>({
    url: `/tags/${tagId}`,
    runOnMount: true,
  });

  const {
    data: things,
    loading: loadingThings,
    errors: thingErrors,
    load: reloadThings,
  } = useFetch<undefined, ITagDescribes[]>({
    url: `/tags/${tagId}/things`,
    runOnMount: true,
  });

  const {
    data: suggestedThings,
    loading: loadingSuggestedThings,
    errors: suggestedThingsErrors,
    load: reloadSuggestedThings,
  } = useFetch<undefined, ITagDescribes[]>({
    url: `/tags/${tagId}/suggestions`,
    runOnMount: true,
  });

  const somethingLoading =
    loadingTag || loadingThings || loadingSuggestedThings;

  const handleRefresh = async () => {
    await reloadTag();
    await reloadThings();
    await reloadSuggestedThings();
  };

  const handleAddTag = async (thingId: string | RecordId) => {
    if (!tag) {
      console.error("Cannot add tag: Tag data not loaded.");
      return;
    }
    try {
      await applyTagToThing(tag.id.toString(), thingId.toString());
      handleRefresh();
    } catch (error) {
      console.error(
        `Failed to add tag ${tag.name} to thing ${thingId}:`,
        error,
      );
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
      await removeTagFromThing(tag.id.toString(), thing.id.toString());

      handleRefresh();
    } catch (error) {
      console.error(
        `Failed to remove tag ${tag.name} from thing ${thing}:`,
        error,
      );
      showNotification({
        title: "Error",
        message: "Something went wrong removing the tag",
        color: "red",
      });
    }
  };

  const thingIsConnected = (thingId: string) => {
    return !!things?.find((i) => i.id.toString() === thingId);
  };

  const [draggingOver, setDraggingOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

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

  const {
    load: updateTag,
    loading: updateTagLoading,
    errors: updateTagErrors,
  } = useFetch<Partial<ITagForm>, ITag>({
    url: `/tags/${tagId}`,
    method: "PUT",
    body: editForm.getTransformedValues(),
    dependencies: [editForm],
    onSuccess: (data) => {
      reloadTag();
      setIsEditing(false);
      showNotification({
        title: "Success",
        message: "Tag updated successfully",
      });
    },
    onError: (error) => {
      console.error("Failed to update tag:", error);
      showNotification({
        title: "Error",
        message: "Failed to update tag",
        color: "red",
      });
    },
  });

  const {
    load: deleteTag,
    loading: deleteTagLoading,
    errors: deleteTagErrors,
  } = useFetch<undefined, undefined>({
    url: `/tags/${tagId}`,
    method: "DELETE",
    onSuccess: () => {
      showNotification({
        title: "Success",
        message: "Tag deleted successfully",
      });
      navigate("/tags"); // Navigate back to tags list
    },
    onError: (error) => {
      console.error("Failed to delete tag:", error);
      showNotification({
        title: "Error",
        message: "Failed to delete tag",
        color: "red",
      });
    },
  });

  const handleConnectionDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    try {
      if (!tag) {
        return;
      }
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
      await applyTagToThing(tag.id.toString(), thingId);
      handleRefresh();
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

    // Only include changed values
    if (currentValues.name !== tag?.name) {
      valuesToUpdate.name = currentValues.name;
    }
    if (currentValues.description !== (tag?.description || "")) {
      valuesToUpdate.description = currentValues.description;
    }

    if (Object.keys(valuesToUpdate).length > 0) {
      await updateTag();
    } else {
      setIsEditing(false); // No changes, just exit edit mode
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
    await deleteTag();
  };

  const {
    elements: {
      rightSidebar: {
        mode: { set: setRightSidebar },
      },
    },
    isMobile,
  } = useLayout();

  const [filterQuery, setFilterQuery] = useState(""); // State for filter query
  const filteredThings = useMemo(() => {
    if (!things) return [];
    if (!filterQuery.trim()) return things;

    const query = filterQuery.toLowerCase();
    return things.filter((thing) => {
      const name = JSON.stringify(thing);
      const contains = !!name?.toLowerCase().includes(query);
      return contains;
    });
  }, [things, filterQuery]);

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
          Are you sure you want to delete this tag? This action cannot be undone
          and will remove the tag from all associated items.
        </Text>
        {deleteTagErrors.length > 0 && (
          <Text c="red" size="xs" mt="sm">
            Failed to delete tag: {deleteTagErrors.join(", ")}
          </Text>
        )}
        <Group mt="lg" justify="flex-end">
          <Button variant="default" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleDeleteConfirm}
            loading={deleteTagLoading}
          >
            Delete Tag
          </Button>
        </Group>
      </Modal>
      <LeftSidebar>
        <LeftSidebar.Open>
          {!!tag && (
            <Stack gap="md">
              <Text size="sm" c="dark.4" fw="bold">
                <Group gap="xs">
                  <LightbulbIcon weight="bold" />
                  SUGGESTED
                </Group>
              </Text>
              {!suggestedThings?.length && (
                <Text size="sm" c="dimmed">
                  Suggestions will populate based on usage.
                </Text>
              )}
              {suggestedThings?.map((thing) => {
                const props = getThingPropsFromConnectable(
                  thing,
                  {
                    action: {
                      icon: TagIcon,
                      onClick: (id, e) => {
                        e.stopPropagation();
                        applyTagToThing(tag.id.toString(), id);
                      },
                      tooltip: `Apply tag "${tag.name}"`,
                    },
                  },
                  true,
                );
                return (
                  <PaperThing key={thing.id.toString()} {...props} draggable />
                );
              })}
            </Stack>
          )}
        </LeftSidebar.Open>
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
              <Group>
                <Link to="/tags">
                  <Button
                    variant="subtle"
                    leftSection={<ArrowLeftIcon />}
                    color="gray"
                  >
                    All Tags
                  </Button>
                </Link>
              </Group>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                {isEditing ? (
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4}>Edit Tag</Title>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          onClick={handleSave}
                          loading={updateTagLoading}
                          color="gray"
                          title="Save Tag"
                        >
                          <FloppyDiskIcon weight="bold" />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="gray"
                          onClick={handleCancel}
                          title="Cancel Edit"
                        >
                          <XIcon weight="bold" />
                        </ActionIcon>
                      </Group>
                    </Group>
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
                              <ActionIcon
                                size="xs"
                                radius="lg"
                                variant="subtle"
                                color="gray"
                              >
                                <InfoIcon size={14} />
                              </ActionIcon>
                            </HoverCard.Target>
                            <HoverCard.Dropdown>
                              <Stack gap="xs">
                                <Text size="sm" mb="sm">
                                  The better the description, the better the
                                  system will be at suggesting tag applications.
                                  More detail will mean more specific
                                  suggestions.
                                </Text>
                                <Text fw="bold" size="sm">
                                  Good Description
                                </Text>
                                <Blockquote p="xs" color="gray">
                                  <Text size="sm">
                                    Fleetingness. The quality of being fleeting
                                    or transient.
                                  </Text>
                                </Blockquote>
                                <Text fw="bold" size="sm">
                                  Better Description
                                </Text>
                                <Blockquote p="xs" color="gray">
                                  <Text size="sm">
                                    The concept of fleetiness. It represents a
                                    momentary, ephemeral experience, like a
                                    spark of inspiration that fades, a dream
                                    upon waking, or the brief scent of rain on
                                    hot pavement.
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
                    {updateTagErrors.length > 0 && (
                      <Text c="red" size="sm">
                        {updateTagErrors.join(", ")}
                      </Text>
                    )}
                  </Stack>
                ) : (
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <Group gap="lg">
                          <BlockTag tag={tag} />
                        </Group>
                        {tag.description && (
                          <Text size="sm" c="dimmed">
                            {tag.description}
                          </Text>
                        )}
                        <Group gap="md">
                          <Text size="xs" c="dimmed">
                            Created:{" "}
                            {new Date(tag.createdAt).toLocaleDateString()}
                          </Text>
                          {tag.updatedAt && tag.updatedAt !== tag.createdAt && (
                            <Text size="xs" c="dimmed">
                              Last Updated:{" "}
                              {new Date(tag.updatedAt).toLocaleDateString()}
                            </Text>
                          )}
                        </Group>
                      </Stack>
                      <Group gap="xs">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => setIsEditing(true)}
                          title="Edit Tag"
                          color="gray"
                        >
                          <PencilSimpleIcon weight="bold" />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={openDeleteModal}
                          title="Delete Tag"
                        >
                          <TrashIcon weight="bold" />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Stack>
                )}
              </Card>

              <Stack gap="md">
                <Group>
                  <Title order={3}>Items with this tag</Title>
                  {loadingThings && <Loader size="md" />}
                </Group>
                {thingErrors && thingErrors.length > 0 && (
                  <Alert
                    icon={<WarningCircleIcon size={24} />}
                    title="Error!"
                    color="red"
                    mt="md"
                  >
                    Failed to load items for this tag: {thingErrors.join(", ")}
                  </Alert>
                )}
                {filteredThings.length > 0 && (
                  <ConnectableTable connectables={filteredThings} />
                )}
                {!filteredThings.length && (
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
    </PageWrapper>
  );
}
