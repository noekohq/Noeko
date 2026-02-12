import React, { useState } from "react";
import {
  ActionIcon,
  Badge,
  Blockquote,
  Button,
  Group,
  HoverCard,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import styles from "./OverviewParser.module.scss";
import { ArrowRightIcon, ArrowsOutIcon } from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // Import the plugin
import { Link, useNavigate, useNavigation } from "react-router";
import { markdownToHtml } from "../../../utils/formatting";
import { generateTextFragmentHashFromText } from "../../../utils/textFragment";
import { IFinding } from "../../../../app/services/Spyglass";
import { IResultsMap } from "../../../hooks/useSpyglassService";
import { getTypeFromId, TypeIcon } from "../../../utils/graph";
import { INode } from "../../../declarations/graph";

interface IOverviewParserProps {
  markdown: string;
  resultsMap: IResultsMap;
  findings: IFinding[];
  loading?: boolean;
}

interface IFindingBadgeProps {
  findingNumber: number;
  resultsMap: IResultsMap;
  findings: IFinding[];
}

const FindingBadge: React.FC<IFindingBadgeProps> = ({ findingNumber, resultsMap, findings }) => {
  const finding = findings[findingNumber];
  if (!finding) return null;

  const result = resultsMap[finding.sourceId];
  if (!result) return null;

  const title = result.name;
  const titleLink = `/${result.type}/${result.id.toString()}`;
  const content = result.content;
  const [previewing, setPreviewing] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <HoverCard
        width="400px"
        position="bottom-end"
        withArrow
        shadow="lg"
        openDelay={500}
        radius="lg"
      >
        <HoverCard.Target>
          <button className={styles.citationIcon}>{findingNumber + 1}</button>
        </HoverCard.Target>
        <HoverCard.Dropdown
          mah={400}
          style={{
            overflowY: "auto",
          }}
        >
          <Stack gap="sm">
            <Group align="baseline" justify="space-between">
              <Link to={titleLink || ""} style={{ textDecoration: "none" }}>
                <Text size="sm" c="dark.1" style={{ cursor: "pointer" }}>
                  <Group gap="xs">
                    {title}
                    {titleLink && <ArrowRightIcon weight="bold" />}
                  </Group>
                </Text>
              </Link>
              <Badge variant="light" mb="sm" color="gray">
                {finding.findingType.replaceAll(/_/g, " ")}
              </Badge>
            </Group>
            <Blockquote color="gray" p="xs" mb="sm">
              <Text
                size="sm"
                p="0"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(finding.excerpt),
                }}
              />
            </Blockquote>
            <Text size="sm">{finding.analysis}</Text>
            <Group>
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                radius="md"
                onClick={() => {
                  navigate(titleLink || "");
                }}
              >
                <ArrowRightIcon />
              </ActionIcon>
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                radius="md"
                onClick={() => {
                  setPreviewing(true);
                }}
              >
                <ArrowsOutIcon />
              </ActionIcon>
            </Group>
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
      <Modal
        opened={previewing}
        onClose={() => setPreviewing(false)}
        title={<Text size="sm">Previewing {title}</Text>}
        onClick={(e) => {
          e.stopPropagation();
        }}
        size="lg"
      >
        <Stack py="lg" gap="xs">
          <Group>
            <Button
              onClick={() => {
                navigate(titleLink || "");
              }}
              rightSection={<ArrowRightIcon size={12} />}
              color="gray"
              variant="light"
              size="xs"
              radius="lg"
            >
              Visit
            </Button>
          </Group>
          <div
            dangerouslySetInnerHTML={{
              __html: content || "No content available.",
            }}
          />
        </Stack>
      </Modal>
    </>
  );
};

interface IResourceBadgeProps {
  id: string;
  resultsMap: IResultsMap;
}

