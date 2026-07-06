# Session 4 — Droid Tools = Game Actions

> **Goal:** Give the droid the *full vocabulary* of the game as Glove tools, and give it **memory** so its strategy persists across turns. By the end, a single Glove droid plays a **complete solo game** against the Session 3 engine, turn after turn, unattended.

Session 2 gave the droid one blunt `commit_actions` tool. That works, but the model reasons better when actions are *individual, well-described tools with real schemas* — it can ask "what does founding cost?" implicitly through tool descriptions, and you can gate risky actions. Today we design the droid's toolbelt properly and connect it to the live engine.

---

## Objectives

By the end, a student can:
- Model each Droidnomi action as a Glove tool with a Zod schema and a description the model can act on.
- Choose between the **one-shot `commit_actions`** pattern and the **granular-tools** pattern, and know the trade-off.
- Derive the engine's `Action` type from the tools' Zod schemas so they can't drift (`z.infer`).
- Give the droid turn-over-turn memory with `glove-memory` (or a compact rolling summary).
- Run one Glove droid through a full game loop and read its per-turn reasoning.

---

## Prerequisites

- Sessions 2–3. A working engine (`runGame`) and a droid that emits `Action[]`.
- Skim the `glove` skill sections *"Tool Definition"*, *"Optional Store Features"* (permissions/tasks), and *"Memory (`glove-memory`)"*.

---

## Timeline (~2h)

| Time | Block |
|---|---|
| 0:00–0:10 | Recap. Two tool designs: one-shot vs. granular. |
| 0:10–0:30 | **Concept:** action taxonomy; tool descriptions as the droid's "manual"; memory. |
| 0:30–1:05 | **Build 1:** the toolbelt — `droid/tools/*` mapping actions → tools. |
| 1:05–1:35 | **Build 2:** memory — persist holdings/plan/debts across turns. |
| 1:35–1:55 | **Build 3:** the driver — `playGame(droid, engine)`; run a full solo game. |
| 1:55–2:00 | Checkpoint + homework. |

---

## Concepts

### The action taxonomy (design [§4](../design-notes/design.md) "Deciding")

Every move a droid can make, grouped. Each becomes a tool (or a case in `commit_actions`):

| Family | Actions | Design ref |
|---|---|---|
| **Territory** | move unit, acquire adjacent tile | [§2.4](../design-notes/design.md), balance [§2](../design-notes/units-and-balance.md) |
| **Build** | found building (consumes founding unit), upgrade building, set deferral | [§3.1](../design-notes/design.md), [§6](../design-notes/design.md), [§11](../design-notes/design.md) |
| **Labor** | recruit (role + seniority), assign/furlough unit | [§9](../design-notes/design.md), balance [§4.5.1](../design-notes/units-and-balance.md) |
| **Market** | place buy/sell order (chips, compute rental, buildings) | [§10](../design-notes/design.md) |
| **Research/Model** | start training run, deploy model, set price | [§7](../design-notes/design.md), [§8](../design-notes/design.md) |

### Two tool designs — pick per your class

- **One-shot (`commit_actions`, from S2):** simplest, cheapest (one tool call/turn), and the schema *is* the `Action` union. Good default. Weakness: the model can't "probe" — it commits blind.
- **Granular tools + a `read_*` set:** one tool per action family, plus read-only tools (`inspect_market`, `estimate_cost`, `list_units`). The model explores, then commits. Richer play, more tokens, and you can gate mutations with `requiresPermission`. Recommended once the engine is solid.

A good middle path: **granular *read* tools + a single `commit_actions` write tool.** The droid inspects freely, commits once. Best reasoning-per-token.

### Tool descriptions are the droid's rulebook

