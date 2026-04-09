import React, { useState } from "react";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import styles from "./Import.module.scss";
import { Grid, Select, Text, Title } from "@mantine/core";
import MarkdownFileImporter from "./importers/MarkdownFile";
import TextFileImporter from "./importers/TextFile";
import DirectoryImporter from "./importers/Directory";
import Content from "@core/design/components/Layout/Content";
import StatusBar from "@core/design/components/Layout/Bottom";
import { useTourStep } from "@/contexts/TourGuideContext";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";

type IImportType = "markdown-file" | "text-file" | "directory";

export default function Import() {
  const { i18n } = useLingui();
  const tourRef = useTourStep({
    id: "feature:import",
    view: "import",
    order: 0,
    title: i18n._(t`Import`),
    content: (
      <>
        <p>
          <Trans>
            You can import your stuff directly into Noeko through the automated workflow.
          </Trans>
        </p>
        <p>
          <Trans>
            We will add more import options over time, if you have suggestions, let us know :)
          </Trans>
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
      <TopBar />
      <LeftSidebar />
      <Content>
        <Grid pos="relative" ref={tourRef}>
          <Grid.Col span={{ sm: 12 }}>
            <Title>
              <Trans>Import</Trans>
            </Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Text>
              <Trans>I would like to import</Trans>{" "}
              <Select
                display="inline-block"
                ml="xs"
                size="sm"
                value={importType}
                data={[
                  {
                    label: i18n._(t`a markdown file`),
                    value: "markdown-file" satisfies IImportType,
                  },
                  {
                    label: i18n._(t`a text file`),
                    value: "text-file" satisfies IImportType,
                  },
                  {
                    label: i18n._(t`a folder`),
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
