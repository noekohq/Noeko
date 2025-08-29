import { Badge, Tooltip } from "@mantine/core";

const STAGE = "Early Access";

export default function StageIndicator() {
  return (
    <Tooltip label={`Noeko is currently in ${STAGE}`}>
      <Badge color="orange" size="md" variant="light">
        {STAGE}
      </Badge>
    </Tooltip>
  );
}
