import axios, { type AxiosAdapter, type AxiosResponse } from "axios";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, authRedirect } from "./api-client";
import { tokenStorage } from "./token-storage";

const originalAdapter = apiClient.defaults.adapter;
const unauthorized = (config: Parameters<AxiosAdapter>[0]) =>
  Promise.reject({
    isAxiosError: true,
    config,
    response: { status: 401, data: { message: "Hết phiên" }, config, headers: {} },
    toJSON: () => ({}),
  });

describe("refresh interceptor", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    apiClient.defaults.adapter = originalAdapter;
  });
  afterAll(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it("uses one refresh request for concurrent 401 responses and retries both", async () => {
    tokenStorage.set("expired");
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { data: { accessToken: "fresh" } },
    });
    apiClient.defaults.adapter = (async (config) => {
      if (config.headers.Authorization !== "Bearer fresh") return unauthorized(config);
      return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config } as AxiosResponse;
    }) as AxiosAdapter;
    const responses = await Promise.all([apiClient.get("/one"), apiClient.get("/two")]);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
  });

  it("clears the local session when refresh fails", async () => {
    tokenStorage.set("expired");
    vi.spyOn(authRedirect, "toLogin").mockImplementation(() => undefined);
    vi.spyOn(axios, "post").mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { message: "Refresh hết hạn" } },
    });
    apiClient.defaults.adapter = unauthorized as AxiosAdapter;
    await expect(apiClient.get("/private")).rejects.toMatchObject({ message: "Refresh hết hạn" });
    expect(tokenStorage.getAccess()).toBeNull();
  });
});
