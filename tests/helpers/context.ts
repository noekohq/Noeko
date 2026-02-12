import request from "supertest";
import { app } from "../../app/index";

export const MOCK_USER_ID = "user:test";
export const MOCK_USER_EMAIL = "test@example.com";

let _token: string | null = null;

/**
 * Sets the global authentication token for the test session.
 */
export const setGlobalToken = (token: string) => {
  _token = token;
};

/**
 * Gets the current global authentication token.
 */
export const getGlobalToken = () => _token;

/**
 * Returns a wrapper around supertest that automatically adds the global auth token.
 * Use this for tests that require an authenticated user.
 *
 * Example: await authRequest().post("/api/ideas").send(data);
 */
export const authRequest = () => {
  if (!_token) {
    throw new Error(
      "Global test token not set. Ensure setup.server.ts is correctly preloaded and initialized."
    );
  }

  const r = request(app);
  const bearerToken = `Bearer ${_token}`;

  return {
    get: (url: string) => r.get(url).set("Authorization", bearerToken),
    post: (url: string) => r.post(url).set("Authorization", bearerToken),
    put: (url: string) => r.put(url).set("Authorization", bearerToken),
    delete: (url: string) => r.delete(url).set("Authorization", bearerToken),
    patch: (url: string) => r.patch(url).set("Authorization", bearerToken),
  };
};
