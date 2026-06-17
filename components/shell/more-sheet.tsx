"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { signOut } from "@/app/login/actions";
import { Icon, type IconName } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";

interface MoreLink {
  label: string;
  href: string;
  icon: IconName;
  /** Marks an admin route that gates to "needs a bigger screen" on mobile. */
  desktopOnly?: boolean;
}

const LINKS: MoreLink[] = [
  { label: "Profile", href: "/profile", icon: "user" },
  { label: "Pipeline", href: "/pipeline", icon: "server", desktopOnly: true },
  { label: "Settings", href: "/settings", icon: "settings", desktopOnly: true },
];

const ROW_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  minHeight: 44,
  padding: "0 4px",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-control)",
  font: "var(--text-base)",
  color: "var(--text-body)",
  textDecoration: "none",
  cursor: "pointer",
} as const;

export interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
}

/** The 5th tab's destination: Profile + admin links (DESKTOP-tagged) + sign out. */
export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onSignOut = () => {
    if (pending) return;
    startTransition(async () => {
      await signOut();
      onClose();
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="More">
      <div style={{ display: "flex", flexDirection: "column" }}>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={onClose} style={ROW_STYLE}>
            <Icon name={link.icon} size={20} />
            <span className="flex-1">{link.label}</span>
            {link.desktopOnly === true && (
              <span
                style={{
                  font: "var(--label-mono)",
                  letterSpacing: "var(--label-tracking)",
                  color: "var(--text-low)",
                  border: "1px solid var(--divider)",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px 5px",
                }}
              >
                DESKTOP
              </span>
            )}
            <Icon name="chevron-right" size={16} style={{ color: "var(--text-low)" }} />
          </Link>
        ))}

        <div style={{ height: 1, background: "var(--divider)", margin: "8px 0" }} />

        <button
          type="button"
          onClick={onSignOut}
          disabled={pending}
          style={{ ...ROW_STYLE, color: "var(--red)" }}
        >
          <Icon name="x-circle" size={20} />
          <span className="flex-1" style={{ textAlign: "left" }}>
            {pending ? "Signing out…" : "Sign out"}
          </span>
        </button>
      </div>
    </Sheet>
  );
}
