import { RecordId } from "surrealdb";
import { IExcerpt, IPDFMetadata } from "../../../../../../../shared/types/excerpt";
import { useCallback, useEffect, useState } from "react";
import { getFileDownloadLink } from "@infrastructure/api/userfiles";
import { ActionIcon, Group, Loader, Stack, Text, Textarea, useMantineTheme } from "@mantine/core";
import {
  CheckIcon,
  FrameCornersIcon,
  HighlighterIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import styles from "./PDF.module.scss";

/* -- EmbedPDF Configuration -- */
import { createPluginRegistration } from "@embedpdf/core";
import { PdfAnnotationSubtype, Rect } from "@embedpdf/models";
import { EmbedPDF } from "@embedpdf/core/react";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import { useZoom, ZoomPluginPackage, ZoomMode } from "@embedpdf/plugin-zoom/react";
import { Viewport, ViewportPluginPackage } from "@embedpdf/plugin-viewport/react";
import { Scroller, ScrollPluginPackage, ScrollStrategy } from "@embedpdf/plugin-scroll/react";
import { LoaderPluginPackage } from "@embedpdf/plugin-loader/react";
import {
  RenderLayer,
  RenderPluginPackage,
  useRenderCapability,
} from "@embedpdf/plugin-render/react";
import {
  SelectionLayer,
  SelectionPluginPackage,
  useSelectionCapability,
} from "@embedpdf/plugin-selection/react";
import {
  AnnotationLayer,
  AnnotationPluginPackage,
  TrackedAnnotation,
  useAnnotationCapability,
} from "@embedpdf/plugin-annotation/react";
import {
  GlobalPointerProvider,
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from "@embedpdf/plugin-interaction-manager/react";
import Loading from "@core/design/components/Loading/Loading";
import { PDFViewerProvider, usePDFViewer } from "./PDFContext";
import { showNotification } from "@mantine/notifications";
import { useSource } from "@domains/knowledge/pages/Sources/SourceContext";
import useFetch from "@core/hooks/useFetch";
import { useForm } from "@mantine/form";

const defaultZoomLevel = ZoomMode.FitPage;
const defaultPlugins = [
  createPluginRegistration(ViewportPluginPackage, {
    viewportGap: 14,
  }),
  createPluginRegistration(ScrollPluginPackage, {
    strategy: ScrollStrategy.Vertical,
  }),
  createPluginRegistration(RenderPluginPackage),
  createPluginRegistration(ZoomPluginPackage, {
    defaultZoomLevel,
  }),
  createPluginRegistration(AnnotationPluginPackage),
  createPluginRegistration(InteractionManagerPluginPackage),
  createPluginRegistration(SelectionPluginPackage),
  // createPluginRegistration(UIPluginPackage, {
  //   components: defaultComponents,
  // }),
];

interface IPDFViewerProps {
  fileId: string | RecordId | undefined;
}

export default function PDFViewer({ fileId }: IPDFViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingPDFFile, setLoadingPDFFile] = useState<boolean>(true);

  useEffect(() => {
    if (!fileId) {
      setFileUrl(null);
      setLoadingPDFFile(false);
      return;
    }

    const fetchFile = async () => {
      try {
        setLoadingPDFFile(true);
        const objectUrl = await getFileDownloadLink(fileId.toString());
        setFileUrl(objectUrl);
      } catch (error) {
        console.error("Error getting file download link:", error);
        setFileUrl(null);
      } finally {
        setLoadingPDFFile(false);
      }
    };

    fetchFile();
  }, [fileId]);

  const plugins =
    fileId && fileUrl
      ? [
          ...defaultPlugins,
          createPluginRegistration(LoaderPluginPackage, {
            loadingOptions: {
              type: "url",
              pdfFile: {
                id: fileId.toString(),
                url: fileUrl,
              },
            },
          }),
        ]
      : [...defaultPlugins];

  const { engine, isLoading: loadingEngine } = usePdfiumEngine();

  const loadingSomething = loadingEngine || loadingPDFFile;

  if (loadingSomething) {
    return (
      <div>
        <Loading color="blue" size="lg" />
      </div>
    );
  }

  if (!engine) {
    return (
      <div>
        <Text c="dimmed">Something went wrong.</Text>
      </div>
    );
  }

  return (
    <PDFViewerProvider
      state={{
        loading: loadingSomething,
      }}
    >
      <div className={styles.viewer}>
        <EmbedPDF engine={engine} plugins={plugins}>
          {({ pluginsReady, isInitializing }) => {
            return (
              <>
                <Toolbar />
                <div className={styles.viewportContainer}>
                  <div>
                    <GlobalPointerProvider>
                      <Viewport className={styles.viewPort}>
                        <Scroller
                          renderPage={({ width, height, pageIndex, scale, rotation }) => {
                            return (
                              <div className={styles.page} style={{ width, height }}>
                                <PagePointerProvider
                                  rotation={rotation}
                                  scale={scale}
                                  pageWidth={width}
                                  pageHeight={height}
                                  pageIndex={pageIndex}
                                  style={{
                                    width,
                                    height,
                                  }}
                                >
                                  <RenderLayer pageIndex={pageIndex} scaleFactor={scale} />
                                  <SelectionLayer pageIndex={pageIndex} scale={scale} />
                                  <SelectionMenu />
                                  <AnnotationLayer
                                    pageIndex={pageIndex}
                                    scale={scale}
                                    pageWidth={width}
                                    pageHeight={height}
                                    rotation={rotation}
                                    selectionMenu={({
                                      selected,
                                      rect,
                                      annotation,
                                      menuWrapperProps,
                                    }) => {
                                      return (
                                        <div
                                          {...menuWrapperProps}
                                          style={{
                                            ...menuWrapperProps.style,
                                          }}
                                        >
                                          {selected && (
                                            <AnnotationMenu
                                              trackedAnnotation={annotation}
                                              rect={rect}
                                            />
                                          )}
                                        </div>
                                      );
                                    }}
                                  />
                                </PagePointerProvider>
                              </div>
                            );
                          }}
                        />
                      </Viewport>
                    </GlobalPointerProvider>
                  </div>
                </div>
              </>
            );
          }}
        </EmbedPDF>
      </div>
    </PDFViewerProvider>
  );
}

interface IToolbarProps {}

function Toolbar() {
  const { provides, state } = useZoom();
  const { provides: annotations } = useAnnotationCapability();
  const {
    selection: {
      formatted: { has: hasSelection, get: formattedSelection },
      text: { get: selectedText },
    },
  } = usePDFViewer();

  const excerptToAnnotation = async (excerpt: IExcerpt) => {
    if (!excerpt.pdfMetadata) {
      return;
    }
    const {
      pdfMetadata: { pageIndex, data },
    } = excerpt;

    const pageAnnotations = await annotations?.getPageAnnotations({ pageIndex }).toPromise();
    if (pageAnnotations?.find((pa) => pa.id === excerpt.id.toString())) {
      annotations?.deleteAnnotation(pageIndex, excerpt.id.toString());
    }
    annotations?.createAnnotation(excerpt.pdfMetadata?.pageIndex, {
      ...data,
      id: excerpt.id.toString(),
      type: PdfAnnotationSubtype.HIGHLIGHT,
      color: "var(--color-highlight)",
      opacity: 0.25,
    });
  };

  const {
    excerpts: { create: createExcerpt, all: allExcerpts },
  } = useSource();
  const loadAnnotations = useCallback(async () => {
    allExcerpts.forEach(async (excerpt) => {
      excerptToAnnotation(excerpt);
    });
  }, []);

  useEffect(() => {
    loadAnnotations();
  }, []);

  const { colors } = useMantineTheme();

  const [highlighting, setHighlighting] = useState(false);
  const highlightSelection = async () => {
    try {
      if (!formattedSelection) {
        console.error("Attempted to highlight non-formatted selection.");
        return;
      }
      if (!selectedText) {
        console.error("No contents of selection: ", formattedSelection, selectedText);
        return;
      }
      setHighlighting(true);
      const {
        formatted: { pageIndex, segmentRects, rect },
      } = formattedSelection;
      const { contents } = selectedText;
      const metadata: IPDFMetadata["data"] = {
        pageIndex,
        type: PdfAnnotationSubtype.HIGHLIGHT,
        segmentRects,
        rect,
      };
      const excerpt = await createExcerpt({
        sourceText: contents.join(""),
        note: "",
        pdfMetadata: { pageIndex, data: metadata },
      });
      if (!excerpt) {
        console.error("Couldn't create excerpt: ", excerpt, formattedSelection, selectedText);
        showNotification({
          title: "Something went wrong",
          message: "Couldn't create the excerpt.",
        });
        return;
      }
      excerptToAnnotation(excerpt);
    } catch (error) {
      console.error("Error highlighting text: ", error);
    } finally {
      setHighlighting(false);
    }
  };

  return (
    <div className={styles.toolbar}>
      <Group gap="xs">
        <ActionIcon
          size="sm"
          onClick={() => {
            provides?.zoomOut();
          }}
          color="gray"
          variant="light"
        >
          <MagnifyingGlassMinusIcon />
        </ActionIcon>
        <Text size="sm" style={{ minWidth: "40px", textAlign: "center" }}>
          {Math.round(state.currentZoomLevel * 100)}%
        </Text>
        <ActionIcon
          size="sm"
          onClick={() => {
            provides?.zoomIn();
          }}
          color="gray"
          variant="light"
        >
          <MagnifyingGlassPlusIcon />
        </ActionIcon>
        <ActionIcon
          size="sm"
          onClick={() => {
            provides?.requestZoom(defaultZoomLevel);
          }}
          color="gray"
          variant="light"
        >
          <FrameCornersIcon />
        </ActionIcon>
      </Group>
      {hasSelection && (
        <>
          <div className={styles.divider} />
          <Group>
            <ActionIcon
              size="sm"
              onClick={() => {
                highlightSelection();
              }}
              color="gray"
              variant="light"
              loading={highlighting}
              loaderProps={{
                color: "gray",
              }}
            >
              <HighlighterIcon />
            </ActionIcon>
          </Group>
        </>
      )}
    </div>
  );
}

type ISelectionMenuProps = {};

function SelectionMenu({}: ISelectionMenuProps) {
  const { provides: selections } = useSelectionCapability();
  const { provides: annotations } = useAnnotationCapability();
  const { isLoading } = useRenderCapability();

  const {
    excerpts: { all },
  } = useSource();

  const { colors } = useMantineTheme();

  const {
    state: { loading },
  } = usePDFViewer();

  const {
    selection: {
      formatted: { set: setFormattedSelection },
      text: { set: setSelectionText },
    },
  } = usePDFViewer();

  useEffect(() => {
    selections?.onEndSelection(() => {
      const formatted = selections.getFormattedSelection()[0];
      if (formatted) {
        setFormattedSelection({ formatted });
      } else {
        setFormattedSelection(null);
      }
    });
    selections?.onSelectionChange(() => {
      selections.getSelectedText().wait(
        (value) => {
          setSelectionText({ contents: value });
        },
        (err) => {
          setSelectionText(null);
        }
      );
    });
  }, []);

  return <div />;
}

interface IAnnotationMenuProps {
  trackedAnnotation: TrackedAnnotation;
  rect: Rect;
}

function AnnotationMenu({ trackedAnnotation, rect }: IAnnotationMenuProps) {
  const { provides } = useAnnotationCapability();
  const {
    excerpts: { edit: updateExcerpt, delete: deleteExcerpt },
  } = useSource();

  const { contents, pageIndex, id } = trackedAnnotation.object;

  const {
    load: loadExcerpt,
    data: excerpt,
    loading: loadingExcerpt,
  } = useFetch<undefined, IExcerpt>({
    url: `/excerpts/${id}`,
    dependencies: [id],
  });

  useEffect(() => {
    if (id) {
      loadExcerpt();
    }
  }, [id]);

  const handleDeselectAnnotation = () => {
    provides?.deselectAnnotation();
  };

  const handleRemoveAnnotation = () => {
    provides?.deleteAnnotation(pageIndex, id);
    deleteExcerpt(id);
  };

  const form = useForm({
    initialValues: {
      note: excerpt?.note ?? "",
    },
    validate: {
      note: (value) => (value.length < 2 ? "Note must be at least 2 characters long" : null),
    },
  });

  useEffect(() => {
    if (excerpt) {
      form.setDirty({ note: false });
      form.setValues({
        note: excerpt.note,
      });
    }
  }, [excerpt]);

  const [updatingNote, setUpdatingNote] = useState(false);
  const handleUpdateNote = () => {
    setUpdatingNote(true);
    updateExcerpt(id, { note: form.values.note })
      .then(() => {
        handleDeselectAnnotation();
      })
      .finally(() => {
        setUpdatingNote(false);
      });
  };

  return (
    <div
      style={{
        top: rect.size.height,
        pointerEvents: "auto",
        position: "absolute",
      }}
      className={styles.annotationMenu}
    >
      <Stack gap="sm">
        {loadingExcerpt && (
          <Group>
            <Loader size="xs" color="gray" />
          </Group>
        )}
        <Group gap="xs" justify="space-between">
          <Textarea
            placeholder="Make a note..."
            minRows={2}
            autosize
            {...form.getInputProps("note")}
            variant="unstyled"
            w="100%"
            disabled={loadingExcerpt}
          />
        </Group>
        <Group justify="space-between" gap="xs">
          <Group gap="xs">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              title="Exit menu"
              onClick={() => {
                handleDeselectAnnotation();
              }}
            >
              <XIcon />
            </ActionIcon>
          </Group>
          <Group gap="xs">
            <ActionIcon
              onClick={() => {
                handleRemoveAnnotation();
              }}
              size="sm"
              variant="light"
              color="gray"
              title="Remove annotation"
            >
              <TrashIcon />
            </ActionIcon>
            <ActionIcon
              onClick={() => {
                handleUpdateNote();
              }}
              size="sm"
              variant="light"
              color="gray"
              title="Update annotation"
              loading={updatingNote}
              disabled={!form.isDirty("note")}
            >
              <CheckIcon weight="bold" />
            </ActionIcon>
          </Group>
        </Group>
      </Stack>
    </div>
  );
}
