import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { MantineProvider } from "@mantine/core";
import Search from "./Search";
import useSearchQuery, { IUseSearchQueryReturn } from '@/hooks/useSearchQuery';

vi.mock('@/hooks/useSearchQuery', () => ({
  default: vi.fn(),
}));

vi.mock('@/contexts/SearchContext', () => ({
  useSearch: vi.fn(() => ({
    global: {
      results: { set: vi.fn() },
      topResult: { set: vi.fn() },
      scope: { get: {}, set: vi.fn() },
      scopeData: {
        tags: { get: [], remove: vi.fn() },
      },
      showScope: { get: false, set: vi.fn() },
    },
  })),
}));

vi.mock('@/utils/platform', () => ({
  getOS: vi.fn(() => "windows"),
}));

vi.mock('@/hooks/useShortcuts', () => ({
  default: vi.fn(),
}));

vi.mock("./SearchBar", () => ({
  SearchBar: ({ query, setQuery, onClear, onSearchSubmit }: any) => (
    <div>
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} role="textbox" />
      <button onClick={onClear}>Clear</button>
      <button onClick={onSearchSubmit}>Search</button>
    </div>
  ),
}));

vi.mock("./ScopeBuilder/ScopeBuilder", () => ({
  default: () => <div>ScopeBuilder</div>,
}));

vi.mock("../Utils/Spyglass/GlimpseModeDisplay", () => ({
  default: () => <div>Glimpse Mode Display</div>,
}));

vi.mock('@core/design/components/Paper/PaperButton', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@core/design/components/Paper/PaperSearchResult/PaperSearchResult', () => ({
  default: ({ title }: any) => <div>{title}</div>,
}));

const defaultHookState: IUseSearchQueryReturn = {
  searchQuery: "",
  setQuery: vi.fn(),
  loading: false,
  scope: {},
  setScope: vi.fn(),
  glimpseMode: false,
  setGlimpseMode: vi.fn(),
  handleSearchSubmit: vi.fn(),
  reset: vi.fn(),
  loadingGlimpse: false,
  errorGlimpse: null,
  statusGlimpse: null,
  glimpseResult: null,
  resultsMap: {},
  withinRabbithole: false,
  results: null,
  filteredResults: null,
  complete: false,
  recent: [],
  loadingRecent: false,
  timeTaken: null,
};

describe("Search Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MantineProvider>
        <MemoryRouter>
          <Search />
        </MemoryRouter>
      </MantineProvider>
    );
  };

  it("renders Recent History when there aren't search results", () => {
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      recent: [
        {
          id: "test",
          type: "idea",
          title: "Test note",
          content: "<p>This is a test</p>",
          createdAt: new Date(),
          updatedAt: new Date(),
          viewedAt: new Date(),
          visibility: "private",
          contentUpdatedAt: new Date(),
          embeddings: null,
          embeddingsUpdatedAt: new Date(),
          contentPlainUpdatedAt: new Date(),
        },
      ] as any,
      loadingRecent: false,
    });

    renderComponent();

    expect(screen.getByText(/RECENT/i)).toBeInTheDocument();
  });

  it("renders search input field", () => {
    (useSearchQuery as any).mockReturnValue(defaultHookState);

    renderComponent();

    const searchInput = screen.getByRole("textbox");
    expect(searchInput).toBeInTheDocument();
  });

  it("toggles glimpse mode when button is clicked", () => {
    const setGlimpseMode = vi.fn();
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      glimpseMode: false,
      setGlimpseMode,
    });

    renderComponent();

    const glimpseButton = screen.getByText("Smart");
    fireEvent.click(glimpseButton);

    expect(setGlimpseMode).toHaveBeenCalledWith(true);
  });

  it("displays Spyglass mode when glimpseMode is true", () => {
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      glimpseMode: true,
    });

    renderComponent();

    expect(screen.getByText("Spyglass")).toBeInTheDocument();
  });

  it("displays Smart mode when glimpseMode is false", () => {
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      glimpseMode: false,
    });

    renderComponent();

    expect(screen.getByText("Smart")).toBeInTheDocument();
  });

  it("updates search query when user types", () => {
    const setQuery = vi.fn();
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      setQuery,
    });

    renderComponent();

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "test query" } });

    expect(setQuery).toHaveBeenCalledWith("test query");
  });

  it("renders search results when available", () => {
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      searchQuery: "test",
      glimpseMode: false,
      filteredResults: [
        {
          id: "result-1",
          value: {
            id: "result-1",
            type: "idea",
            title: "Search Result 1",
            content: "<p>This is a search result</p>",
            createdAt: new Date(),
            updatedAt: new Date(),
            viewedAt: new Date(),
            visibility: "private",
            contentUpdatedAt: new Date(),
            embeddings: null,
            embeddingsUpdatedAt: new Date(),
            contentPlainUpdatedAt: new Date(),
          },
          highlightText: "This is a search result",
          score: 0.95,
        },
      ] as any,
    });

    renderComponent();

    expect(screen.getByText("Search Result 1")).toBeInTheDocument();
  });

  it("displays glimpse result in glimpse mode", () => {
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      glimpseMode: true,
      searchQuery: "test query",
      glimpseResult: {
        answer: "This is a glimpse answer",
        citations: [],
      },
      loadingGlimpse: false,
    });

    renderComponent();

    // The GlimpseModeDisplay component is mocked, so we just check for its presence
    expect(screen.getByText("Glimpse Mode Display")).toBeInTheDocument();
  });

  it("displays error message when glimpse mode has an error", () => {
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      glimpseMode: true,
      errorGlimpse: "Something went wrong",
    });

    renderComponent();

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("does not render recent history when there are search results", () => {
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      searchQuery: "test",
      glimpseMode: false,
      filteredResults: [
        {
          id: "result-1",
          value: {
            id: "result-1",
            type: "idea",
            title: "Search Result",
            content: "<p>Result content</p>",
            createdAt: new Date(),
            updatedAt: new Date(),
            viewedAt: new Date(),
            visibility: "private",
            contentUpdatedAt: new Date(),
            embeddings: null,
            embeddingsUpdatedAt: new Date(),
            contentPlainUpdatedAt: new Date(),
          },
          highlightText: "Result content",
          score: 0.95,
        },
      ] as any,
      recent: [
        {
          id: "recent-1",
          type: "idea",
          title: "Recent Note",
          content: "<p>Recent content</p>",
          createdAt: new Date(),
          updatedAt: new Date(),
          viewedAt: new Date(),
          visibility: "private",
          contentUpdatedAt: new Date(),
          embeddings: null,
          embeddingsUpdatedAt: new Date(),
          contentPlainUpdatedAt: new Date(),
        },
      ] as any,
    });

    renderComponent();

    expect(screen.queryByText(/RECENT/i)).not.toBeInTheDocument();
    expect(screen.getByText("Search Result")).toBeInTheDocument();
  });

  it("does not render glimpse content when not in glimpse mode", () => {
    (useSearchQuery as any).mockReturnValue({
      ...defaultHookState,
      glimpseMode: false,
      glimpseResult: {
        answer: "This is a glimpse answer",
        citations: [],
      },
    });

    renderComponent();

    expect(screen.queryByText("Deep Focus in Spyglass")).not.toBeInTheDocument();
  });
});
