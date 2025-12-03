import { Divider, Stack, Text } from "@mantine/core";
import ConnectableThing from "../../../components/Display/Interactions/Connections/ConnectableThing";
import {
  IConnectable,
  IConnectableFields,
} from "../../../../app/services/Graph";
import { ISpyglassIntent } from "../../../../app/services/Spyglass";

interface ISpyglassActionsProps {
  intent?: ISpyglassIntent;
  results: IConnectable[];
}

export default function SpyglassActions({
  intent,
  results,
}: ISpyglassActionsProps) {
  console.log("Results: ", results);

  return (
    <>
      {intent && (
        <>
          <Text fw="bold" size="sm" c="dimmed">
            {intent.searches?.length} SEARCH
            {intent.searches?.length === 1 ? "" : "ES"}...
          </Text>
          <Stack mt="xs" gap="xs">
            {intent.searches?.map((q) => {
              return (
                <Text key={q.query} size="xs" fs="italic" c="dimmed">
                  {q.query}
                </Text>
              );
            })}
          </Stack>
          <Divider my="lg" />
        </>
      )}
      <Stack gap="xs">
        <Text fw="bold" size="sm" c="dimmed">
          {results.length} RESULT{results.length === 1 ? "" : "S"}...
        </Text>
        {results.map((c) => {
          return <ConnectableThing key={c.id.toString()} thing={c} />;
        })}
      </Stack>
    </>
  );
}
