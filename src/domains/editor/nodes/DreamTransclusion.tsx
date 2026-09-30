import {
  ArrowSquareOutIcon,
  CheckIcon,
  CornersOutIcon,
  FileTextIcon,
  LightbulbIcon,
  RowsIcon,
  ShieldSlashIcon,
  TextTIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { ActionIcon, Group, Loader, Stack, Text, Tooltip } from "@mantine/core";
import { Link } from "react-router";
import { useState } from "react";
import useFetch from "@core/hooks/useFetch";
import { IIdea, ISource, ITask } from "@/domains/knowledge";
import { getButtonProps } from "../Options";
import { ISubMenuProps } from "../BubbleMenu";
import {
  DreamTransclusionSchema,
  DreamTransclusionType,
  DreamTransclusionViewMode,
} from "../../../../shared/editing/tiptap/nodes/DreamTransclusion";
import { convertTransclusionToInline } from "./transclusion";
import styles from "./styles/DreamTransclusion.module.scss";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dreamTransclusion: {
      setDreamTransclusion: (options: {
        connectableType: DreamTransclusionType;
        connectableId: string;
        label?: string;
        viewMode?: DreamTransclusionViewMode;
      }) => ReturnType;
    };
  }
}

type ConnectableData = IIdea | ITask | ISource;
type AccessState = "granted" | "forbidden" | "error";

const endpointFor = (type: DreamTransclusionType, id: string) => {
  switch (type) {
    case "idea":
      return `/ideas/${id}?withDerived=true`;
    case "task":
      return `/tasks/${id}`;
    case "source":
      return `/sources/${id}`;
  }
};

const hrefFor = (type: DreamTransclusionType, id: string) => `/${type}/${id}`;

const titleFor = (
  type: DreamTransclusionType,
  data: ConnectableData | undefined,
  label: string
) => {
  if (!data) return label || "Untitled";
  if (type === "idea") return (data as IIdea).title;
  if (type === "task") return (data as ITask).description;
  return (data as ISource).displayName;
};

const ConnectableIcon = ({ type, size = 20 }: { type: DreamTransclusionType; size?: number }) => {
  if (type === "idea") return <LightbulbIcon size={size} weight="duotone" />;
  if (type === "task") return <CheckIcon size={size} weight="bold" />;
  return <FileTextIcon size={size} weight="duotone" />;
};

const Preview = ({ type, data }: { type: DreamTransclusionType; data: ConnectableData }) => {
  if (type === "idea") {
    const idea = data as IIdea;
    const summary = idea.derived?.generative_summary?.sentenceOverview;
    return (
      <Stack gap="xs">
        {summary && <Text size="sm">{summary}</Text>}
        <div className={styles.previewHtml} dangerouslySetInnerHTML={{ __html: idea.content }} />
      </Stack>
    );
  }

  if (type === "task") {
    const task = data as ITask;
    return task.scratchpad ? (
      <div className={styles.previewHtml} dangerouslySetInnerHTML={{ __html: task.scratchpad }} />
    ) : (
      <Text size="sm" c="dimmed">
        No task notes yet.
      </Text>
    );
  }

  const source = data as ISource;
  return (
    <Text size="sm" c={source.analysis?.abstract ? undefined : "dimmed"}>
      {source.analysis?.abstract || "No source abstract yet."}
    </Text>
  );
};

export const DreamTransclusion = DreamTransclusionSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DreamTransclusionComponent);
  },
});

