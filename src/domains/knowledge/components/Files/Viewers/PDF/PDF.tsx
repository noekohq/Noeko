import { RecordId } from "surrealdb";
import { useEffect, useState, useMemo, useRef } from "react";
import { getFileDownloadLink } from "@infrastructure/api/userfiles";
import { Loader, Text } from "@mantine/core";
import styles from "./PDF.module.scss";

/* -- EmbedPDF V2 Configuration -- */
import { createPluginRegistration } from "@embedpdf/core";
import { EmbedPDF } from "@embedpdf/core/react";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import {
  DocumentManagerPluginPackage,
  DocumentContent,
} from "@embedpdf/plugin-document-manager/react";
import { ViewportPluginPackage, Viewport } from "@embedpdf/plugin-viewport/react";
import {
  ScrollPluginPackage,
  Scroller,
  ScrollStrategy,
  PageLayout,
} from "@embedpdf/plugin-scroll/react";
import { RenderPluginPackage, RenderLayer } from "@embedpdf/plugin-render/react";
import { ZoomPluginPackage, ZoomMode, useZoom } from "@embedpdf/plugin-zoom/react";
import { AnnotationPluginPackage, AnnotationLayer } from "@embedpdf/plugin-annotation/react";
import { SelectionPluginPackage, SelectionLayer } from "@embedpdf/plugin-selection/react";
import {
  InteractionManagerPluginPackage,
  GlobalPointerProvider,
  PagePointerProvider,
} from "@embedpdf/plugin-interaction-manager/react";

import { PDFViewerProvider } from "./PDFContext";
import SelectionMenu from "./SelectionMenu";
import ExcerptAnnotationSync from "./ExcerptAnnotations";
import { Toolbar } from "./Toolbar";

interface IPDFViewerProps {
  fileId: string | RecordId | undefined;
}

// ------------------------------------------------------------------
// 📄 PAGE COMPONENT: Extracted to safely consume hooks and refs per-page
// ------------------------------------------------------------------
function PDFPage({ documentId, layout }: { documentId: string; layout: PageLayout }) {
  const { state: zoomState } = useZoom(documentId);
  const scale = zoomState.currentZoomLevel;
  const rotation = 0;

  // Create a strict ref to the physical DOM wrapper of this page
  const pageRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={pageRef}
      className={styles.page}
      style={{
        width: `${layout.rotatedWidth}px`,
        height: `${layout.rotatedHeight}px`,
        position: "relative",
        backgroundColor: "white",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      }}
    >
      <PagePointerProvider
        documentId={documentId}
        pageIndex={layout.pageIndex}
        rotation={rotation}
        scale={scale}
      >
        <RenderLayer documentId={documentId} pageIndex={layout.pageIndex} />
        <SelectionLayer documentId={documentId} pageIndex={layout.pageIndex} />
        <SelectionMenu documentId={documentId} pageIndex={layout.pageIndex} />
        <ExcerptAnnotationSync documentId={documentId} pageIndex={layout.pageIndex} />
        <AnnotationLayer documentId={documentId} pageIndex={layout.pageIndex} />
      </PagePointerProvider>
    </div>
  );
}

// ------------------------------------------------------------------
// MAIN VIEWER COMPONENT
// ------------------------------------------------------------------
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
        console.error("Error getting file link:", error);
        setFileUrl(null);
      } finally {
        setLoadingPDFFile(false);
      }
    };

    fetchFile();
  }, [fileId]);

  const { engine, isLoading: loadingEngine, error: engineError } = usePdfiumEngine();

  useEffect(() => {
    if (engineError) console.error("Failed to load WASM:", engineError);
  }, [engine, engineError]);

  const plugins = useMemo(() => {
    if (!fileId || !fileUrl) return [];

    return [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url: fileUrl }],
      }),
      createPluginRegistration(ViewportPluginPackage, { viewportGap: 14 }),
      createPluginRegistration(ScrollPluginPackage, {
        defaultStrategy: ScrollStrategy.Vertical,
        defaultPageGap: 14,
      }),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(ZoomPluginPackage, { defaultZoomLevel: ZoomMode.FitWidth }),
      createPluginRegistration(AnnotationPluginPackage),
      createPluginRegistration(SelectionPluginPackage),
      createPluginRegistration(InteractionManagerPluginPackage),
    ];
  }, [fileId, fileUrl]);

  const isLoading = loadingEngine || loadingPDFFile;

  if (isLoading) return <Loader color="blue" size="lg" />;
  if (!engine) return <Text c="dimmed">Failed to initialize PDF engine.</Text>;
  if (!fileId || !fileUrl || plugins.length === 0)
    return <Text c="dimmed">Awaiting file URL...</Text>;

  return (
    <PDFViewerProvider state={{ loading: isLoading }}>
      <div
        className={styles.viewer}
        style={{ height: "100%", minHeight: "600px", display: "flex", flexDirection: "column" }}
      >
        <EmbedPDF engine={engine} plugins={plugins}>
          {({ activeDocumentId }) => {
            if (!activeDocumentId) return null;

            return (
              <>
                <Toolbar documentId={activeDocumentId} />
                <DocumentContent documentId={activeDocumentId}>
                  {(docState) => {
                    if (docState.isError) {
                      return (
                        <div style={{ padding: 20, color: "red" }}>
                          Error parsing PDF data buffer.
                        </div>
                      );
                    }

                    if (docState.isLoaded) {
                      return (
                        <div
                          className={styles.viewportContainer}
                          style={{ flex: 1, position: "relative", overflow: "hidden" }}
                        >
                          <GlobalPointerProvider documentId={activeDocumentId}>
                            <Viewport
                              documentId={activeDocumentId}
                              className={styles.viewPort}
                              style={{ position: "absolute", inset: 0 }}
                            >
                              <Scroller
                                documentId={activeDocumentId}
                                renderPage={(layout: PageLayout) => (
                                  <PDFPage
                                    key={`page-${layout.pageIndex}`}
                                    documentId={activeDocumentId}
                                    layout={layout}
                                  />
                                )}
                              />
                            </Viewport>
                          </GlobalPointerProvider>
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        <Loader size="sm" color="gray" />
                      </div>
                    );
                  }}
                </DocumentContent>
              </>
            );
          }}
        </EmbedPDF>
      </div>
    </PDFViewerProvider>
  );
}
