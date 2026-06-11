import { redirect } from "next/navigation";

/** The Radar dashboard ships in M2 — until then "/" lands on Browse. */
export default function RootPage(): never {
  redirect("/browse");
}
