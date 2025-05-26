import { Badge, Tooltip } from "@mantine/core";

const STAGE = "Alpha";

export default function StageIndicator() {
  return (
    <Tooltip label={`Qwest is currently in ${STAGE}`}>
      <Badge color="gray" size="md">
        {STAGE}
      </Badge>
    </Tooltip>
  );
}
