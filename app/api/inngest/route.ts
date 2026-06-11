import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// v4 checkpointing runs multiple steps per HTTP request; give the route headroom
// above the client's checkpointing.maxRuntime (50s) so steps aren't cut off.
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({ client: inngest, functions });
