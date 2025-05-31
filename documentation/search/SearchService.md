# Search Service (`Twig/app/services/Search.ts`)

The `Search` service provides functionalities for searching various types of content within the application, such as ideas, user files, and tags. It leverages both Full-Text Search (FTS) and semantic (vector-based) search capabilities, often combining them for comprehensive results.

## Core Concepts

- **FTS (Full-Text Search):** Matches keywords in text fields (e.g., title, content, name, description). Typically faster and good for specific term matching.
- **Semantic Search:** Matches based on the meaning or contextual similarity between the query and the content. Uses embeddings (vector representations of text).
- **Comprehensive Search:** Combines FTS and semantic search results, re-ranks them, and provides a more holistic set of matches.
- **Embeddings:** Numerical vector representations of text, used for semantic similarity calculations.
- **Search Overview:** A generative AI-powered summary and analysis of search results.

## Key Types

### `ISearchResultValue`

A union type representing the actual data object found.

```typescript
export type ISearchResultValue =
  | (IIdea & {
      type: "idea";
    })
  | (IUserFile & {
      type: "file";
    });
```

- `type`: Indicates the type of the found item ("idea", "file").
- The rest of the properties are specific to `IIdea` or `IUserFile`.

### `ISearchResult`

The standardized structure for returning search results for ideas and files.

```typescript
export type ISearchResult = {
  id: string | RecordId; // Unique ID of the result item
  score: number; // Final combined or specific score for ranking
  value: ISearchResultValue; // The actual data object
  highlightText?: string; // Highlighted snippet from FTS
  debug?: {
    // Optional debugging information
    semanticScore?: number;
    ftsContentScore?: number;
    ftsTitleScore?: number;
    exactTitleBonus?: number;
    source: "semantic" | "fts" | "hybrid";
  };
};
```

### `ITagSearchResultValue`

Represents the data for a tag in search results.

```typescript
export type ITagSearchResultValue = {
  id: string | RecordId; // Tag ID
  name: string;
  description: string;
  color?: string;
};
```

### `ITagSearchResult`

The standardized structure for returning search results for tags.

```typescript
export type ITagSearchResult = {
  id: string | RecordId; // Tag ID
  value: ITagSearchResultValue; // The tag data
  score: number; // Score for ranking
  searchType: "fts" | "semantic" | "comprehensive"; // How the result was found
};
```

### `ISearchOverview`

Structure for the generative search overview.

```typescript
export type ISearchOverview = {
  findings: {
    excerpt: string;
    sourceId: string;
    analysis: string;
  }[];
  overview: string;
};
```

## `Search` Class Methods

### Initialization and Setup

#### `static async up()`

Initializes the search service. This typically involves setting up necessary database functions and search indexes (e.g., for FTS and vector similarity). It defines SurrealDB functions like:

- `fn::search_user_ideas_fts`: For FTS on ideas.
- `fn::search_user_files_fts`: For FTS on user files.
- `fn::search_similar_to_embeddings`: For semantic search based on embeddings (for ideas/files).
- (Assumed) `fn::fts_tags_for_user`: For FTS on tags.
- (Assumed) `fn::semantic_search_tags_for_user`: For semantic search on tags.

#### `static async down()`

Placeholder for tearing down or cleaning up search-related resources, though currently empty.

### Idea and File Search Methods

#### `static async ftsSearch(userId: string, query: string, options?: { limit?: number; target?: "ideas" | "files" | "both" }): Promise<ISearchResult[]>`

Performs a Full-Text Search for ideas and/or files belonging to a user.

- `userId`: ID of the user performing the search.
- `query`: The search string.
- `options.limit`: Maximum number of results to return (default: 10).
- `options.target`: Specifies whether to search "ideas", "files", or "both" (default: "both").
- Returns: A promise resolving to an array of `ISearchResult`.

#### `static async semanticSearch(userId: string, embedding: number[], options?: { limit?: number; threshold?: number; target?: "ideas" | "files" | "both" }): Promise<ISearchResult[]>`

Performs a semantic search using pre-computed embeddings.

- `userId`: ID of the user.
- `embedding`: The vector embedding of the search query.
- `options.limit`: Maximum number of results (default: 10).
- `options.threshold`: Minimum similarity score for a result to be included (default: `Search.SEMANTIC_THRESHOLD`).
- `options.target`: Specifies whether to search "ideas", "files", or "both" (default: "both").
- Returns: A promise resolving to an array of `ISearchResult`.

