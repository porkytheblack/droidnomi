import { pgTable, text, pgEnum, integer, jsonb, timestamp} from "drizzle-orm/pg-core"
import {gameResources} from "./resources.js"


// game actors can own resources
// resources can own other resources.
// ownership is transferred
// the original owner of everything is the game itself encoded as "system"
//


export const resourceLedger = pgTable("actorLedger", {
  id: text("id").primaryKey( ),
  // id of a resource | an actor | "system"
  from: text().notNull().default("system"),
  to: text().notNull().default("system"),
  resource_id: text().references(()=> gameResources.id),
  timestamp: timestamp().defaultNow(),
  transactionType: pgEnum("transactionType", [
    "consumption",
    "transfer"
  ])()
})
