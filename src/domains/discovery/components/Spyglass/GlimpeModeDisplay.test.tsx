import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { MantineProvider } from "@mantine/core";
import GlimpseModeDisplay from "./GlimpseModeDisplay";
import { PartialGlimpseResult } from "@core/utils/partialJsonParser";
import { IResultsMap } from "@domains/discovery/hooks/useSpyglassService";

// Mock sub-components that might cause issues or are not the focus
vi.mock("@core/design/components/Paper/Things/GridCard", () => ({
  default: ({ id, title, onClick }: any) => (
    <div data-testid="grid-card" onClick={(e) => onClick(id || "test-id", e)}>
      {title}
    </div>
  ),
}));

vi.mock("@core/design/components/Paper/Things/PaperThing", () => ({
  default: ({ title }: any) => <div data-testid="paper-thing">{title}</div>,
}));

vi.mock("@core/design/components/Loading/AntLoader", () => ({
  default: ({ loadingText }: any) => <div data-testid="ant-loader">{loadingText}</div>,
}));

describe("GlimpseModeDisplay Component", () => {
  const mockGlimpseResult: PartialGlimpseResult = {
    summary: "This is a summary.",
    summaryComplete: true,
    contentMap: [
      {
        title: "Section 1",
        description: "Description 1",
        results: [
          {
            resourceId: "1",
            title: "Result 1",
            explanation: "Explanation 1",
            relationship: "answers",
          },
        ],
        sectionType: "foundational",
      },
    ],
    connections: [],
  };

  const mockResultsMap: IResultsMap = {
    "1": {
      id: "1",
      type: "idea",
      name: "Result 1",
      content: "",
      description: "",
    } as any,
  };

  const renderComponent = (props: any) => {
    return render(
      <MantineProvider>
        <MemoryRouter>
          <GlimpseModeDisplay {...props} />
        </MemoryRouter>
      </MantineProvider>
    );
  };

  it("renders query title", () => {
    renderComponent({
      glimpseResult: mockGlimpseResult,
      resultsMap: mockResultsMap,
      query: "Test Query",
    });
    expect(screen.getByText("Test Query")).toBeInTheDocument();
  });

  it("renders summary", () => {
    renderComponent({
      glimpseResult: mockGlimpseResult,
      resultsMap: mockResultsMap,
      query: "Test Query",
    });
    expect(screen.getByText(/This is a summary/)).toBeInTheDocument();
  });

  it("renders content sections", () => {
    renderComponent({
      glimpseResult: mockGlimpseResult,
      resultsMap: mockResultsMap,
      query: "Test Query",
    });
    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.getByText("Result 1")).toBeInTheDocument();
  });

  it("shows loading indicator when loading and no content", () => {
    renderComponent({
      glimpseResult: {},
      resultsMap: {},
      query: "Loading Query",
      loading: true,
      status: "Initiating analysis...",
    });
    // This expects the AntLoader to be present with "Initiating analysis..." text
    expect(screen.getByTestId("ant-loader")).toBeInTheDocument();
    expect(screen.getByText("Initiating analysis...")).toBeInTheDocument();
  });

  it("shows 'Spyglass is running' text when initial loading", () => {
    renderComponent({
      glimpseResult: { summary: "", contentMap: [] },
      resultsMap: {},
      query: "Running Query",
      loading: true,
      status: "Spyglass is running...",
    });
    expect(screen.getByText(/Spyglass is running/i)).toBeInTheDocument();
  });

  it("calls onResultClick when a result is clicked", () => {
    const onResultClick = vi.fn();
    renderComponent({
      glimpseResult: mockGlimpseResult,
      resultsMap: mockResultsMap,
      query: "Test Query",
      onResultClick,
    });

    const resultCard = screen.getByTestId("grid-card");
    fireEvent.click(resultCard);

    expect(onResultClick).toHaveBeenCalled();
  });
});
