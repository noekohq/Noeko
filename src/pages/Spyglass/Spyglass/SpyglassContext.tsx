import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import { ICitationMap, useSpyglassRecord } from "../hooks/useSpyglass";
import styles from "./SpyglassContext.module.scss";
import CollapseButton from "../../../components/Display/Interactions/CollapseButton";
import ConnectableThing from "../../../components/Display/Interactions/Connections/ConnectableThing";
import { ISearchResult } from "../../../../app/services/Search";
import { IConnectable } from "../../../../app/services/Graph";

interface ISpyglassContextProps {
  citationMap: ICitationMap;
  results: IConnectable[];
}

export default function SpyglassContext({
  results,
  citationMap,
}: ISpyglassContextProps) {
  const citations = results?.filter((r) => {
    const hasCitation = !!citationMap[r.id.toString()];
    return hasCitation;
  });

  return (
    <Stack gap="xs">
      {citations && citations.length < 1 && (
        <Text fw="bold" c="dimmed" size="sm">
          No findings here yet, try asking something!
        </Text>
      )}
      {citations && citations.length > 0 && (
        <>
          <Text fw="bold" size="sm" c="dimmed">
            FINDINGS IN {citations.length} RESOURCES
            {citations.length > 1 ? "S" : ""}
          </Text>
          {citations.map((c) => {
            if (!c) {
              return null;
            }

            const citation = citationMap[c.id.toString()];

            return (
              <CollapseButton
                target={<ConnectableThing thing={c} />}
                details={
                  <>
                    <ActionIcon size="xs" radius="md" color="gray">
                      <Text size="xs">{citation.index}</Text>
                    </ActionIcon>
                    <Text size="sm">{citation.excerpts.join(" ... ")}</Text>
                  </>
                }
              />
            );
          })}
        </>
      )}
    </Stack>
  );
}
