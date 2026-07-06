# Session 3 — The Game Engine & Turn Loop

> **Goal:** Build the **background simulation** — a headless engine that holds world state, accepts `Commit`s from droids, and advances turns through Droidnomi's fixed 6-step resolution order. By the end it runs a whole game with scripted droids and prints a leaderboard.

This is the "run the game in the background" piece. It's **plain TypeScript** — Glove is only the droids. Today we make the world the droids act on real.

---

## Objectives

By the end, a student can:
- Model world state: tiles, units, buildings, models, market, per-droid ledgers.
- Implement the **simultaneous** turn loop: collect all commits, then apply once.
- Implement the **6-step resolution order** (design [§4](../design-notes/design.md)) with numbers from the [appendix](../design-notes/appendix.md).
- Compute **net worth** each turn (appendix [§P](../design-notes/appendix.md)) and rank a leaderboard.
- Run a full game to termination with random/scripted droids.

---

## Prerequisites

- Sessions 1–2. The `contract.ts` seam and a droid that emits `Action[]`.
- Read design doc [§4](../design-notes/design.md) (turn loop) and [§6](../design-notes/design.md) (producers); appendix [§A–§P](../design-notes/appendix.md) open as a reference.

---

## Timeline (~2h)

| Time | Block |
|---|---|
| 0:00–0:10 | Recap. Today: the left side of the seam — the world. |
| 0:10–0:30 | **Concept:** simultaneous commit-apply; the 6-step resolution; scope for a teachable MVP. |
| 0:30–0:55 | **Build 1:** `state.ts` — the world model + genesis. |
| 0:55–1:35 | **Build 2:** `resolve.ts` — the 6 steps. Start with steps 1, 2, 6; stub 3–5. |
| 1:35–1:55 | **Build 3:** `engine.ts` game loop + a `RandomDroid`; run to turn N; leaderboard. |
| 1:55–2:00 | Checkpoint + homework. |

---

## Concepts

### Simultaneous resolution (design [§4](../design-notes/design.md))

Turns don't go in player order. Every droid decides in isolation, all `Commit`s are collected, then the world applies them **at once**. Consequence for code: **compute against a frozen snapshot of the turn's start state, then write results**. Never let droid A's action mutate the state droid B is deciding against mid-turn.

### The fixed 6-step order (design [§4](../design-notes/design.md) "Resolution")

The engine's heartbeat. Implement in this exact order so effects are deterministic:

1. **Production** — power → chips → compute → intelligence; research accrues; buildings graduate units.
2. **Per-turn costs** — facility, salaries, utilities, maintenance, activity (balance [§4.5](../design-notes/units-and-balance.md)). Unmet → deferral or default ([§4.6](../design-notes/units-and-balance.md)).
3. **Markets clear** — order-book matching (design [§10](../design-notes/design.md)).
4. **Demand & revenue** — generate orders, match eligible models by price, compute revenue (design [§8](../design-notes/design.md)).
5. **Timers advance** — research, training runs, construction, deferral deadlines.
6. **Debt service + net worth** — auto-sweep 50% of profit to deferred balances; recompute net worth for the leaderboard.

### Teachable MVP scoping (important)

Do **not** implement all of Droidnomi in one session. Build a spine that runs end-to-end, then deepen in Session 4. Recommended MVP cut:

| Implement now | Stub / simplify now | Full in |
|---|---|---|
| Tiles (bare/water), founding a Lab & DC, credits ledger | Forests, home tiles, movement MP costs | S4 |
| Facility + salary + power cost lines | Maintenance, tax, licenses | S4 |
| Research → M1 breakthrough, one training run | M2–M6, overtraining bands | S4 |
| Inference → IU → flat commodity revenue | Premium/spec-gated demand, per-city caps | S4 |
| Net worth = credits + building value − debt | Full appendix §P (tile value, model IP, prestige) | S4 |
| Fixed-length game (e.g. 30 turns) | Singularity Clock | S5/S8 |

The goal today is a *loop that closes*: genesis → droids commit → resolve → leaderboard → repeat → winner.

---

## Hands-on build