export const DreamTransclusionComponent = ({
  node,
  editor,
  getPos,
  deleteNode,
  selected,
  updateAttributes,
}: NodeViewProps) => {
  const {
    connectableType,
    connectableId,
    label = "",
    viewMode = "minimal",
  } = node.attrs as {
    connectableType: DreamTransclusionType;
    connectableId: string;
    label: string;
    viewMode: DreamTransclusionViewMode;
  };
  const [accessState, setAccessState] = useState<AccessState>("granted");

  const { data, loading } = useFetch<undefined, ConnectableData>({
    url: connectableId ? endpointFor(connectableType, connectableId) : null,
    skip403Redirect: true,
    cancelPrevious: true,
    runOnDependencies: [connectableId, connectableType],
    onBefore: () => setAccessState("granted"),
    onError: (error) => {
      const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
      if (status === 403) {
        setAccessState("forbidden");
      } else {
        setAccessState("error");
      }
    },
  });

  if (!connectableId) {
    return <NodeViewWrapper className={styles.error}>Missing transclusion target</NodeViewWrapper>;
  }

  const title = titleFor(connectableType, data, label);
  const href = hrefFor(connectableType, connectableId);
  const setViewMode = (mode: DreamTransclusionViewMode) => updateAttributes({ viewMode: mode });
  const convertToInline = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;
    convertTransclusionToInline({
      editor,
      from: pos,
      to: pos + node.nodeSize,
      connectableType,
      connectableId,
      label: title,
    });
  };

  return (
    <NodeViewWrapper
      className={styles.transclusion}
      data-selected={selected || undefined}
      data-type={connectableType}
      data-view-mode={viewMode}
    >
      <div className={styles.header}>
        <div className={styles.icon}>
          {accessState === "forbidden" ? (
            <ShieldSlashIcon size={20} weight="fill" />
          ) : (
            <ConnectableIcon type={connectableType} />
          )}
        </div>
        <div className={styles.heading}>
          <Link to={href} className={styles.title} title={`Open ${title}`}>
            {title}
          </Link>
          {viewMode === "expanded" && (
            <Text size="xs" c="dimmed" tt="capitalize">
              {connectableType}
            </Text>
          )}
        </div>
        <Group gap={4} wrap="nowrap" className={styles.actions}>
          {editor.isEditable && (
            <>
              <Tooltip label="Inline view">
                <ActionIcon variant="subtle" color="gray" onClick={convertToInline}>
                  <TextTIcon />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={viewMode === "expanded" ? "Minimal view" : "Expanded view"}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setViewMode(viewMode === "expanded" ? "minimal" : "expanded")}
                >
                  {viewMode === "expanded" ? <RowsIcon /> : <CornersOutIcon />}
                </ActionIcon>
              </Tooltip>
            </>
          )}
          <Tooltip label={`Open ${connectableType}`}>
            <ActionIcon component={Link} to={href} variant="subtle" color="gray">
              <ArrowSquareOutIcon />
            </ActionIcon>
          </Tooltip>
          {editor.isEditable && (
            <Tooltip label="Remove">
              <ActionIcon variant="subtle" color="red" onClick={deleteNode}>
                <TrashIcon />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </div>

      {viewMode === "expanded" && (
        <div className={styles.preview}>
          {loading && <Loader size="sm" />}
          {!loading && accessState === "granted" && data && (
            <Preview type={connectableType} data={data} />
          )}
          {!loading && accessState === "forbidden" && (
            <Text size="sm" c="dimmed">
              You don&apos;t have access to preview this {connectableType}.
            </Text>
          )}
          {!loading && accessState === "error" && (
            <Text size="sm" c="dimmed">
              Could not load this {connectableType} preview.
            </Text>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const DreamTransclusionMenu = ({ editor, classes: { group } }: ISubMenuProps) => {
  const attrs = editor.getAttributes("dreamTransclusion") as {
    connectableType: DreamTransclusionType;
    connectableId: string;
    label: string;
    viewMode: DreamTransclusionViewMode;
  };
  const selection = editor.state.selection;

  const setViewMode = (viewMode: DreamTransclusionViewMode) => {
    editor.chain().focus().updateAttributes("dreamTransclusion", { viewMode }).run();
  };

  const convertToInline = () => {
    if (!(selection instanceof NodeSelection)) return;
    convertTransclusionToInline({
      editor,
      from: selection.from,
      to: selection.to,
      connectableType: attrs.connectableType,
      connectableId: attrs.connectableId,
      label: attrs.label,
    });
  };

  return (
    <Group gap={0}>
      <div className={group}>
        <Tooltip label="Inline view">
          <button {...getButtonProps({ isActive: false })} onClick={convertToInline}>
            <TextTIcon weight="bold" />
          </button>
        </Tooltip>
        <Tooltip label="Minimal view">
          <button
            {...getButtonProps({ isActive: attrs.viewMode === "minimal" })}
            onClick={() => setViewMode("minimal")}
          >
            <RowsIcon weight="bold" />
          </button>
        </Tooltip>
        <Tooltip label="Expanded view">
          <button
            {...getButtonProps({ isActive: attrs.viewMode === "expanded" })}
            onClick={() => setViewMode("expanded")}
          >
            <CornersOutIcon weight="bold" />
          </button>
        </Tooltip>
      </div>
      <div className={group}>
        <Tooltip label={`Open ${attrs.connectableType}`}>
          <button
            {...getButtonProps({ isActive: false })}
            onClick={() =>
              window.open(hrefFor(attrs.connectableType, attrs.connectableId), "_blank")
            }
          >
            <ArrowSquareOutIcon />
          </button>
        </Tooltip>
        <Tooltip label="Remove">
          <button
            {...getButtonProps({ isActive: false })}
            onClick={() => editor.chain().focus().deleteSelection().run()}
          >
            <TrashIcon />
          </button>
        </Tooltip>
      </div>
    </Group>
  );
};
