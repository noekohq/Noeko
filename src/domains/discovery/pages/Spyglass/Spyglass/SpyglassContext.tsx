<<<<<<< HEAD
import { ActionIcon, Group, Stack, Text } from "@mantine/core";
import { Trans, Plural } from "@lingui/react/macro";
import { ISpyglassSearch } from "../../../../../../app/database/models/search";
=======
import { ActionIcon, Stack, Text } from "@mantine/core";
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466
import { ICitationMap } from "@domains/discovery/hooks/useSpyglassService";
import CollapseButton from "@core/design/components/Interactions/CollapseButton";
import ConnectableThing from "@core/design/components/Display/Interactions/Connections/ConnectableThing";
import { IConnectable } from "../../../../../../app/services/Graph";

interface ISpyglassContextProps {
  citationMap: ICitationMap;
  results: IConnectable[];
}

export default function SpyglassContext({ results, citationMap }: ISpyglassContextProps) {
  const citations = results?.filter((r) => {
    const hasCitation = !!citationMap[r.id.toString()];
    return hasCitation;
  });

  return (
    <Stack gap="xs">
      {citations && citations.length < 1 && (
        <Text fw="bold" c="dimmed" size="sm">
          <Trans>No findings here yet, try asking something!</Trans>
        </Text>
      )}
      {citations && citations.length > 0 && (
        <>
          <Text fw="bold" size="sm" c="dimmed">
<<<<<<< HEAD
            <Plural
              value={citations.length}
              one="FINDINGS IN # RESOURCE"
              other="FINDINGS IN # RESOURCES"
            />
=======
            FINDINGS IN {citations.length} RESOURCE
            {citations.length === 1 ? "" : "S"}
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466
          </Text>
          {citations.map((c) => {
            if (!c) {
              return null;
            }

            const citation = citationMap[c.id.toString()];

            return (
              <CollapseButton
                key={c.id.toString()}
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
