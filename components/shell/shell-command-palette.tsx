"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CommandPalette,
  type CommandGroup,
  type CommandItem,
} from "@/components/ui/command-palette";
import { buildBrowseHref } from "@/lib/browse-params";
import { formatMonth } from "@/lib/format";

const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WHOISHIRING_SUBMISSIONS = "https://news.ycombinator.com/submitted?id=whoishiring";

/** Best-effort link to the month's "Ask HN: Who is hiring?" thread. */
function hnThreadUrl(month: string | null): string {
  if (month === null) return WHOISHIRING_SUBMISSIONS;
  const [year, monthIndex] = month.split("-").map(Number);
  const name = MONTH_LONG[(monthIndex ?? 0) - 1];
  if (name === undefined || year === undefined || Number.isNaN(year)) {
    return WHOISHIRING_SUBMISSIONS;
  }
  const query = `Ask HN: Who is hiring? (${name} ${year})`;
  return `https://hn.algolia.com/?query=${encodeURIComponent(query)}`;
}

export interface ShellCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Available thread months ("YYYY-MM", newest first). */
  months: string[];
}

/**
 * Shell-level ⌘K palette: navigation + "Open on HN" actions. Enter with no
 * matches falls through to a Browse text search (palette no-results state).
 */
export function ShellCommandPalette(props: ShellCommandPaletteProps) {
  // useSearchParams lives below a Suspense boundary so static prerenders
  // (e.g. future cached pages) never bail out the whole shell.
  return (
    <Suspense fallback={null}>
      <PaletteWithParams {...props} />
    </Suspense>
  );
}

function PaletteWithParams({ open, onClose, months }: ShellCommandPaletteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlMonth = searchParams.get("month");
  const fromUrl = urlMonth !== null && months.includes(urlMonth) ? urlMonth : null;
  const month = fromUrl ?? months[0] ?? null;

  const groups: CommandGroup[] = [
    {
      label: "Navigation",
      items: [
        { id: "nav:/", label: "Go to Radar", icon: "radar", hint: "g d" },
        { id: "nav:/browse", label: "Go to Browse", icon: "search", hint: "g b" },
      ],
    },
    {
      label: "Actions",
      items: [
        {
          id: "act:open-hn",
          label: "Open thread on HN",
          icon: "external-link",
          hint: month !== null ? `Ask HN · ${formatMonth(month)}` : "Ask HN",
        },
      ],
    },
  ];

  const handleSelect = (item: CommandItem) => {
    if (item.id.startsWith("nav:")) {
      router.push(item.id.slice("nav:".length));
      onClose();
      return;
    }
    if (item.id === "act:open-hn") {
      window.open(hnThreadUrl(month), "_blank", "noopener,noreferrer");
      onClose();
    }
  };

  const handleSearchFallback = (query: string) => {
    router.push(buildBrowseHref({ q: query.trim(), month: fromUrl }));
    onClose();
  };

  return (
    <CommandPalette
      open={open}
      onClose={onClose}
      groups={groups}
      placeholder="Type a command or scan postings…"
      onSelect={handleSelect}
      onSearchFallback={handleSearchFallback}
    />
  );
}
