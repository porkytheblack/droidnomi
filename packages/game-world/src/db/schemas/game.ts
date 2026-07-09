import { pgTable, text, pgEnum, integer, jsonb} from "drizzle-orm/pg-core";
import { gameActors } from "./actors.js";




export const gameTable = pgTable("gameTable", {
  id: text("id").primaryKey(),
  currentTurn: integer().default(0),
})


export const turnTable = pgTable("gameTurn", {
  id: text("id").primaryKey(),
  turnNumber: integer().notNull(),
  game_id: text().references(()=> gameTable.id)
})


export const turnDecisions = pgTable("turnDecisions", {
  id: text().primaryKey(),
  actor: text().references(()=> gameActors.id),
  decision: jsonb()
})



