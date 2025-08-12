import { Document, Page, pdfjs } from "react-pdf";
import styles from "./PDF.module.scss";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useEffect, useState } from "react";
import { RecordId } from "surrealdb";
import { getFileDownload } from "../../../utils/userfiles";
import { Group, Text } from "@mantine/core";
import Loading from "../../../components/Display/Loading/Loading";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

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
        const objectUrl = await getFileDownload(fileId.toString());
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

  if (loading) {
    return (
      <Group>
        <Loading size="sm" />
        <Text>Loading PDF...</Text>
      </Group>
    );
  }

  if (!file) {
    return (
      <Text c="dimmed" size="sm">
        Couldn't display this PDF :/
      </Text>
    );
  }

  return (
    <div className={styles.pdfViewer}>
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        className={styles.document}
      >
        {Array.from(new Array(numPages), (el, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            renderTextLayer
            className={styles.page}
          />
        ))}
      </Document>
    </div>
  );
}
