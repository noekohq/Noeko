import {
  ActionIcon,
  Button,
  Flex,
  Group,
  Loader,
  Menu,
  Modal,
  Stack,
  Text,
  FileInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import {
  LinkIcon,
  PlusIcon,
  UploadSimpleIcon,
  DownloadSimpleIcon,
  WarningCircleIcon,
  XIcon,
  ArrowLineUpIcon,
  ArrowLineRightIcon,
} from "@phosphor-icons/react";
import { Editor } from "@tiptap/react";
import { useState } from "react";
import { PaperContextMenu } from "../../Paper/PaperContextMenu";
import { IUserFile } from "../../../../../app/database/models/userfile";
import useFetch from "../../../../hooks/useFetch";
import {
  handleFileDownload,
  linkFileToConnectable,
  unlinkFileFromConnectable,
  uploadFileSmart,
} from "../../../../utils/userfiles";
import { uploadDreamFile } from "../../../Content/DreamWriter/lib/utils/fileUpload";
import styles from "./FileManager.module.scss";
import { streamImageEndpoint } from "../../../../vars/files";
import { api } from "../../../../server/api";
import PaperThing from "../../Paper/Things/PaperThing";
import { getThingPropsFromUserFile } from "../../Paper/Things/thingUtils";
import PaperButton from "../../Paper/PaperButton";
import { useDisclosure } from "@mantine/hooks";

interface IFileManagerProps {
  connectableId: string;
  editor: Editor | null;
}

export default function FileManager({ connectableId, editor }: IFileManagerProps) {
  const {
    data: files,
    load: refreshFiles,
    loading: loadingFiles,
  } = useFetch<undefined, IUserFile[]>({
    url: `/files/embedded/${connectableId}`,
    runOnMount: !!connectableId,
  });

  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<
    Record<string, { name: string; progress: number; error?: string }>
  >({});

  const handleRemove = async (fileId: string) => {
    await unlinkFileFromConnectable(fileId, connectableId);

    // Remove from editor if it exists (as direct node or in gallery)
    if (editor) {
      editor.state.doc.descendants((node, pos) => {
        // Handle dreamFile or dreamImage nodes directly
        if (
          (node.type.name === "dreamFile" || node.type.name === "dreamImage") &&
          node.attrs.fileId === fileId
        ) {
          editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
          return false;
        }

        // Handle images inside dreamGallery
        if (node.type.name === "dreamGallery") {
          const images =
            (node.attrs.images as { fileId?: string; src: string; alt?: string }[]) || [];
          const imageIndex = images.findIndex((img) => img.fileId === fileId);

          if (imageIndex !== -1) {
            // Remove the specific image from the gallery
            const updatedImages = images.filter((_, idx) => idx !== imageIndex);
            const transaction = editor.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              images: updatedImages,
            });
            editor.view.dispatch(transaction);
            return false;
          }
        }

        return true;
      });
    }

    refreshFiles();
  };

  const handleUploads = async (files: File[]) => {
    if (files.length === 0 || !connectableId) return;

    if (editor) {
      let currentPos = editor.state.selection.to;

      files.forEach((file) => {
        const tempId = uploadDreamFile(
          file,
          editor,
          { connectableId },
          { type: "pos", pos: currentPos },
          {
            onProgress: (progress) => {
              setPendingUploads((prev) => ({
                ...prev,
                [tempId]: { name: file.name, progress },
              }));
            },
            onSuccess: () => {
              setPendingUploads((prev) => {
                const next = { ...prev };
                delete next[tempId];
                return next;
              });
              refreshFiles();
            },
            onError: (error) => {
              setPendingUploads((prev) => ({
                ...prev,
                [tempId]: { ...prev[tempId], error },
              }));
            },
          }
        );

        setPendingUploads((prev) => ({
          ...prev,
          [tempId]: { name: file.name, progress: 0 },
        }));

        currentPos += 1;
      });
    } else {
      files.forEach((file) => {
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        setPendingUploads((prev) => ({
          ...prev,
          [tempId]: { name: file.name, progress: 0 },
        }));

        uploadFileSmart(file, {
          onProgress: (progress) => {
            setPendingUploads((prev) => ({
              ...prev,
              [tempId]: { name: file.name, progress },
            }));
          },
          onSuccess: async (remoteFile) => {
            await linkFileToConnectable(remoteFile.id.toString(), connectableId);
            setPendingUploads((prev) => {
              const next = { ...prev };
              delete next[tempId];
              return next;
            });
            refreshFiles();
          },
          onError: (error) => {
            setPendingUploads((prev) => ({
              ...prev,
              [tempId]: { ...prev[tempId], error },
            }));
          },
        });
      });
    }
  };

  const handleLinkExisting = async (file: IUserFile) => {
    await linkFileToConnectable(file.id.toString(), connectableId);
    insertFileIntoEditor(file);
    refreshFiles();
    setIsLinkingModalOpen(false);
  };

  const insertFileIntoEditor = (file: IUserFile) => {
    if (!editor) return;

    const { to } = editor.state.selection;

    if (file.mimeType.startsWith("image/")) {
      editor
        .chain()
        .insertContentAt(to, {
          type: "dreamImage",
          attrs: {
            src: streamImageEndpoint(file),
            alt: file.originalFileName,
            title: file.originalFileName,
            fileId: file.id.toString(),
            viewMode: "expanded",
          },
        })
        .focus()
        .run();
    } else {
      editor
        .chain()
        .insertContentAt(to, {
          type: "dreamFile",
          attrs: {
            fileId: file.id.toString(),
            fileName: file.originalFileName,
            fileType: file.mimeType,
            viewMode: "expanded",
          },
        })
        .focus()
        .run();
    }
  };

  return (
    <div className={styles.fileManager}>
      <Stack gap="md">
        <Group justify="space-between">
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <PaperButton withBorder fullWidth>
                Add a file
              </PaperButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Add a file</Menu.Label>
              <Menu.Item
                leftSection={<UploadSimpleIcon size={14} />}
                onClick={() => setIsUploadModalOpen(true)}
              >
                Upload files
              </Menu.Item>
              <Menu.Item
                leftSection={<LinkIcon size={14} />}
                onClick={() => setIsLinkingModalOpen(true)}
              >
                Link a file
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>

        {loadingFiles && <Loader size="sm" />}

        {!loadingFiles && files?.length === 0 && (
          <Text size="sm" c="dimmed" fs="italic">
            No files embedded in this idea.
          </Text>
        )}

        <Stack gap="xs">
          {Object.entries(pendingUploads).map(([id, upload]) => (
            <PaperThing
              key={id}
              id={id}
              title={upload.name}
              detail={upload.error || `Uploading... ${upload.progress}%`}
              state={upload.error ? "error" : "default"}
              icon={upload.error ? WarningCircleIcon : undefined}
              action={
                upload.error
                  ? {
                      icon: XIcon,
                      tooltip: "Clear",
                      onClick: (id, e) => {
                        e.stopPropagation();
                        setPendingUploads((prev) => {
                          const next = { ...prev };
                          delete next[id];
                          return next;
                        });
                      },
                    }
                  : undefined
              }
            />
          ))}
          {files?.map((file) => (
            <PaperThing
              key={file.id.toString()}
              {...getThingPropsFromUserFile(file, {
                onDelete: () => {
                  modals.openConfirmModal({
                    title: "Unlink file",
                    children: (
                      <Text size="sm">
                        Are you sure you want to unlink <b>{file.originalFileName}</b>? This will
                        also remove any references to it from the editor.
                      </Text>
                    ),
                    labels: { confirm: "Unlink", cancel: "Cancel" },
                    confirmProps: { color: "red" },
                    onConfirm: () => handleRemove(file.id.toString()),
                  });
                },
                action: editor
                  ? {
                      icon: ArrowLineRightIcon,
                      tooltip: "Insert into editor",
                      onClick: (id, e) => {
                        e.stopPropagation();
                        insertFileIntoEditor(file);
                      },
                    }
                  : {
                      icon: DownloadSimpleIcon,
                      tooltip: "Download",
                      onClick: (id, e) => {
                        e.stopPropagation();
                        handleFileDownload(file);
                      },
                    },
                menuItems: (
                  <PaperContextMenu.Item
                    icon={<DownloadSimpleIcon weight="bold" />}
                    onClick={() => handleFileDownload(file)}
                  >
                    Download
                  </PaperContextMenu.Item>
                ),
              })}
            />
          ))}
        </Stack>
      </Stack>

      <Modal
        opened={isLinkingModalOpen}
        onClose={() => setIsLinkingModalOpen(false)}
        title="Link existing file"
        centered
      >
        <FilePicker onSelect={handleLinkExisting} omitIds={files?.map((f) => f.id.toString())} />
      </Modal>

      <Modal
        opened={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload files"
        centered
      >
        <UploadForm
          onUpload={(files) => {
            handleUploads(files);
            setIsUploadModalOpen(false);
          }}
          onCancel={() => setIsUploadModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function UploadForm({
  onUpload,
  onCancel,
}: {
  onUpload: (files: File[]) => void;
  onCancel: () => void;
}) {
  const form = useForm<{ files: File[] }>({
    initialValues: {
      files: [],
    },
  });

  return (
    <Stack gap="md">
      <FileInput
        label="Select files"
        placeholder="Choose files to upload"
        multiple
        {...form.getInputProps("files")}
        leftSection={<UploadSimpleIcon size={16} />}
      />

      {form.values.files.length > 0 && (
        <Text size="sm">
          You have selected <b>{form.values.files.length}</b> file(s).
        </Text>
      )}

      <Group justify="flex-end">
        <Button variant="light" color="gray" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onUpload(form.values.files)}
          disabled={form.values.files.length === 0}
        >
          Upload
        </Button>
      </Group>
    </Stack>
  );
}

function FilePicker({
  onSelect,
  omitIds = [],
}: {
  onSelect: (file: IUserFile) => void;
  omitIds?: string[];
}) {
  const { data: allFiles, loading } = useFetch<undefined, IUserFile[]>({
    url: "/files",
    runOnMount: true,
  });

  if (loading) return <Loader size="sm" />;

  const filteredFiles = allFiles?.filter((f) => !omitIds.includes(f.id.toString()));

  return (
    <Stack gap="xs" style={{ maxHeight: 400, overflowY: "auto" }}>
      {filteredFiles?.map((file) => (
        <PaperThing
          key={file.id.toString()}
          {...getThingPropsFromUserFile(file, {
            onClick: () => onSelect(file),
          })}
        />
      ))}
      {filteredFiles?.length === 0 && (
        <Text size="sm" c="dimmed">
          No files available to link.
        </Text>
      )}
    </Stack>
  );
}
