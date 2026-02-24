import { CopyButton, Modal, Stack, Text } from "@mantine/core";
import { PaperContextMenu } from "../PaperContextMenu";
import { IThing } from "./things";
import { useNavigate } from "react-router";
import {
  ArrowRightIcon,
  BrowsersIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

interface IContextMenuWrapper {
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  thing: IThing;
  onDelete?: () => void;
}

export default function ContextMenuWrapper({ children, thing, onDelete }: IContextMenuWrapper) {
  const { title, link, preview } = thing;

  const navigate = useNavigate();

  const [peering, setPeering] = useState(false);

  return (
    <>
      <PaperContextMenu>
        <PaperContextMenu.Target>{children}</PaperContextMenu.Target>
        <PaperContextMenu.Dropdown>
          <PaperContextMenu.Detail label="Title" valueToCopy={title}>
            {title}
          </PaperContextMenu.Detail>
          <PaperContextMenu.Label>Actions</PaperContextMenu.Label>
          {link && (
            <>
              <PaperContextMenu.Item
                icon={<ArrowRightIcon weight="bold" />}
                onClick={() => {
                  navigate(link);
                }}
              >
                Open
              </PaperContextMenu.Item>
              <PaperContextMenu.Item
                icon={<BrowsersIcon weight="bold" />}
                onClick={() => {
                  window.open(link, "_blank");
                }}
              >
                Open in new tab
              </PaperContextMenu.Item>
            </>
          )}
          <CopyButton value={title}>
            {({ copy, copied }) => {
              return (
                <PaperContextMenu.Item
                  icon={copied ? <CheckIcon /> : <CopyIcon />}
                  onClick={() => {
                    copy();
                  }}
                >
                  Copy title
                </PaperContextMenu.Item>
              );
            }}
          </CopyButton>
          <PaperContextMenu.Item
            icon={<EyeIcon />}
            onClick={() => {
              setPeering(true);
            }}
          >
            Preview
          </PaperContextMenu.Item>
          {onDelete && (
            <PaperContextMenu.Item
              icon={<TrashSimpleIcon weight="bold" />}
              onClick={() => {
                onDelete?.();
              }}
              color="red"
            >
              Delete
            </PaperContextMenu.Item>
          )}
        </PaperContextMenu.Dropdown>
      </PaperContextMenu>
      {preview && (
        <Modal
          opened={peering}
          onClose={() => {
            setPeering(false);
          }}
          title={<Text size="sm">Peering at {title}</Text>}
          onClick={(e) => {
            e.stopPropagation();
          }}
          size="lg"
        >
          <Stack py="lg" gap="xs">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Preview
            </Text>
            {typeof preview === "string" ? (
              <Text size="sm" dangerouslySetInnerHTML={{ __html: preview }} />
            ) : (
              preview
            )}
          </Stack>
        </Modal>
      )}
    </>
  );
}
