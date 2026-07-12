# The Next 3 Sessions — a catch-up plan for where the build *actually* is

> The [8-session curriculum](./README.md) is the map. This is the route for the next three sittings, written against the code that exists **right now** (July 2026), for a builder with **limited time** who is figuring it out as they go.

---

## Where you actually are

| Layer | Status |
|---|---|
| Contracts (`contracts/`) | ✅ Scaffolded — `Currency.sol` (DCr), `Identity.sol`. Parked; don't touch for 3 sessions. |
| Game world (`packages/game-world`) | 🟡 Interfaces sketched (tiles, units, developments, producers, players). **Nothing runs.** `TurnDecision` is an empty TODO, `game-loop.ts` is types only, `static/resources.ts` is empty, no tests. |
| Persistence | 🟡 pglite + drizzle schema with one generated migration. ⚠️ **The migration is broken** — it references enum types `"kind"`, `"type"`, `"transactionType"` but never `CREATE TYPE`s them, and `gameActors.kind` / `gameResource.kind` collide on the same Postgres type name. `db:migrate` will fail the first time you run it. |
| Droids (Glove) | ❌ Not started. |
| Frontend | ❌ Not started (deliberately — stays out of scope for all 3 sessions). |

**The drift to resolve:** the original curriculum assumed a plain in-memory TS engine; you added a database. Both are right — the fix is a clean division of labor, decided once in Session A:

> **In-memory `State` is the canonical world while a game runs. The database is the record** — decisions, transfers, and per-turn snapshots get written *after* each turn resolves. The engine never reads the DB mid-turn.

This keeps the engine testable and fast, keeps your ledger tables (which are a good design) as the replay/audit log, and means the future frontend reads the DB, never the live engine.

---

## Ground rules for low-time mode

1. **Every session ends with something that runs.** If time runs out, cut features, not the run.
2. **Timebox schema/type fiddling to 15 minutes.** Interfaces are cheap to change later; a running loop teaches you more than a perfect type ever will.
3. **Last 5 minutes: write the first task of the next session** as a TODO at the top of `main.ts`. Restart friction is the #1 killer of "figuring it out as I go" projects.
4. **Punted until after Session C** (write it on a wall): order-book markets, demand curves, debt/consolidation, obsolescence, the Singularity Clock, chain settlement, anything frontend.

Sessions are sized at **~90 minutes** with a marked **⏱ 45-minute cut** if that's all you have.

---

## Session A — Make the world turn

**Goal:** a headless game that runs N turns with 2 scripted players and prints a per-turn log + final leaderboard. No AI, no DB writes required to pass — just a world that moves.

**Done when:** `pnpm tsx src/main.ts` plays 20 turns and prints who won.

### Plan

| ~Time | Block |
|---|---|
| 0:00–0:15 | **Define `TurnDecision` for real** ([`player.ts`](../packages/game-world/src/player.ts)). A discriminated union, tiny on purpose:<br>`{ type: "acquire-tile", tileId }` · `{ type: "found-development", tileId, kind }` · `{ type: "recruit-unit", developmentId, unitKind }` · `{ type: "pass" }`.<br>That's it. Everything else (training runs, pricing, trading) arrives in later sessions. |
| 0:15–0:30 | **Make data plain.** Remove behavior from data: drop `consume: ConsumeFn` from `GameResource` ([`entities.ts`](../packages/game-world/src/entities.ts)) and `produce: ProduceFn` from `Producer`. Data that must serialize to `jsonb` can't carry closures — behavior lives in engine functions that *take* state. Give `Player` a `credits: number` and `ownedResourceIds: string[]`. |
| 0:30–0:45 | **Genesis.** Fill [`static/resources.ts`](../packages/game-world/src/static/resources.ts): a small fixed map (e.g. 5×5 tiles with kinds and prices), development costs, unit costs & upkeep. Hardcode numbers; tune never (for now). Add `createGenesisState(playerIds): State`. |
| 0:45–1:20 | **The turn.** Implement `runTurn(state)` in `game-loop.ts` with a **3-step MVP** of the design-doc §4 resolution order:<br>1. **Collect** — call every player's `play(view)` against a frozen snapshot (simultaneity: nobody sees anyone else's decision this turn), validate + apply decisions.<br>2. **Costs** — deduct upkeep/salaries; a player who can't pay just skips acquiring next turn (no debt system yet).<br>3. **Score** — net worth = credits + sum of owned resource prices; append to a log line.<br>Production, markets, demand, timers, debt: **stubs with a comment**, in the right order, so the skeleton matches design §4. |
| 1:20–1:35 | **Two scripted players.** `GreedyPlayer` (buys the cheapest available tile every turn) vs `HoarderPlayer` (only passes and collects). Run 20 turns in `main.ts`; print the leaderboard. |
| 1:35–1:30+ | Commit: `feat: world turns — scripted 2-player game runs to completion`. Write Session B's first TODO. |

