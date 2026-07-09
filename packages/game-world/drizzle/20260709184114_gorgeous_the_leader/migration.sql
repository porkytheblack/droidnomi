CREATE TABLE "gameActors" (
	"id" text PRIMARY KEY,
	"kind" "kind",
	"type" "type"
);
--> statement-breakpoint
CREATE TABLE "gameResource" (
	"id" text PRIMARY KEY,
	"kind" "kind",
	"resourceData" jsonb,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "producerTable" (
	"id" text PRIMARY KEY,
	"type" "type"
);
--> statement-breakpoint
CREATE TABLE "actorLedger" (
	"id" text PRIMARY KEY,
	"from" text DEFAULT 'system' NOT NULL,
	"to" text DEFAULT 'system' NOT NULL,
	"resource_id" text,
	"timestamp" timestamp DEFAULT now(),
	"transactionType" "transactionType"
);
--> statement-breakpoint
CREATE TABLE "gameTable" (
	"id" text PRIMARY KEY,
	"currentTurn" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "turnDecisions" (
	"id" text PRIMARY KEY,
	"actor" text,
	"decision" jsonb
);
--> statement-breakpoint
CREATE TABLE "gameTurn" (
	"id" text PRIMARY KEY,
	"turnNumber" integer NOT NULL,
	"game_id" text
);
--> statement-breakpoint
ALTER TABLE "actorLedger" ADD CONSTRAINT "actorLedger_resource_id_gameResource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "gameResource"("id");--> statement-breakpoint
ALTER TABLE "turnDecisions" ADD CONSTRAINT "turnDecisions_actor_gameActors_id_fkey" FOREIGN KEY ("actor") REFERENCES "gameActors"("id");--> statement-breakpoint
ALTER TABLE "gameTurn" ADD CONSTRAINT "gameTurn_game_id_gameTable_id_fkey" FOREIGN KEY ("game_id") REFERENCES "gameTable"("id");