The model chooses tools from their **descriptions and schema `.describe()`s** (`glove` skill gotcha #8, #26). A vague description ("place an order") yields bad play; a precise one ("Place a limit order on the chip order-book. 1 low chip ≈ 5,000 DCr and yields 1 CU/turn; medium ≈ 18,000/4 CU; high ≈ 60,000/16 CU. Buying chips you can't cool doubles their failure rate.") yields good play. **Encode the balance spec into the descriptions.** This is where the game's knowledge lives for the droid.

### Memory (design [§4](../design-notes/design.md) is stateless per turn; strategy isn't)

A droid gets a fresh view each turn but needs continuity: "I'm mid-training-run on M2, I deferred the fab on turn 9, my plan is to reach inference by turn 12." Two options:

1. **Cheap:** Glove's built-in **context compaction** already summarizes prior turns (the `compaction_config` you set in S2). Add a `record_plan(note)` tool the droid calls to persist intentions; surface the latest plan in `renderView`.
2. **Structured:** `glove-memory`'s **episodic** subsystem — record each turn as an episode (decisions + outcome), let the droid query its own history. Overkill for a first game; great for the Session 5 tournament where droids play many games.

---

## Hands-on build

**Build 1 — the toolbelt.** One module per family; each exports Glove tool configs. Derive the engine `Action` type from Zod so the seam can't drift.

```ts
// droid/tools/schemas.ts — SINGLE SOURCE OF TRUTH for actions
import { z } from "zod";
export const ActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("move_unit"), unitId: z.string(), toTile: z.object({ q: z.number(), r: z.number() }) }),
  z.object({ kind: z.literal("acquire_tile"), tile: z.object({ q: z.number(), r: z.number() }) }),
  z.object({ kind: z.literal("found_building"), unitId: z.string(),
    building: z.enum(["ai_lab","chip_fab","data_center","power_plant"]).describe("consumes the founding unit; must match its role") }),
  z.object({ kind: z.literal("recruit"), role: z.string(), seniority: z.enum(["junior","senior"])
    .describe("senior ≈ 2.5× wage, ≈ 2× output (balance §4.5.1)"), toBuildingId: z.string() }),
  z.object({ kind: z.literal("market_order"), side: z.enum(["buy","sell"]), item: z.string(), qty: z.number(),
    price: z.number().describe("limit price in DCr; 1 low chip ≈ 5,000") }),
  z.object({ kind: z.literal("start_training"), dcId: z.string(), level: z.enum(["M1","M2","M3","M4","M5","M6"]),
    allocateCU: z.number().describe("more CU = fewer turns; burn = 50×CU + 500 per turn (balance §7.1)") }),
  z.object({ kind: z.literal("deploy_model"), modelId: z.string(), inferenceDcId: z.string(), allocateCU: z.number() }),
  z.object({ kind: z.literal("set_price"), modelId: z.string(), pricePerMTok: z.number() }),
  z.object({ kind: z.literal("set_deferral"), buildingId: z.string(), deferred: z.boolean()
    .describe("defer facility cost: accrues 5%/turn interest, cap 50% of asset value, 15-turn deadline (balance §4.6)") }),
]);
export type Action = z.infer<typeof ActionSchema>;   // engine imports THIS
```

```ts
// droid/tools/read.ts — read-only probes (safe, ungated)
export const inspectMarket = {
  name: "inspect_market",
  description: "Read the current order book and chip/compute spot prices before trading.",
  inputSchema: z.object({}),
  async do(_: unknown, _d: unknown, _g: unknown) { /* returns a snapshot injected by the driver */ },
};
export const estimateCost = {
  name: "estimate_cost",
  description: "Estimate the per-turn running cost of a building you're considering founding, so you don't found what you can't run (balance §4.5).",
  inputSchema: z.object({ building: z.enum(["ai_lab","chip_fab","data_center","power_plant"]) }),
  async do({ building }: any) { /* return the five-line cost stack from BALANCE */ },
};
```

Fold read tools + the one `commit_actions` write tool onto the droid. Consider `requiresPermission` on writes if you want a human-in-the-loop debug mode (`glove` skill *"Optional Store Features"*) — off for autonomous play.

**Build 2 — memory.** Start with the cheap path: a `record_plan` tool + compaction, and thread the plan into the view.

```ts
// droid/memory.ts
export function makeMemory() {
  let plan = "No plan yet. Establish an opening.";
  const tool = {
    name: "record_plan",
    description: "Save/update your multi-turn plan (models in flight, debts, next 3 moves). Persists across turns.",
    inputSchema: z.object({ plan: z.string() }),
    async do({ plan: p }: any) { plan = p; return { status: "success", data: "Plan saved." }; },
  };
  return { tool, current: () => plan };
}
```

Then in `renderView`, prepend `Your standing plan: ${memory.current()}`. Now the droid carries intent turn to turn without you paying to re-derive it. (Show the `glove-memory` episodic version as the "structured" upgrade for teams that want it.)

**Build 3 — the driver.** Adapt the S2 `buildDroid` into a `Decider` the S3 engine can run, injecting the live view (and read-tool responses) each turn.

```ts
// droid/glove-droid.ts
import type { Decider, DroidView } from "../engine/contract";

export function gloveDroid(opts: { droidId: string; strategy: string }): Decider {
  const droid = buildDroid(opts);              // from Session 2, now folding the toolbelt + memory
  return {
    async decide(view: DroidView) {
      droid.setLiveView(view);                 // read tools resolve against this
      await droid.agent.processRequest(renderView(view));
      return droid.lastCommit();
    },
  };
}
```

```ts
// droid/play-solo.ts — one Glove droid + three RandomDroids, full game
import { runGame } from "../engine/engine";
import { gloveDroid } from "./glove-droid";
import { RandomDroid } from "../engine/random-droid";

const board = await runGame({
  hero:  gloveDroid({ droidId: "hero", strategy: "Operator: open the Lab, reach M1 by ~turn 9, scale inference into the demand curve, never let net burn exceed 3k." }),
  bot1: new RandomDroid(), bot2: new RandomDroid(), bot3: new RandomDroid(),
}, { turns: 30, seed: 7 });

console.table(board);
```

Run it. It'll take a few minutes (one model round-trip per turn). Watch the reasoning stream. Celebrate when the Glove droid beats the random bots — and debug together when it does something dumb (usually a vague tool description or a missing balance number).

---

## Instructor notes & gotchas

- **Keep one source of truth for actions.** `engine/contract.ts` should `import type { Action } from "droid/tools/schemas"` (the `z.infer`). One schema, no drift. This resolves the "keep them in sync by hand" debt flagged in Session 2.
- **Invalid actions are expected, not exceptional.** The model *will* try to spend credits it lacks or found on unowned tiles. The engine (S3) validates and drops; additionally, **feed the drop reasons back** — return them in next turn's view (`lastTurnRejections`) so the droid learns. This closes the loop and dramatically improves play.
- **Descriptions carry the balance.** If the droid founds three fabs and goes bankrupt, the fix is usually a better `estimate_cost` tool or a sharper `found_building` description — not a smarter model. Teach students to debug *the toolbelt*, not the LLM.
- **Watch token cost per game.** 30 turns × granular tool exploration adds up. Levers: the compact `renderView`, `enableToolResultSummary` for chatty read tools (`glove` skill gotcha #47–49), and compaction. Measure it (`stats.tokens_in/out`) so students feel the cost of verbosity.
- **`record_plan` vs. compaction.** Compaction summarizes *automatically* but generically; `record_plan` captures *intent* the droid chooses to keep. Use both — they're complementary.
- **Don't over-gate.** `requiresPermission` is great for a human debugging a droid live, but in autonomous play every gate is a stall. Ship autonomous with no gates; keep a `--supervised` flag for teaching.

---

## Checkpoint

- One Glove droid plays a full 30-turn game against 3 random bots, unattended, and lands on the leaderboard.
- The engine's `Action` type is `z.infer`-derived from the tools — a schema change breaks compile in exactly one place.
- The droid's committed actions are legal-or-cleanly-rejected across the whole game (no crashes).
- A student can point to a tool description and explain how it encodes a balance-spec rule.

---

## Homework / stretch

- **Required:** tune your droid so it reliably beats the random bots over 3 seeds. Note which tool description you improved and why.
- **Stretch:** add the `lastTurnRejections` feedback loop and measure the win-rate improvement.
- **Stretch:** swap the cheap memory for `glove-memory` episodic — record each turn as an episode; add a `recall_similar_turn` read tool.
- **Deeper-chain track:** make `market_order` for chips settle through the `ILedger` interface from Session 3's homework.