**Build 1 — `engine/state.ts`.** Fill in the leaf types stubbed in Session 1, straight from appendix [§B–§E](../design-notes/appendix.md). Keep it a plain serializable object (it becomes the `DroidView` source and, later, the spectator's data).

```ts
// engine/state.ts
export type TileRef = { q: number; r: number };
export type BuildingType = "ai_lab" | "chip_fab" | "data_center" | "power_plant";
export type ModelLevel = "M1"|"M2"|"M3"|"M4"|"M5"|"M6";

export interface Building {
  id: string; owner: string; type: BuildingType;
  tile: TileRef; level: number; status: "active"|"deferred"|"dormant"|"for_sale";
  buildTurnsLeft: number; assessedValue: number; deferredBalance: number;
  staff: string[];               // unit ids
}
export interface Unit { id: string; owner: string; role: string; tile: TileRef | null; seniority: "junior"|"senior"; }
export interface Model { id: string; owner: string; level: ModelLevel; benchmark: number; context: number; cumulativeRevenue: number; deployedOn?: string; pricePerMTok?: number; }

export interface DroidState {
  id: string; credits: number; researchCredits: number; prestige: number;
  unlockedLevels: ModelLevel[];  // breakthroughs achieved
}

export interface World {
  turn: number; seed: number;
  droids: Record<string, DroidState>;
  units: Record<string, Unit>;
  buildings: Record<string, Building>;
  models: Record<string, Model>;
  tiles: Record<string, { ref: TileRef; type: "bare"|"water"; owner?: string }>;
  market: { chipSpot: Record<"low"|"medium"|"high", number>; orders: Order[] };
  frontierBenchmark: number;     // B_f, rises ~+1/turn (appendix §L)
}

// Genesis: appendix §A — 100k credits, one chosen founding unit.
export function genesis(droidIds: string[], openings: Record<string, string>, seed: number): World { /* … */ }
```

**Build 2 — `engine/resolve.ts`.** One function per step; a `resolveTurn` that runs them in order against a *cloned* snapshot. Pull every constant from the appendix — do not invent numbers.

```ts
// engine/resolve.ts
import type { World } from "./state";
import type { Commit } from "./contract";

export function resolveTurn(prev: World, commits: Commit[]): World {
  const w = structuredClone(prev);        // frozen snapshot → mutate the copy
  applyCommittedActions(w, commits);       // found/move/trade/train intents queued this turn
  step1_production(w);                     // §4.4 graduation, §5 RC, §6 CU, §8 IU
  step2_costs(w);                          // §4.5 five-line stack; §4.6 deferral/default
  step3_markets(w);                        // §10 order-book match
  step4_demand(w);                         // §8 D(t)=2000×1.05^t, match by price
  step5_timers(w);                         // research/training/construction/deferral clocks
  step6_debt_and_networth(w);              // §4.6 auto-sweep, appendix §P net worth
  w.turn += 1;
  w.frontierBenchmark += 1;                // appendix §L
  return w;
}
```

Teach by implementing **step 2 (costs)** live — it's the beating heart of the game (balance [§4.5](../design-notes/units-and-balance.md)): every building is a liability, and this step is what makes "found everything" fatal. Then **step 6 (net worth)** so the leaderboard means something. Stub 3–5 with the simplest thing that closes the loop (flat commodity revenue for step 4).

**Build 3 — `engine/engine.ts` + a `RandomDroid`.** The loop, and a non-Glove decider so the engine is testable without burning tokens.

```ts
// engine/engine.ts
import { genesis, type World } from "./state";
import { resolveTurn } from "./resolve";
import type { DroidView, Commit } from "./contract";

export interface Decider { decide(view: DroidView): Promise<Commit["actions"]>; }

export function project(w: World, droidId: string): DroidView { /* build the private view */ }
export function netWorth(w: World, droidId: string): number { /* appendix §P (MVP subset) */ }

export async function runGame(deciders: Record<string, Decider>, opts = { turns: 30, seed: 42 }) {
  let w = genesis(Object.keys(deciders), /* openings */ {}, opts.seed);
  for (let t = 0; t < opts.turns; t++) {
    const commits = await Promise.all(                       // simultaneous: all decide vs the same w
      Object.entries(deciders).map(async ([id, d]) => ({
        droidId: id, turn: w.turn, actions: await d.decide(project(w, id)),
      })),
    );
    w = resolveTurn(w, commits);
  }
  return Object.keys(w.droids)
    .map((id) => ({ id, netWorth: netWorth(w, id) }))
    .sort((a, b) => b.netWorth - a.netWorth);
}
```

```ts
// engine/random-droid.ts — cheap opponent for tests
export class RandomDroid implements Decider {
  async decide(v: DroidView) {
    if (v.turn === 0 && v.self.units[0]) return [{ kind: "found_building", unitId: v.self.units[0].id, building: "ai_lab" }];
    return []; // pass
  }
}
```

Wire an `engine.test.ts`: run 4 `RandomDroid`s for 30 turns, assert the game terminates, net worth is finite, and no droid's credits go NaN. Green test = the loop closes.

---

## Instructor notes & gotchas

- **Snapshot, then mutate.** The single most common bug: resolving droid A's actions against a world already changed by droid B. `structuredClone` the start-of-turn world and read decisions against the *projection* of that snapshot.
- **Determinism is a feature.** Seed all randomness (`seed` on `World`). A game must replay identically from `(genesis seed, list of commits)` — this is what makes the Session 7 spectator and Session 8 tournament trustworthy, and it lets you debug a droid's game by replaying it.
- **Validate commits; never trust the decider.** A droid (especially a Glove one) will emit illegal actions — found on a tile it doesn't own, spend credits it doesn't have. `applyCommittedActions` must validate each action and silently drop or clamp invalid ones (and record *why*, for the spectator). Treat the droid as an untrusted client.
- **Numbers come from the appendix, not from vibes.** Wire a `const BALANCE = {...}` module transcribed from appendix [§A–§O](../design-notes/appendix.md) so every rate has one home and playtest tuning (design [§13](../design-notes/design.md)) is a one-file edit.
- **Keep `project()` honest about fog.** Start fully-visible (no fog of war) to reduce complexity; if you add it later, `project` is the only place that filters.
- **Money can't go negative silently.** Decide the failure mode now (deferral/dormancy, balance [§4.6](../design-notes/units-and-balance.md)) even if the MVP just flags it — it's core to the game's identity.

---

## Checkpoint

- `engine.test.ts` runs 4 `RandomDroid`s to termination and prints a ranked leaderboard.
- A student can name what each of the 6 steps does and point to the appendix section its numbers come from.
- Illegal actions from a deliberately-buggy decider are rejected without crashing the engine.

---

## Homework / stretch

- **Required:** implement one stubbed step properly (markets *or* demand) from the appendix. Bring questions on the tricky one to Session 4.
- **Stretch:** add a `replay(seed, commits[])` helper that reconstructs the final world from just the seed and the per-turn commits — the foundation of the spectator.
- **Deeper-chain track:** make the credits ledger a thin interface (`ILedger`) with an in-memory impl now, so Session 8 can swap in a `DroidCredits` (ERC-20)–backed impl without touching `resolve.ts`.
