import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  HandsClapping,
  Percent,
  SmileySad,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { formatFileNameToTitle, readFileContent } from "../../../utils/files";
import {
  Button,
  Card,
  Divider,
  Grid,
  Text,
  Title,
  Group,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Modal,
  Flex,
  TextInput,
  Stack,
  Alert,
  Loader,
  Progress,
} from "@mantine/core";
import { markdownToHtml } from "../../../utils/formatting";
import { Link, useNavigate } from "react-router";
import styles from "./Directory.module.scss";
import { useDebouncedCallback } from "@mantine/hooks";
import useFetch from "../../../hooks/useFetch";
import { IChunk } from "../../../../app/services/Importer";
import { IIdeaForm } from "../../../../app/database/models/ideas";
import { getChunkedIdeas } from "../../../utils/ideas";
import { sleep } from "../../../utils/helpers";

type IParsedFile = {
  title: string;
  contents?: string;
  originalContents?: string;
  originalFile: File;
};

export default function DirectoryImporter() {
  const [files, setFiles] = useState<IParsedFile[]>([]);
  const [topPath, setTopPath] = useState<string>("");

  const navigate = useNavigate();

  const allowedMimeTypes = ["text/markdown", "text/plain"];

  const handleSetFiles = async (files: File[]) => {
    const filesParsed = files.map(async (file) => {
      return {
        title: formatFileNameToTitle(file?.name),
        originalFile: file,
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
      const files = Array.from(
        (e.currentTarget as HTMLInputElement)?.files ?? [],
      );
      const topPath = files[0].webkitRelativePath.split("/")[0];
      const filteredFiles = files.filter((f) => {
        return allowedMimeTypes.includes(f.type);
      });
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

  const handleRemoveFile = (relativePath: string) => {
    setFiles((currentFiles) =>
      currentFiles.filter(
        (file) => file.originalFile.webkitRelativePath !== relativePath,
      ),
    );
  };

  const [filter, setFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const filteredFiles = files.filter((f) => {
    const include =
      f.title.toLowerCase().includes(query) ||
      f.originalFile?.name.toLowerCase().includes(query) ||
      f.originalFile?.webkitRelativePath.toLowerCase().includes(query);
    return include;
  });

  const debouncedSearch = useDebouncedCallback((q: string) => {
    setQuery(q);
  }, 500);

  useEffect(() => {
    debouncedSearch(filter);
  }, [filter]);

  const [showAll, setShowAll] = useState(false);

  const [importId, setImportId] = useState<string>();

  const { load: initializeImport } = useFetch<undefined, string>({
    url: "/import/initialize",
    method: "POST",
    onSuccess: (d) => {
      setImportId(d);
    },
  });

  const [importing, setImporting] = useState(false);
  const [progressText, setProgressText] = useState<string>();
  const [progressError, setProgressError] = useState<string>();
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [importComplete, setImportComplete] = useState(false);

  const handleInitiateUpload = useCallback(async () => {
    try {
      setImporting(true);
      setProgressPercent(5);
      setProgressText("Preparing your ideas...");
      const ideasParsed = files.map(async (file) => {
        const contents = await readFileContent(file.originalFile);
        const contentsHTML = markdownToHtml(contents);
        return {
          title: file.title,
          content: contentsHTML,
          embeddings: [],
        } satisfies IIdeaForm;
      });
      const ideas = await Promise.all(ideasParsed);
      const { chunks, tooLarge } = getChunkedIdeas(ideas, 10000);
      await sleep(500);
      console.log("Chunks: ", chunks, tooLarge);
      const allChunks = [...chunks, ...tooLarge];
      const totalRequests = allChunks.length;
      const setPercentage = (index: number) => {
        const percentage = (index / totalRequests) * 100;
        console.log("Calculated percentage: ", percentage);
        if (percentage < 10) {
          setProgressPercent(10);
          return;
        }
        if (percentage > 90) {
          setProgressPercent(90);
          return;
        }
        setProgressPercent(percentage);
      };
      setProgressText("Initiating the upload...");
      await sleep(1000);
      setProgressText("Uploading your files...");
      let i = 0;
      for (const chunk of allChunks) {
        await sleep(300);
        setPercentage(i);
        i++;
      }
      await sleep(1000);
      setProgressText("Finalizing the import...");
      setProgressPercent(95);
      await sleep(4000);
      setProgressText("Import successful!");
      setImportComplete(true);
    } catch (error) {
      console.error("Error importing directory: ", error);
      setProgressText("Something went wrong...");
      setProgressError("Looks like something went wrong with the import...");
    }
  }, [files]);

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
                  </Text>{" "}
                  and contains {files.length} files...
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
            {!importing && (
              <>
                <Grid.Col span={{ sm: 12 }}>
                  <Text>Should we start the import?</Text>
                </Grid.Col>
                <Grid.Col>
                  <Group>
                    <Button
                      onClick={() => {
                        handleReset();
                      }}
                      variant="light"
                      color="red"
                    >
                      No, Nevermind.
                    </Button>
                    <Button
                      onClick={() => {
                        handleInitiateUpload();
                      }}
                    >
                      Yes! Initiate Import.
                    </Button>
                  </Group>
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <Title order={3}>Preview</Title>
                </Grid.Col>
                {files.length > 100 && !importing && (
                  <Grid.Col span={{ sm: 12 }}>
                    <Alert
                      title="Lot's of files!"
                      icon={<WarningCircle />}
                      color="red"
                    >
                      Currently, displaying all {files.length} might be a bit
                      laggy. We're working on this, but in the meantime, feel
                      free to keep the notes hidden by default, and search
                      through them to filter, or display them and scroll!
                    </Alert>
                  </Grid.Col>
                )}
                <Grid.Col span={{ sm: 12 }}>
                  <Flex gap="md">
                    <Button
                      onClick={() => {
                        setShowAll(!showAll);
                      }}
                      variant="default"
                    >
                      {showAll ? "Hide Notes" : "Show Notes"}
                    </Button>
                    <TextInput
                      w="50%"
                      placeholder="Search files..."
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.currentTarget.value);
                      }}
                      rightSection={
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() => {
                            setFilter("");
                          }}
                        >
                          <X />
                        </ActionIcon>
                      }
                    />
                  </Flex>
                </Grid.Col>
                {(showAll || query) && (
                  <Grid.Col span={{ sm: 12 }}>
                    <Flex gap="sm" wrap={"wrap"}>
                      {filteredFiles.map((file, index) => {
                        return (
                          <ParsedFilePreview
                            key={file.originalFile.webkitRelativePath}
                            file={file}
                            onRemove={handleRemoveFile}
                          />
                        );
                      })}
                    </Flex>
                  </Grid.Col>
                )}
              </>
            )}
            {importing && (
              <>
                {progressError ? (
                  <Grid.Col span={{ sm: 12 }}>
                    <Alert
                      title="Something went wrong"
                      icon={<SmileySad />}
                      color="red"
                    >
                      <Text>{progressError}</Text>
                    </Alert>
                  </Grid.Col>
                ) : (
                  <Grid.Col span={{ sm: 12 }}>
                    <Group>
                      {!importComplete && <Loader size="sm" />}
                      <Text>{progressText}</Text>
                    </Group>
                  </Grid.Col>
                )}
                {!importComplete && (
                  <Grid.Col span={{ sm: 12 }}>
                    <Progress value={importComplete ? 100 : progressPercent} />
                  </Grid.Col>
                )}
                {importComplete && (
                  <Grid.Col span={{ sm: 12 }}>
                    <Alert icon={<HandsClapping />} title="Success!">
                      <Text>
                        We've successfully imported {files.length} ideas into
                        your knowledge base!{" "}
                        <Link
                          to="/"
                          style={{
                            textDecoration: "none",
                          }}
                        >
                          <Text c="white" component="span" td="underline">
                            Check them out!
                          </Text>
                        </Link>
                      </Text>
                    </Alert>
                  </Grid.Col>
                )}
              </>
            )}
          </>
        )}
      </Grid>
    </div>
  );
}

