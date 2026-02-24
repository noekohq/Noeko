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
  FileButton,
} from "@mantine/core";
import {
  LinkIcon,
  DownloadSimpleIcon,
  PlusIcon,
  UploadSimpleIcon,
  ArrowLineRightIcon,
  ArrowLineUpIcon,
} from "@phosphor-icons/react";
import { Editor } from "@tiptap/react";
import { useState } from "react";
import { IUserFile } from "../../../../../shared/types/userfile";
import useFetch from "@core/hooks/useFetch";
import {
  handleFileDownload,
  linkFileToConnectable,
  unlinkFileFromConnectable,
} from "@infrastructure/api/userfiles";
import styles from "./FileManager.module.scss";
import { streamImageEndpoint } from "@/vars/files";
import { api } from "@infrastructure/api/client";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import { getThingPropsFromUserFile } from "@core/design/components/Paper/Things/thingUtils";
import { useLayout } from "@/contexts/LayoutContext";

interface IFileManagerProps {
  connectableId: string;
  editor: Editor | null;
}

export default function FileManager({ connectableId, editor }: IFileManagerProps) {
  const { isMobile } = useLayout();

  const {
    data: files,
    load: refreshFiles,
    loading: loadingFiles,
  } = useFetch<undefined, IUserFile[]>({
    url: `/files/embedded/${connectableId}`,
    runOnMount: !!connectableId,
  });

  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);

  const handleRemove = async (fileId: string) => {
    await unlinkFileFromConnectable(fileId, connectableId);

    // Remove from editor if it exists
    if (editor) {
      editor.state.doc.descendants((node, pos) => {
        if (
          (node.type.name === "dreamFile" || node.type.name === "dreamImage") &&
          node.attrs.fileId === fileId
        ) {
          editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
        }
      });
    }

    refreshFiles();
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("userFile", file);

    try {
      const response = await api.post("/files", formData);
      const uploadedFile = response.data.data as IUserFile;

      await linkFileToConnectable(uploadedFile.id.toString(), connectableId);

      handleInsertFileIntoEditor(uploadedFile);
      refreshFiles();
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  const handleLinkExisting = async (file: IUserFile) => {
    await linkFileToConnectable(file.id.toString(), connectableId);
    handleInsertFileIntoEditor(file);
    refreshFiles();
    setIsLinkingModalOpen(false);
  };

  const handleInsertFileIntoEditor = (file: IUserFile) => {
    if (!editor) return;

    const nodeToInsert = file.mimeType.startsWith("image/")
      ? {
          type: "dreamImage",
          attrs: {
            src: streamImageEndpoint(file),
            alt: file.originalFileName,
            title: file.originalFileName,
            fileId: file.id.toString(),
            viewMode: "expanded",
          },
        }
      : {
          type: "dreamFile",
          attrs: {
            fileId: file.id.toString(),
            fileName: file.originalFileName,
            fileType: file.mimeType,
            viewMode: "expanded",
          },
        };

    editor
      .chain()
      .focus() // Brings focus back to the editor if the button click blurred it
      .insertContent(nodeToInsert) // Inserts at current selection or falls back to top
      .run();
  };

  return (
    <div className={styles.fileManager}>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" fw={700} c="dimmed" tt="uppercase">
            Embedded Files
          </Text>
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="light" radius="md">
                <PlusIcon weight="bold" />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Add a file</Menu.Label>
              <FileButton onChange={handleUpload}>
                {(props) => (
                  <Menu.Item {...props} leftSection={<UploadSimpleIcon size={14} />}>
                    Upload a file
                  </Menu.Item>
                )}
              </FileButton>
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
          {files?.map((file) => (
            <PaperThing
              key={file.id.toString()}
              {...getThingPropsFromUserFile(file, {
                onDelete: () => handleRemove(file.id.toString()),
                action: {
                  icon: isMobile ? ArrowLineUpIcon : ArrowLineRightIcon,
                  tooltip: "Insert",
                  onClick: (id, e) => {
                    e.stopPropagation();
                    handleInsertFileIntoEditor(file);
                  },
                },
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
    </div>
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
