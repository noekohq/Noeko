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

type IImportType = "markdown-file" | "text-file" | "directory";

export default function Import() {
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
        <Grid>
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
      </Content>
      <RightSidebar />
    </PageWrapper>
  );
}
