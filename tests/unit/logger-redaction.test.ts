import { describe, expect, it } from "vitest";

import { redactContext } from "@/lib/logger";

describe("redactContext", () => {
  it("returns undefined for no context", () => {
    expect(redactContext(undefined)).toBeUndefined();
  });

  it("redacts secret/PII-looking keys, case-insensitive", () => {
    const out = redactContext({
      Cookie: "session=abc",
      authorization: "Bearer xyz",
      auth: "tok",
      apiKey: "sk-123",
      api_key: "sk-456",
      password: "hunter2",
      secret: "s3cr3t",
      token: "t0ken",
    });
    expect(out).toEqual({
      Cookie: "[redacted]",
      authorization: "[redacted]",
      auth: "[redacted]",
      apiKey: "[redacted]",
      api_key: "[redacted]",
      password: "[redacted]",
      secret: "[redacted]",
      token: "[redacted]",
    });
  });

  it("passes through safe keys untouched", () => {
    const out = redactContext({
      path: "/browse",
      runId: 7,
      method: "GET",
      postingId: 42,
    });
    expect(out).toEqual({
      path: "/browse",
      runId: 7,
      method: "GET",
      postingId: 42,
    });
  });
});