type IParsedFilePreviewProps = {
  file: IParsedFile;
  onRemove: (relativePath: string) => void;
};

function ParsedFilePreview({
  file: originalFile,
  onRemove,
}: IParsedFilePreviewProps) {
  const [file, setFile] = useState(originalFile);
  const [previewOpen, setPreviewOpen] = useState(false);
  const handleRemove = () => {
    onRemove(file.originalFile.webkitRelativePath);
  };

  const handleOpenPreview = async () => {
    if (!file) {
      return;
    }
    const readContent = await readFileContent(file.originalFile);
    setFile({
      ...file,
      originalContents: readContent,
      contents: markdownToHtml(readContent),
    });
    setPreviewOpen(true);
  };

  const getLastNFromPath = (n: number) => {
    const [path, ext] = file.originalFile.webkitRelativePath.split(".");
    return `${path.slice(-n)}.${ext}`;
  };

  return (
    <div>
      <Card py="sm" radius="lg">
        <Stack gap={"xs"}>
          <Text size="xs" c="dimmed">
            {getLastNFromPath(file.title.length)}
          </Text>
          <Group>
            <Text fw="bold">{file.title}</Text>
            <Group>
              <ActionIcon
                variant="default"
                onClick={() => {
                  handleOpenPreview();
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
        </Stack>
      </Card>

      <Modal
        title={`Previewing: ${file.title}`}
        opened={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
        }}
        size="80%"
      >
        <Stack gap="sm">
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
          <Divider my="sm" />
          <Text size="sm" c="dimmed">
            {file.originalFile.webkitRelativePath}
          </Text>
          <Title order={3}>{file.title}</Title>
          <Divider my="sm" />
          <ScrollArea h="100%" w="100%" type="always" scrollbars="xy">
            <Text
              className={styles.filePreviewContent}
              dangerouslySetInnerHTML={{ __html: file.contents || "" }}
            />
          </ScrollArea>
        </Stack>
      </Modal>
    </div>
  );
}
