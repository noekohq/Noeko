import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import useFetch from "../../../hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import { DownloadSimple, Eye, FileMd, Pi, X } from "@phosphor-icons/react";
import { formatFileNameToTitle, readFileContent } from "../../../utils/files";
import {
  Button,
  Card,
  Code,
  Divider,
  FileInput,
  Grid,
  Text,
  Title,
  Stack,
  Loader,
  Group,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Modal,
  Flex,
  TextInput,
} from "@mantine/core";
import { formatFileSize, markdownToHtml } from "../../../utils/formatting";
import { IIdea } from "../../../../app/database/models/ideas";
import { useNavigate } from "react-router";
import styles from "./Directory.module.scss";
import { useDebouncedCallback } from "@mantine/hooks";

type IParsedFile = {
  title: string;
  contents: string;
  originalContents: string;
  originalName: string;
  relativePath: string;
};

export default function DirectoryImporter() {
  const [files, setFiles] = useState<IParsedFile[]>([]);
  const [topPath, setTopPath] = useState<string>("");

  const navigate = useNavigate();

  const allowedMimeTypes = ["text/markdown", "text/plain"];

  const handleSetFiles = async (files: File[]) => {
    const filesParsed = files.map(async (file) => {
      const content = await readFileContent(file);
      const contentAsHTML = await markdownToHtml(content);
      return {
        title: formatFileNameToTitle(file.name),
        originalContents: content,
        contents: contentAsHTML,
        originalName: file.name,
        relativePath: file.webkitRelativePath,
      } satisfies IParsedFile;
    });
    const newFiles = await Promise.all(filesParsed);
    setFiles(newFiles);
  };

  const handleOpenDirectorySelector = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "text/*";
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = (e) => {
      console.log("Filelist: ", (e.currentTarget as HTMLInputElement)?.files);
      const files = Array.from(
        (e.currentTarget as HTMLInputElement)?.files ?? [],
      );
      console.log("Allowed types: ", allowedMimeTypes);
      const topPath = files[0].webkitRelativePath.split("/")[0];
      const filteredFiles = files.filter((f) => {
        console.log(
          "Checking file: ",
          f,
          f.type,
          allowedMimeTypes.includes(f.type),
        );
        return allowedMimeTypes.includes(f.type);
      });
      console.log("Filtered files: ", filteredFiles);
      setTopPath(topPath);
      handleSetFiles(filteredFiles);
      input.remove();
    };
    input.click();
  };

  const hasFiles = files.length > 0;

  const handleReset = () => {
    setFiles([]);
    setTopPath("");
  };

  const handleRemoveFile = (index: number) => {
    const filesCopy = [...files];
    filesCopy.splice(index, 1);
    setFiles(filesCopy);
  };

  const [filter, setFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const filteredFiles = files.filter((f) => {
    const include =
      f.title.toLowerCase().includes(query) ||
      f.originalContents.toLowerCase().includes(query) ||
      f.originalName.toLowerCase().includes(query);
    return include;
  });

  const debouncedSearch = useDebouncedCallback((q: string) => {
    setQuery(q);
  }, 500);

  useEffect(() => {
    debouncedSearch(filter);
  }, [filter]);

  return (
    <div>
      <Grid>
        {!hasFiles && (
          <>
            <Grid.Col span={{ sm: 12 }}>
              <Text>From the following location...</Text>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Button
                onClick={() => {
                  handleOpenDirectorySelector();
                }}
              >
                Choose Location
              </Button>
            </Grid.Col>
          </>
        )}
        {hasFiles && (
          <>
            <Grid.Col span={{ sm: 12 }}>
              <Group>
                <Text>
                  The folder is named{" "}
                  <Text inline fw="bold" component="span">
                    {topPath.toUpperCase()}
                  </Text>
                </Text>
                <Tooltip label="Clear this selection.">
                  <ActionIcon
                    variant="default"
                    onClick={() => {
                      handleReset();
                    }}
                    size="sm"
                  >
                    <X weight="bold" />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Text>and contains {files.length} files...</Text>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                placeholder="Search files..."
                value={filter}
                onChange={(e) => {
                  setFilter(e.currentTarget.value);
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Flex gap="sm" wrap={"wrap"}>
                {filteredFiles.map((file, index) => {
                  return (
                    <ParsedFilePreview
                      key={file.relativePath}
                      file={file}
                      index={index}
                      onRemove={handleRemoveFile}
                    />
                  );
                })}
              </Flex>
            </Grid.Col>
          </>
        )}
      </Grid>
    </div>
  );
}

type IParsedFilePreviewProps = {
  file: IParsedFile;
  index: number;
  onRemove: (index: number) => void;
};

function ParsedFilePreview({ file, index, onRemove }: IParsedFilePreviewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const handleRemove = () => {
    onRemove(index);
  };

  return (
    <div>
      <Card py="sm" radius="lg">
        <Group>
          <Text>{file.title}</Text>
          <Group>
            <ActionIcon
              variant="default"
              onClick={() => {
                setPreviewOpen(true);
              }}
            >
              <Eye />
            </ActionIcon>
            <ActionIcon
              variant="default"
              onClick={() => {
                handleRemove();
              }}
            >
              <X />
            </ActionIcon>
          </Group>
        </Group>
      </Card>

      <Modal
        title={`Previewing: ${file.title}`}
        opened={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
        }}
        size="80%"
      >
        <Group>
          <Button
            variant="default"
            onClick={() => {
              setPreviewOpen(false);
            }}
          >
            Close
          </Button>
        </Group>
        <Divider my="lg" />
        <Title order={3}>{file.title}</Title>
        <Divider my="lg" />
        <ScrollArea h="100%" w="100%" type="always" scrollbars="xy">
          <Text
            className={styles.filePreviewContent}
            dangerouslySetInnerHTML={{ __html: file.contents }}
          />
        </ScrollArea>
      </Modal>
    </div>
  );
}
