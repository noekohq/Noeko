import React, { useState } from "react";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import styles from "./Import.module.scss";
import { Grid, Select, Text, Title } from "@mantine/core";
import MarkdownFileImporter from "./importers/MarkdownFile";
import TextFileImporter from "./importers/TextFile";
import DirectoryImporter from "./importers/Directory";
import Content from "../../components/UI/Layout/Content";
import StatusBar from "../../components/UI/Layout/Bottom";
import { useTourStep } from "../../contexts/TourGuideContext";
import Nav from "../../components/UI/Layout/Nav";

type IImportType = "markdown-file" | "text-file" | "directory";

export default function Import() {
  const tourRef = useTourStep({
    id: "feature:import",
    view: "import",
    order: 0,
    title: "Import",
    content: (
      <>
        <p>
          You can import your stuff directly into Noeko through the automated
          workflow.
        </p>
        <p>
          We will add more import options over time, if you have suggestions,
          let us know :)
        </p>
      </>
    ),
  });

  const [importType, setImportType] = useState<IImportType>("markdown-file");

  const typeToComponent: Record<IImportType, React.ReactNode | null> = {
    "markdown-file": <MarkdownFileImporter />,
    "text-file": <TextFileImporter />,
    directory: <DirectoryImporter />,
  };

  return (
    <PageWrapper>
      <LeftSidebar />
      <Content>
        <Grid pos="relative" ref={tourRef}>
          <Grid.Col span={{ sm: 12 }}>
            <Title>Import</Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text>
              I would like to import{" "}
              <Select
                display="inline-block"
                ml="xs"
                size="sm"
                value={importType}
                data={[
                  {
                    label: "a markdown file",
                    value: "markdown-file" satisfies IImportType,
                  },
                  {
                    label: "a text file",
                    value: "text-file" satisfies IImportType,
                  },
                  {
                    label: "a folder",
                    value: "directory" satisfies IImportType,
                  },
                ]}
                onChange={(v) => {
                  setImportType(v as IImportType);
                }}
              />
            </Text>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>{typeToComponent[importType]}</Grid.Col>
        </Grid>
        <span />
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
