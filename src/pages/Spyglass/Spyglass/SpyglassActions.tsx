import { Divider, Stack, Text } from "@mantine/core";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import ConnectableThing from "../../../components/Display/Interactions/Connections/ConnectableThing";
import { ISearchResult } from "../../../../app/services/Search";

interface ISpyglassActionsProps {
  intent: ISpyglassSearch["intent"];
  results: ISearchResult[];
}

export default function SpyglassActions({
  intent,
  results,
}: ISpyglassActionsProps) {
  if (!intent) {
    return null;
  }

  return (
    <>
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
      <Stack gap="xs">
        <Text fw="bold" size="sm" c="dimmed">
          {results.length} RESULT{results.length === 1 ? "" : "S"}...
        </Text>
        {results.map((r) => {
          return <ConnectableThing key={r.id.toString()} thing={r.value} />;
        })}
      </Stack>
    </>
  );
}
