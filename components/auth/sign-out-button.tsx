"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

/**
 * Tiny sign-out control for the admin surface. Clears the session cookie, then
 * navigates to the public Radar and refreshes so the proxy gate re-evaluates.
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (pending) return;
    startTransition(async () => {
      await signOut();
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      iconLeft="x-circle"
      loading={pending}
      onClick={onClick}
      aria-label="Sign out of admin"
    >
      Sign out
    </Button>
  );
}
