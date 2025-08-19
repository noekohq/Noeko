import { Document, Page, pdfjs } from "react-pdf";
import styles from "./PDF.module.scss";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useEffect, useRef, useState } from "react";
import { RecordId } from "surrealdb";
import { getFileDownloadLink } from "../../../../utils/userfiles";
import {
  Group,
  Loader,
  Paper,
  Skeleton,
  Stack,
  Text,
  Transition,
} from "@mantine/core";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface IPDFViewerProps {
  fileId: string | RecordId | undefined;
}

export default function PDFViewer({ fileId }: IPDFViewerProps) {
  const [file, setFile] = useState<string>();
  const [loading, setLoading] = useState<boolean>(true);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    if (!fileId) return;

    (async () => {
      try {
        setLoading(true);
        const objectUrl = await getFileDownloadLink(fileId.toString());
        console.log("Object url: ", objectUrl);
        setFile(objectUrl);
      } catch (error) {
        console.log("Error getting file download:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  const pdfViewerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    if (pdfViewerRef.current) {
      observer.observe(pdfViewerRef.current);
    }

    // Cleanup observer on component unmount
    return () => {
      observer.disconnect();
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className={styles.pdfViewer} ref={pdfViewerRef}>
      <Transition transition="fade-up" mounted={loading}>
        {(style) => {
          return (
            <Text style={style} size="sm" c="dimmed">
              <Group gap="xs">
                <Loader />
                Loading viewer...
              </Group>
            </Text>
          );
        }}
      </Transition>
      <Transition transition="fade-up" mounted={!!file}>
        {(style) => {
          return (
            <div style={style}>
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                className={styles.document}
                loading={() => {
                  return <PDFPlaceholder width={containerWidth} />;
                }}
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    renderTextLayer
                    className={styles.page}
                    width={containerWidth > 0 ? containerWidth : undefined}
                  />
                ))}
              </Document>
            </div>
          );
        }}
      </Transition>
    </div>
  );
}

const ParagraphSkeleton = () => (
  <Stack gap="xs">
    <Skeleton height={8} radius="xl" />
    <Skeleton height={8} width="95%" radius="xl" />
    <Skeleton height={8} width="98%" radius="xl" />
    <Skeleton height={8} width="92%" radius="xl" />
    <Skeleton height={8} width="80%" radius="xl" />
  </Stack>
);

interface IPDFPlaceholderProps {
  /** The width of the container, used to calculate the height */
  width: number;
}

function PDFPlaceholder({ width }: IPDFPlaceholderProps) {
  const placeholderHeight = width > 0 ? width * (11 / 8.5) : 800;

  return (
    <Paper
      shadow="md"
      p="lg"
      w={width > 0 ? width : "100%"}
      h={placeholderHeight}
      withBorder
    >
      <Stack>
        {/* Title Skeleton */}
        <Skeleton height={20} width="60%" radius="xl" mb="xl" />

        {/* Paragraph Skeletons */}
        <ParagraphSkeleton />
        <ParagraphSkeleton />
        <ParagraphSkeleton />
        <ParagraphSkeleton />
      </Stack>
    </Paper>
  );
}
