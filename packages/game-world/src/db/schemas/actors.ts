import { text, timestamp, jsonb, pgEnum, pgTable } from "drizzle-orm/pg-core"



export const gameActors = pgTable("gameActors", {
  id: text("id").primaryKey(),
  kind: pgEnum("kind", ["npc", "non-npc"])(),
  type: pgEnum("type", ["government", "university", "player"])(),
})
