# Search API (`Twig/app/api/search.ts`)

The Search API provides HTTP endpoints for accessing the functionalities of the `Search` service. All endpoints require authentication via a token (`checkToken` middleware) and are protected against access by disabled users (`disallowDisabled` middleware).

## Common Request Information

- **Authentication**: All endpoints require a valid JWT token passed in the `Authorization` header as a Bearer token.
- **User Context**: The authenticated user's information (`ISafeUser`) is automatically available to the backend logic.

## API Endpoints

### 1. Comprehensive Search (Ideas & Files)

- **Endpoint**: `POST /api/search/comprehensive`
- **Description**: Performs a comprehensive search (combining FTS and semantic search) for ideas and files. Can optionally generate a search overview.
- **Request Body**:
  ```json
  {
    "query": "string",
    "options": {
      // Optional
      "limit": "number"
    },
    "withOverview": "boolean" // Optional, defaults to false
  }
  ```
  - `query`: The search term.
  - `options.limit` (optional): Maximum number of search results to return.
  - `withOverview` (optional): If `true`, generates and includes a search overview in the response.
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Results fetched successfully",
    "data": {
      "results": "ISearchResult[]",
      "overview": "ISearchOverview | undefined"
    }
  }
  ```
  - `results`: An array of `ISearchResult` objects.
  - `overview`: An `ISearchOverview` object if `withOverview` was true and generation was successful, otherwise `undefined`.
- **Response (Error)**:
  - `400 Bad Request`: If the query is not a string.
  - `403 Forbidden`: If the user is not authorized.
  - `500 Internal Server Error`: For other server-side errors.

### 2. FTS Search (Ideas & Files)

- **Endpoint**: `POST /api/search/fts`
- **Description**: Performs a Full-Text Search (FTS) for ideas and files.
- **Request Body**:
  ```json
  {
    "query": "string",
    "options": {
      // Optional
      "limit": "number",
      "target": "'ideas' | 'files' | 'both'" // Optional, defaults to 'both'
    }
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Suggestions fetched successfully", // Message might be generic
    "data": "ISearchResult[]"
  }
  ```
- **Response (Error)**:
  - `403 Forbidden`: Unauthorized.
  - `500 Internal Server Error`.

### 3. Semantic Search (Ideas & Files)

- **Endpoint**: `POST /api/search/semantic`
- **Description**: Performs a semantic (vector-based) search for ideas and files.
- **Request Body**:
  ```json
  {
    "query": "string",
    "options": {
      // Optional
      "limit": "number",
      "threshold": "number",
      "target": "'ideas' | 'files' | 'both'" // Optional, defaults to 'both'
    }
  }
  ```
  - The `query` string is converted to an embedding on the backend.
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Results fetched successfully",
    "data": "ISearchResult[]"
  }
  ```
- **Response (Error)**:
  - `403 Forbidden`: Unauthorized.
  - `500 Internal Server Error`: If embedding generation fails or other issues occur.

### 4. Idea Suggestions

- **Endpoint**: `GET /api/search/ideas/suggest`
- **Description**: Provides search suggestions, typically based on FTS of idea titles.
- **Query Parameters**:
  - `query`: The search term (string).
  - `limit` (optional): Maximum number of suggestions.
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Suggestions fetched successfully",
    "data": "ISearchResult[]" // Array of suggested ideas
  }
  ```
- **Response (Error)**:

  - `403 Forbidden`: Unauthorized.
  - `500 Internal Server Error`.

- **Endpoint**: `POST /api/search/ideas/suggest`
- **Description**: Same as the GET endpoint but accepts parameters in the request body.
- **Request Body**:
  ```json
  {
    "query": "string",
    "options": {
      // Optional
      "limit": "number"
    }
  }
  ```
- **Response**: Same as the GET endpoint.

### 5. Generate Search Overview

- **Endpoint**: `POST /api/search/overview`
- **Description**: Generates a search overview from a given query and a set of search results.
- **Request Body**:
  ```json
  {
    "query": "string",
    "results": "ISearchResult[]"
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Successfully generated overview",
    "data": "ISearchOverview"
  }
  ```
- **Response (Error)**:
  - `400 Bad Request`: If `query` is not a string or `results` is not an array.
  - `500 Internal Server Error`.

### 6. FTS Search (Tags)

- **Endpoint**: `POST /api/search/tags/fts`
- **Description**: Performs a Full-Text Search (FTS) for tags.
- **Request Body**:
  ```json
  {
    "query": "string",
    "options": {
      // Optional
      "limit": "number"
    }
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Tag FTS results fetched successfully",
    "data": "ITagSearchResult[]"
  }
  ```
- **Response (Error)**:
  - `400 Bad Request`: If `query` is not a string.
  - `403 Forbidden`: Unauthorized.
  - `500 Internal Server Error`.

### 7. Semantic Search (Tags)

- **Endpoint**: `POST /api/search/tags/semantic`
- **Description**: Performs a semantic (vector-based) search for tags.
- **Request Body**:
  ```json
  {
    "query": "string",
    "options": {
      // Optional
      "limit": "number",
      "threshold": "number"
    }
  }
  ```
  - The `query` string is converted to an embedding on the backend.
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Tag semantic results fetched successfully",
    "data": "ITagSearchResult[]"
  }
  ```
- **Response (Error)**:
  - `400 Bad Request`: If `query` is not a string.
  - `403 Forbidden`: Unauthorized.
  - `500 Internal Server Error`: If embedding generation fails or other issues occur.

### 8. Comprehensive Search (Tags)

- **Endpoint**: `POST /api/search/tags/comprehensive`
- **Description**: Performs a comprehensive search (combining FTS and semantic search) for tags.
- **Request Body**:
  ```json
  {
    "query": "string",
    "options": {
      // Optional
      "limit": "number"
    }
  }
  ```
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Tag comprehensive results fetched successfully",
    "data": "ITagSearchResult[]"
  }
  ```
- **Response (Error)**:
  - `400 Bad Request`: If `query` is not a string.
  - `403 Forbidden`: Unauthorized.
  - `500 Internal Server Error`.

### 9. Tag Suggestions

- **Endpoint**: `GET /api/search/tags/suggest`
- **Description**: Provides search suggestions for tags, typically based on FTS of tag names and descriptions.
- **Query Parameters**:
  - `query`: The search term (string).
  - `limit` (optional): Maximum number of suggestions.
- **Response (Success - 200 OK)**:
  ```json
  {
    "message": "Tag suggestions fetched successfully",
    "data": "ITagSearchResult[]" // Array of suggested tags
  }
  ```
- **Response (Error)**:
  - `400 Bad Request`: If `query` is not a string.
  - `403 Forbidden`: Unauthorized.
  - `500 Internal Server Error`.

## Data Types (from `SearchService.ts`)

Refer to the `SearchService.md` documentation for details on:

- `ISearchResult`
- `ISearchOverview`
- `ITagSearchResult`
