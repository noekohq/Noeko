// Citation.tsx (or wherever you want to place this component)
import { Text, Popover, Button } from "@mantine/core";
import { Link } from "react-router"; // Assuming you use react-router-dom

interface CitationProps {
  id: string;
  snippet: string | null;
  // You might want to pass the full searchResult item for this citation later
  // for linking or displaying more info.
  // searchResultItem?: ISearchResult; // Assuming ISearchResult is the type for items in searchResults
}

export function Citation({ id, snippet }: CitationProps) {
  // You'll likely want to fetch more details about the citation
  // or link to the source document.
  // For now, let's make it a simple popover.

  return (
    <Popover width={200} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <Button
          variant="outline"
          size="xs"
          component="span" // Make it an inline element
          style={{ margin: "0 2px", cursor: "pointer" }}
        >
          [{id}]
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="sm">
          {snippet || "No snippet available."}
          {/* You could add a link here if you have the URL */}
          {/* <Link to={`/source/${id}`}>Learn more</Link> */}
        </Text>
      </Popover.Dropdown>
    </Popover>
  );
}
