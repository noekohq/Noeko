import { RecordId } from "surrealdb";
import {
  IExcerpt,
  IExcerptForm,
} from "../../../../../app/database/models/excerpt";
import { useEffect, useState } from "react";
import { getFileDownloadLink } from "../../../../utils/userfiles";
import styles from "./PDF.module.scss";
import { createPluginRegistration } from "@embedpdf/core";
import { EmbedPDF } from "@embedpdf/core/react";
import { usePdfiumEngine } from "@embedpdf/engines/react";
import { useZoom, ZoomPluginPackage } from "@embedpdf/plugin-zoom/react";
import {
  Viewport,
  ViewportPluginPackage,
} from "@embedpdf/plugin-viewport/react";
import { Scroller, ScrollPluginPackage } from "@embedpdf/plugin-scroll/react";
import { LoaderPluginPackage } from "@embedpdf/plugin-loader/react";
import {
  RenderLayer,
  RenderPluginPackage,
} from "@embedpdf/plugin-render/react";
import { ActionIcon, Group, Text } from "@mantine/core";
import {
  ArrowsClockwiseIcon,
  FrameCornersIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";

const defaultZoomLevel = 1;
const defaultPlugins = [
  createPluginRegistration(ViewportPluginPackage),
  createPluginRegistration(ScrollPluginPackage),
  createPluginRegistration(RenderPluginPackage),
  createPluginRegistration(ZoomPluginPackage, {
    defaultZoomLevel,
  }),
];

interface IPDFViewerProps {
  fileId: string | RecordId | undefined;
  excerpts?: IExcerpt[];
  onExcerpt?: (data: IExcerptForm) => void;
  editExcerpt?: (id: string | RecordId, newNote: string) => void;
  deleteExcerpt?: (id: string | RecordId) => void;
}

export default function PDFViewer({ fileId }: IPDFViewerProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!fileId) {
      setFileUrl(null);
      setLoading(false);
      return;
    }

    const fetchFile = async () => {
      try {
        setLoading(true);
        const objectUrl = await getFileDownloadLink(fileId.toString());
        setFileUrl(objectUrl);
      } catch (error) {
        console.error("Error getting file download link:", error);
        setFileUrl(null);
      } finally {
        setLoading(false);
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

  const { engine, isLoading } = usePdfiumEngine();

  if (isLoading || !engine || (fileId && loading)) {
    return <div>Loading PDF...</div>;
  }

  return (
    <div className={styles.viewer}>
      <EmbedPDF engine={engine} plugins={plugins}>
        <Toolbar />

        <div className={styles.viewportContainer}>
          <Viewport className={styles.viewPort}>
            <Scroller
              renderPage={({ width, height, pageIndex, scale }) => {
                return (
                  <div className={styles.page} style={{ width, height }}>
                    <RenderLayer pageIndex={pageIndex} scaleFactor={scale} />
                  </div>
                );
              }}
            />
          </Viewport>
        </div>
      </EmbedPDF>
    </div>
  );
}

// Toolbar component remains the same, but it will now work correctly
function Toolbar() {
  const { provides, state } = useZoom();

  return (
    <div className={styles.toolbar}>
      <Group>
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
    </div>
  );
}
