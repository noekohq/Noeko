## `useFetch` Hook

The `useFetch` hook is a custom React hook designed to simplify making API requests. It handles loading states, data fetching, success/error handling, and provides options for customization.

### Parameters

The hook accepts a configuration object with the following properties:

-   `url` (string, required): The URL for the API endpoint.
-   `method` (string, optional): The HTTP method for the request. Defaults to `"GET"`.
    -   Accepted values: `"GET"`, `"POST"`, `"PUT"`, `"DELETE"`, `"PATCH"`.
-   `body` (B, optional): The request body. The type `B` is generic and represents the expected type of the request body.
-   `onBefore` (function, optional): A callback function executed before the API request is made.
-   `onSuccess` (function, optional): A callback function executed when the API request is successful. It receives `data` (of generic type `D`, representing the expected response data type) and an optional `message` (string) as arguments.
-   `onError` (function, optional): A callback function executed when the API request fails. It receives the error object (`unknown`) as an argument.
-   `onFinally` (function, optional): A callback function executed after the API request completes, regardless of success or failure.
-   `headers` (Record<string, string>, optional): An object representing custom headers for the request.
-   `query` (Record<string, string>, optional): An object representing URL query parameters. These will be appended to the `url`.
-   `bustCache` (boolean, optional): If `true`, it's likely intended to add a cache-busting parameter to the URL, although the current implementation doesn't explicitly show this being used to modify the request URL beyond the `query` parameter.
-   `runOnMount` (boolean, optional): If `true`, the API request will be made automatically when the component mounts. Defaults to `false`.
-   `dependencies` (unknown[], optional): An array of dependencies for the main `load` callback. Changes in these dependencies will re-create the `load` function.
-   `runOnDependencies` (unknown[], optional): An array of dependencies that, when all are truthy, will trigger the API request. This is similar to `runOnMount` but conditional on the state of these dependencies.

### Return Values

The hook returns an object with the following properties:

-   `loading` (boolean): Indicates whether an API request is currently in progress.
-   `data` (D | undefined): Stores the data received from a successful API request. `D` is the generic type for the expected response data. It's `undefined` initially or if the request fails.
-   `load` (function): A memoized callback function to manually trigger the API request. It can optionally accept an object with `updatedUrl` (string) and `updatedBody` (B) to override the initial configuration for that specific call. It returns a Promise that resolves with the API response or an error object.
-   `success` (boolean): Indicates whether the last API request was successful.
-   `loadWithUrl` (function): A memoized callback function that takes a `url` (string) as an argument and makes a `GET` request (or the configured `method`) to that URL with the configured `body` and `headers`.
-   `errors` (string[]): An array of error messages. If an error occurs, it attempts to extract a message from the error response or the error object itself.
-   `resetData` (function): A function to reset the `data` state to `undefined`.

### How It Works

1.  **Initialization**:
    *   Sets up state variables for `loading`, `data`, `success`, and `errors`.
    *   Constructs the `urlToUse` by appending query parameters from the `query` object to the base `url`.

2.  **Header Management**:
    *   The `refreshHeaders` function is called before each request. It sets the `Authorization` (Bearer token) and `x-refresh-token` headers in the `api` instance's defaults, fetching these tokens from `localStorage`. This means the hook assumes an authentication mechanism where tokens are stored in `localStorage`.

3.  **`load` Function**:
    *   This is the primary function to make API requests.
    *   It's a `useCallback` to prevent unnecessary re-renders.
    *   When called:
        *   Calls `refreshHeaders()`.
        *   Calls `onBefore()` if provided.
        *   Sets `loading` to `true`.
        *   Makes the API call using an `api` object (presumably a pre-configured Axios instance or similar, located at `../server/api`).
        *   Handles the response:
            *   **On success**: Calls `onSuccess()` with data and message, updates `data` and `success` states.
            *   **On error**: Calls `onError()`, clears `data`, sets `success` to `false`, and populates the `errors` state with an error message.
        *   Calls `onFinally()` if provided.
        *   Sets `loading` to `false`.
    *   The `dependencies` array in its `useCallback` ensures it's re-created if any of those dependencies (including `urlToUse`, `method`, `body`, `headers`, `bustCache`, and user-provided `dependencies`) change.

4.  **`useEffect` for Automatic Loading**:
    *   An effect runs on mount and when specific dependencies change (`urlToUse`, `method`, `body`, `headers`, `bustCache`, `runOnMount`, and `runOnDependencies`).
    *   If `runOnMount` is `true` OR if all dependencies in `runOnDependencies` are truthy, it calls `refreshHeaders()` and then `load()` to fetch data.

5.  **`loadWithUrl` Function**:
    *   Provides a way to make a request to a different URL than the one initially configured, while reusing other settings like `method`, `body`, and `headers`.

6.  **`resetData` Function**:
    *   Allows resetting the fetched `data` back to `undefined`.

### Example Usage (Conceptual)

```typescript jsx
import React from 'react';
import useFetch from './useFetch'; // Adjust path as needed

interface MyData {
  id: number;
  name: string;
}

interface MyRequestBody {
  filter: string;
}

function MyComponent() {
  const { data, loading, load, errors, success } = useFetch<MyRequestBody, MyData[]>({
    url: '/api/mydata',
    method: 'POST', // or 'GET', etc.
    // body: { filter: 'initialFilter' }, // Optional: initial body
    runOnMount: true, // Fetch data when component mounts
    onSuccess: (fetchedData) => {
      console.log('Data fetched successfully:', fetchedData);
    },
    onError: (error) => {
      console.error('Failed to fetch data:', error);
    },
  });

  const handleFetchManually = () => {
    load({ updatedBody: { filter: 'someOtherFilter' } }); // Trigger fetch with a new body
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (errors.length > 0) {
    return <p>Error: {errors.join(', ')}</p>;
  }

  return (
    <div>
      <button onClick={handleFetchManually} disabled={loading}>
        Fetch Manually
      </button>
      {success && data && (
        <ul>
          {data.map(item => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MyComponent;
```

This documentation should give you a good understanding of how the `useFetch` hook works and how to use it in your project. Let me know if you have any more questions!