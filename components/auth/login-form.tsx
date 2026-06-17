"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type SyntheticEvent } from "react";

import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { HRIllustration } from "@/components/ui/hr-illustration";
import { Input } from "@/components/ui/input";

export interface LoginFormProps {
  /** Path to return to after a successful sign-in. Defaults to /pipeline. */
  from: string;
  /** Render the session-expired framing (copy + heading) instead of first login. */
  expired?: boolean;
}

/**
 * Single-password admin sign-in. On success it navigates to `from` and
 * refreshes so the now-valid session cookie is picked up by the proxy gate.
 * Errors surface inline; the typed password is never cleared on failure.
 */
export function LoginForm({ from, expired = false }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await login({ password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(from);
      router.refresh();
    });
  };

  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-center"
      style={{ background: "var(--bg-void)", padding: 24 }}
    >
      <div
        className="flex w-full flex-col"
        style={{
          maxWidth: 380,
          gap: 22,
          padding: 28,
          background: "var(--bg-raised)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-card)",
          boxShadow: "var(--shadow-panel)",
        }}
      >
        <div className="flex flex-col items-center" style={{ gap: 14 }}>
          <HRIllustration
            name="mark"
            size={48}
            style={{ filter: "drop-shadow(0 0 8px color-mix(in srgb, var(--phosphor) 38%, transparent))" }}
          />
          <div className="flex flex-col items-center" style={{ gap: 6 }}>
            <span
              style={{
                font: "var(--label-mono)",
                letterSpacing: "var(--label-tracking)",
                textTransform: "uppercase",
                color: "var(--text-low)",
              }}
            >
              Restricted airspace
            </span>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 22,
                letterSpacing: "-0.01em",
                color: "var(--text-hi)",
                textAlign: "center",
              }}
            >
              {expired ? "Clearance expired — sign in again" : "Admin clearance required"}
            </h1>
            <p
              style={{
                margin: 0,
                font: "var(--text-sm)",
                color: "var(--text-mid)",
                textAlign: "center",
              }}
            >
              {expired
                ? "Your data is safe; nothing was lost."
                : "Enter the operator password to reach the pipeline."}
            </p>
          </div>
        </div>

        <form className="flex flex-col" style={{ gap: 16 }} onSubmit={onSubmit} noValidate>
          <Input
            type="password"
            name="password"
            icon="signal"
            autoComplete="current-password"
            autoFocus
            placeholder="operator password"
            value={password}
            error={error ?? false}
            disabled={pending}
            aria-label="Admin password"
            onChange={(event) => {
              setPassword(event.target.value);
              if (error !== null) setError(null);
            }}
          />
          <Button
            type="submit"
            variant="primary"
            iconLeft="user"
            loading={pending}
            disabled={password.length === 0}
            style={{ width: "100%" }}
          >
            {expired ? "Sign in again" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
