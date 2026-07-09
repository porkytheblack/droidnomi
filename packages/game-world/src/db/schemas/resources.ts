import { pgTable, text, integer, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core'



export const gameResources = pgTable("gameResource", {
  id: text("id").primaryKey(),
  kind: pgEnum("kind", [
    "tile",
    "development",
    "model",
    "unit"
  ])(),
  resourceData: jsonb(),
  createdAt: timestamp().defaultNow()
})


