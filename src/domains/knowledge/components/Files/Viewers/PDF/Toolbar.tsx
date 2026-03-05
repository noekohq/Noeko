import { useZoom, ZoomMode } from "@embedpdf/plugin-zoom/react";
import { ActionIcon, Group, Text } from "@mantine/core";
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  FrameCornersIcon,
} from "@phosphor-icons/react";

export function Toolbar({ documentId }: { documentId: string }) {
  const { provides: zoom, state } = useZoom(documentId);

  if (!zoom) return null;

  return (
    <Group
      gap="xs"
      p="xs"
      justify="center"
      style={{
        backgroundColor: "var(--mantine-color-dark-8)",
        borderBottom: "1px solid var(--mantine-color-dark-7)",
      }}
    >
      <ActionIcon onClick={() => zoom.zoomOut()} variant="light" color="gray">
        <MagnifyingGlassMinusIcon />
      </ActionIcon>

      <Text size="sm" w={50} ta="center">
        {Math.round(state.currentZoomLevel * 100)}%
      </Text>

      <ActionIcon onClick={() => zoom.zoomIn()} variant="light" color="gray">
        <MagnifyingGlassPlusIcon />
      </ActionIcon>

      <div
        style={{
          width: "1px",
          height: "16px",
          backgroundColor: "var(--mantine-color-dark-6)",
          margin: "0 8px",
        }}
      />

      <ActionIcon
        onClick={() => zoom.requestZoom(ZoomMode.FitWidth)}
        variant="light"
        color="gray"
        title="Reset Zoom"
      >
        <FrameCornersIcon />
      </ActionIcon>
    </Group>
  );
}