#### `static async comprehensiveSearch(userId: string, query: string, options?: { limit?: number }): Promise<ISearchResult[]>`

Combines FTS and semantic search for ideas and files.

- Generates an embedding for the `query`.
- Calls `ftsSearch` and `semanticSearch`.
- Merges and re-ranks results based on a weighting system (`COMPREHENSIVE_WEIGHTS`) and an optional `EXACT_TITLE_BONUS`.
- `userId`: ID of the user.
- `query`: The search string.
- `options.limit`: Maximum number of results (default: 20).
- Returns: A promise resolving to an array of `ISearchResult`.

#### `static async suggest(userId: string, query: string, options?: { limit?: number }): Promise<ISearchResult[]>`

Provides search suggestions, currently an alias for `ftsSearch` focused on ideas.

- `userId`: ID of the user.
- `query`: The search string.
- `options.limit`: Maximum number of suggestions (default: 5).
- Returns: A promise resolving to an array of `ISearchResult` (currently ideas only).

### Tag Search Methods

#### `static async ftsSearchTags(userId: string, query: string, options?: { limit?: number }): Promise<ITagSearchResult[]>`

Performs a Full-Text Search for tags belonging to a user.

- Relies on the `fn::fts_tags_for_user` SurrealDB function.
- `userId`: ID of the user.
- `query`: The search string.
- `options.limit`: Maximum number of results (default: 10).
- Returns: A promise resolving to an array of `ITagSearchResult`.

#### `static async semanticSearchTags(userId: string, embedding: number[], options?: { limit?: number; threshold?: number }): Promise<ITagSearchResult[]>`

Performs a semantic search for tags using pre-computed embeddings.

- Relies on the `fn::semantic_search_tags_for_user` SurrealDB function.
- `userId`: ID of the user.
- `embedding`: The vector embedding of the search query.
- `options.limit`: Maximum number of results (default: 10).
- Returns: A promise resolving to an array of `ITagSearchResult`.

#### `static async comprehensiveSearchTags(userId: string, query: string, options?: { limit?: number }): Promise<ITagSearchResult[]>`

Combines FTS and semantic search for tags.

- Generates an embedding for the `query`.\n\* Calls `ftsSearchTags` and `semanticSearchTags`.
- Merges and re-ranks tag results based on a weighting system (currently 0.4 for FTS, 0.6 for Semantic).
- `userId`: ID of the user.
- `query`: The search string.
- `options.limit`: Maximum number of results (default: 10).
- Returns: A promise resolving to an array of `ITagSearchResult`.

#### `static async suggestTags(userId: string, query: string, options?: { limit?: number }): Promise<ITagSearchResult[]>`

Provides search suggestions for tags using FTS.

- Leverages the `ftsSearchTags` method internally.
- `userId`: ID of the user.
- `query`: The search string.
- `options.limit`: Maximum number of suggestions to return (default: 5).
- Returns: A promise resolving to an array of `ITagSearchResult`.

### Search Overview Generation

#### `static async getOverviewFromResults(query: string, results: ISearchResult[]): Promise<ISearchOverview | undefined>`

Generates a concise overview of search results using a Language Model (LM).

- `query`: The original search query.
- `results`: An array of `ISearchResult` (typically from `comprehensiveSearch`).
- Constructs a prompt for the LM, including snippets from the top search results.
- Returns: A promise resolving to an `ISearchOverview` object or `undefined` if an error occurs.

## Initialization Functions

Exported helper functions to manage the Search service lifecycle.

### `initSearch()`

Asynchronous function that calls `Search.up()` to initialize the service. Logs a message upon start.

### `dropSearch()`

Asynchronous function that calls `Search.down()`. Currently a placeholder.

## Constants

- `COMPREHENSIVE_WEIGHTS`: `{ fts: 0.3, semantic: 0.7 }` - Default weights for combining FTS and semantic scores in `comprehensiveSearch`.
- `EXACT_TITLE_BONUS`: `0.2` - Bonus added to score if FTS finds an exact title match.
- `SEMANTIC_THRESHOLD`: `0.75` - Default minimum similarity score for semantic search results.