const ResourceBadge: React.FC<IResourceBadgeProps> = ({ id, resultsMap }) => {
  const navigate = useNavigate();
  const [previewing, setPreviewing] = useState(false);
  const result = resultsMap[id];

  if (!result) {
    return null;
  }

  const type = getTypeFromId(id);

  const Icon = TypeIcon(type as INode["type"]);

  const titleLink = `/${type}/${id}`;

  return (
    <>
      <HoverCard
        width="400px"
        position="bottom-end"
        withArrow
        shadow="lg"
        openDelay={500}
        radius="lg"
      >
        <HoverCard.Target>
          <button className={styles.citationIcon}>{Icon ? <Icon /> : "N/A"}</button>
        </HoverCard.Target>
        <HoverCard.Dropdown
          mah={400}
          style={{
            overflowY: "auto",
          }}
        >
          <Stack gap="sm">
            <Group align="baseline" justify="space-between">
              <Link to={titleLink} style={{ textDecoration: "none" }}>
                <Text size="sm" c="dark.1" style={{ cursor: "pointer" }}>
                  <Group gap="xs">
                    {result.name}
                    {titleLink && <ArrowRightIcon weight="bold" />}
                  </Group>
                </Text>
              </Link>
            </Group>
            <Text size="sm">{result.description}</Text>
            <Group>
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                radius="md"
                onClick={() => {
                  navigate(titleLink || "");
                }}
              >
                <ArrowRightIcon />
              </ActionIcon>
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                radius="md"
                onClick={() => {
                  setPreviewing(true);
                }}
              >
                <ArrowsOutIcon />
              </ActionIcon>
            </Group>
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
      <Modal
        opened={previewing}
        onClose={() => setPreviewing(false)}
        title={<Text size="sm">Previewing {result.name}</Text>}
        onClick={(e) => {
          e.stopPropagation();
        }}
        size="lg"
      >
        <Stack py="lg" gap="xs">
          <Group>
            <Button
              onClick={() => {
                navigate(titleLink || "");
              }}
              rightSection={<ArrowRightIcon size={12} />}
              color="gray"
              variant="light"
              size="xs"
              radius="lg"
            >
              Visit
            </Button>
          </Group>
          <div
            dangerouslySetInnerHTML={{
              __html: result.content || "No content available.",
            }}
          />
        </Stack>
      </Modal>
    </>
  );
};

const OverviewParser: React.FC<IOverviewParserProps> = ({
  markdown,
  resultsMap,
  findings,
  loading = false,
}) => {
  const processedMarkdown = React.useMemo(() => {
    if (!markdown) return "";
    const citationRegex = /\[(\d+|[a-zA-Z_]+:[a-zA-Z0-9_.-]+)\]/g;
    return markdown.replace(citationRegex, (match, citationIdentifier) => {
      // Check if the identifier is purely numeric
      if (/^\d+$/.test(citationIdentifier)) {
        return `[](finding:${citationIdentifier})`;
      }
      // Otherwise, it's a resource identifier
      return `[](resource:${citationIdentifier})`;
    });
  }, [markdown]);

  const urlTransform = (url: string) => {
    const supportedProtocols = ["http:", "https:", "ftp:", "mailto:", "finding:", "resource:"];
    if (supportedProtocols.some((protocol) => url.startsWith(protocol))) {
      return url;
    }
    return "";
  };

  return (
    <div className={styles.overviewText}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]} // Add the plugin here
        urlTransform={urlTransform}
        components={{
          a: ({ node, ...props }) => {
            if (props.href?.startsWith("finding:")) {
              const findingNumberStr = props.href.substring(8);
              const findingNumber = parseInt(findingNumberStr.trim(), 10);

              if (!isNaN(findingNumber)) {
                return (
                  <FindingBadge
                    findingNumber={findingNumber - 1}
                    resultsMap={resultsMap}
                    findings={findings}
                  />
                );
              }
            }

            if (props.href?.startsWith("resource:")) {
              const resourceStr = props.href.substring(9);

              return <ResourceBadge resultsMap={resultsMap} id={resourceStr} />;
            }

            return (
              <a href={props.href} target="_blank" rel="noopener noreferrer">
                {props.children}
              </a>
            );
          },
        }}
      >
        {processedMarkdown}
      </ReactMarkdown>
      {loading && <span className={styles.streamingCursor}>▌</span>}
    </div>
  );
};

export default OverviewParser;