**⏱ 45-minute cut:** skip block 2 (leave the fn-typed interfaces, just don't serialize them yet), shrink genesis to 5 tiles and one development kind, and make step "Costs" a flat 1-credit tax. The run still ends green.

**Explicitly not this session:** fixing the migration or writing to the DB at all. The DB enters in Session C when there's something worth recording. (If it bugs you, the enum fix is: rename to `actorKind` / `resourceKind` / `producerType`, define each `pgEnum` at module scope and export it, delete the old migration folder, regenerate.)

---

## Session B — First droid

**Goal:** replace one scripted player with a **Glove agent**. It receives its private view of the world and commits decisions via a tool call. This is curriculum [Session 2](./session-02.md) compressed and pointed at the *real* engine from Session A instead of a fixture.

**Done when:** an LLM droid plays a full 20-turn game against `GreedyPlayer`, and you can read *why* it did what it did.

### Plan

| ~Time | Block |
|---|---|
| 0:00–0:15 | **The seam.** Add `contract.ts`: `DroidView` (the player-private slice of `State`: my credits, my holdings, tiles for sale with prices, turn number) and re-export `TurnDecision`. Write `makeView(state, playerId): DroidView`. This file is the whole game as far as a droid knows. |
| 0:15–0:30 | Setup: `pnpm add glove-core zod`, `ANTHROPIC_API_KEY` in `.env`. Skim the `glove` skill sections *"Server-Side Agents"* and *"Tool Definition"* (that's the reading budget — the skill answers API questions as they come up). |
| 0:30–1:00 | **One tool: `commit_decisions`.** Zod schema = the `TurnDecision` union (use `z.infer` to *derive* the TS type from the schema so droid and engine can't drift). The `do()` just stashes the array. System prompt = a 5-line strategy ("expand early, keep 10 credits reserve"). |
| 1:00–1:20 | **The adapter.** `DroidPlayer` implements the `Player` interface: `play(view)` → serialize `DroidView` into the prompt → `processRequest` → return stashed decisions (fallback to `pass` on any error/timeout — an exception must never kill the game loop). Swap it in for `HoarderPlayer`. |
| 1:20–1:35 | **Watch it think.** Attach a subscriber, stream tokens/tool calls to stdout with a `[droid-1]` prefix. This is the payoff moment — keep it. |
| 1:35+ | Commit: `feat: first glove droid plays the game`. Note next session's TODO. |

**⏱ 45-minute cut:** skip the subscriber (block 5) and give the droid a 3-decision cap per turn to keep runs fast/cheap. Ten turns instead of twenty.

**Watch out for:** token spend per turn is (view size × turns). Keep `DroidView` terse — IDs and numbers, not prose.

---

## Session C — Many droids, and the record

**Goal:** 3 droids with different strategies play each other unattended, and the game finally **writes to the database** — turns, decisions, transfers — so there's a replayable record the future frontend can read. This front-loads the useful half of curriculum [Session 5](./session-05.md) and defers Continuum.

**Done when:** `pnpm tsx src/main.ts` runs a 3-droid tournament, and after it ends you can query pglite for any turn's decisions and the ledger of who bought what.

### Plan

| ~Time | Block |
|---|---|
| 0:00–0:20 | **Fix the migration** (the Session A note, now unavoidable): uniquely-named, module-scoped, exported `pgEnum`s; delete the broken migration folder; `db:generate` fresh; `db:migrate` must succeed. Add `game_id`/`turn_id` columns to `turnDecisions` while you're in there — decisions need to belong to a turn. |
| 0:20–0:40 | **The recorder.** A `recordTurn(db, gameId, turnNo, decisions, transfers, snapshot)` fn called once at the end of `runTurn`: insert the turn row, the decisions (jsonb), the `resourceLedger` transfer rows, and a full `State` snapshot (jsonb, cheap at this size — it's your replay + debug tool). The engine stays pure: `runTurn` computes, `recordTurn` persists. |
| 0:40–1:00 | **Strategy = prompt.** Extract `buildDroid(name, strategyPrompt)` so droids differ *only* by system prompt. Write three: **Expander** (land-grab), **Developer** (few tiles, build on them), **Miser** (hoard credits, buy distressed). |
| 1:00–1:20 | **Tournament.** Run all three in the same game (sequential `await`s per turn are fine — Continuum-style backgrounding is Session 5's problem, not yours). Print a per-turn one-liner: `T12 expander:342 developer:301 miser:290`. |
| 1:20–1:35 | **Prove the record.** A `replay.ts` script that reads the DB and prints any past game's turn-by-turn story. If this works, the spectator frontend (curriculum S6–7) has its data source before a single React component exists. |
| 1:35+ | Commit: `feat: 3-droid tournament with persistent game record`. |

**⏱ 45-minute cut:** two droids instead of three, skip `replay.ts`, and record only `turnDecisions` + net worth (skip ledger rows and snapshots).

---

## After these three

You'll have: a running engine (thin but correctly shaped), real Glove droids with divergent strategies, and a database record of every game. That's the spine of curriculum sessions 2–5 — from there, rejoin the map:

- **Deepen the engine** (curriculum [S3](./session-03.md)/[S4](./session-04.md) material): production chains, training runs, markets — one resolution step per sitting, replacing the stubs left in Session A.
- **Or go to the frontend** (curriculum [S6](./session-06.md)–[S7](./session-07.md)): the DB record from Session C is exactly what the spectator view reads.

Pick whichever keeps you excited. The rule stands: every sitting ends with something that runs.
