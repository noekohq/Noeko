import { useEffect, useState } from "react";
import styles from "./PaperThings.module.scss";
import { IThing } from "./things";
import { NodeIcon } from "../../../../utils/graph";
import { Flex, Group, Stack, Text, Title } from "@mantine/core";
import { formatDateShort } from "../../../../utils/formatting";
import IconToggle from "../../Interactions/Toggle/IconToggle";
import { GraphIcon, ListIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { ConstellationIcon } from "../../../Utils/Icons/Icons";

type IMode = "list" | "grid" | "constellation";

interface IPaperThingsProps {
  things: IThing[];
  modes: IMode[];
}

export default function PaperThings({ things, modes }: IPaperThingsProps) {
  if (modes.length === 0) {
    throw new Error("No modes provided");
  }

  const [filter, setFilter] = useState();
  const [mode, setMode] = useState<IMode>(modes[0]);

  const modeToView: Record<IMode, React.FC<IThingTableProps>> = {
    list: ThingList,
    grid: () => <div>Grid View</div>,
    constellation: () => <div>Constellation View</div>,
  };

  const ModeView = modeToView[mode];

  return (
    <div className={styles.paperThings}>
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>
            {things.length} Item{things.length === 1 ? "" : "s"}
          </Title>
          <IconToggle
            options={[
              { icon: ListIcon, value: "list" as IMode },
              { icon: SquaresFourIcon, value: "grid" as IMode },
              { icon: GraphIcon, value: "constellation" as IMode },
            ]}
            value={mode}
            onChange={(v) => {
              setMode(v as IMode);
            }}
          />
        </Group>
        <div className={styles.content}>
          {ModeView && <ModeView things={things} />}
        </div>
      </Stack>
    </div>
  );
}

interface IThingTableProps {
  things: IThing[];
}

function ThingList({ things }: IThingTableProps) {
  const oneChild = things.length === 1;

  return (
    <div className={styles.thingList}>
      {things.map((t) => {
        const Icon = t.icon;

        return (
          <div
            className={`${styles.thingListItem} ${
              oneChild ? styles.oneChild : ""
            }`}
            key={t.title}
          >
            <Group wrap="nowrap" gap="sm" align="center">
              <div className={styles.left}>
                {Icon && <Icon weight="fill" />}
              </div>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Group justify="space-between">
                  <Text fw="bold" size="sm" truncate="end">
                    {t.title}
                  </Text>
                  {t.createdAt && (
                    <Text
                      size="xs"
                      c="dimmed"
                      fw="bold"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {formatDateShort(t.createdAt)}
                    </Text>
                  )}
                </Group>
                <Text size="sm" lineClamp={1} truncate="end" c="dimmed">
                  {t.detail}
                </Text>
              </Stack>
            </Group>
          </div>
        );
      })}
    </div>
  );
}
