// Import this FIRST in every CLI script — side-effect imports run in order,
// so env vars are loaded before @/db (which reads DATABASE_URL at module load).
import { config } from "dotenv";

config({ path: ".env.local" });
