import { pgTable, text, pgEnum } from "drizzle-orm/pg-core"



export const producerTable = pgTable("producerTable", {
  id: text("id").primaryKey(),
  type: pgEnum("type", ["ai-training-units"])()
})

