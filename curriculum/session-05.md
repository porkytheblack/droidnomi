# Session 5 — Strategy & Running Many Droids

> **Goal:** Two things. First, treat **strategy** as a first-class artifact — how a natural-language strategy becomes a droid's behavior. Second, run **many droids concurrently in the background** against one engine using `glove-continuum-signal`, so a game plays itself. By the end: a self-resolving tournament of 3–4 droids.

This is the session that makes "we'll just run the game in the background" real. Until now you ran one droid by hand; now the engine drives a fleet of them, each waking to decide its turn, unattended.

---

## Objectives

By the end, a student can:
- Express a strategy as a structured artifact (archetype + priorities + guardrails) and compile it to a system prompt.
- Use Glove **skills/hooks** to give a droid switchable strategy *modes* (e.g. "go aggressive when behind").
- Explain the Continuum model: **triggered** (cold, spawn-per-wakeup) vs **concurrent** (warm) agents, and why a per-turn droid is a triggered agent with a persistent store.
- Stand up a `ContinuumRunner` that wakes each droid once per turn and collects its commit.
- (Optional) let droids signal each other with `glove-mesh` (alliances, trades).

---

## Prerequisites

- Session 4. A `gloveDroid()` `Decider` that plays a full game.
- Skim the `glove` skill sections *"Continuum (`glove-continuum-signal`)"*, *"Extensions: Hooks, Skills & Subagents"*, and *"Mesh Network"*.

---

## Timeline (~2h)

| Time | Block |
|---|---|
| 0:00–0:10 | Recap. From "I run one droid" to "the game runs a fleet." |
| 0:10–0:30 | **Concept:** strategy as artifact; strategy modes via skills/hooks. |
| 0:30–0:55 | **Build 1:** `strategy.ts` — typed strategy → system prompt; a mode-switch hook. |
| 0:55–1:00 | **Concept:** Continuum — triggered vs concurrent; the per-turn droid pattern. |
| 1:00–1:40 | **Build 2:** a Continuum runner that drives a background game of N droids. |
| 1:40–1:55 | **Build 3 (optional):** mesh — a droid broadcasts a trade offer. |
| 1:55–2:00 | Checkpoint + homework. |

---

## Concepts

### Strategy as a first-class artifact

A strategy string works but is hard to author and compare. Model it:

```ts
// droid/strategy.ts
export interface Strategy {
  archetype: "operator" | "builder" | "consolidator";
  opening: "lab" | "fab" | "cloud";          // design §3.4
  priorities: string[];                       // ordered, e.g. ["reach M1 by ~T9", "never net-burn > 3k", "buy distressed fabs"]
  guardrails: string[];                       // hard rules, e.g. ["never defer past 12 turns", "keep 10k cash buffer"]
  riskAppetite: "low" | "medium" | "high";
}

export function toSystemPrompt(s: Strategy): string { /* deterministic template → the DROID_SYSTEM_PROMPT body */ }
```

This is the object the **frontend** (Session 6) will produce from a conversation, and it's what makes strategies comparable in the tournament. The droid's *behavior* is `tools + toSystemPrompt(strategy) + memory`.

### Strategy *modes* via hooks & skills (`glove` skill → *Extensions*)

A static prompt can't adapt. Two Glove mechanisms let strategy shift mid-game:

- **Skills** (`defineSkill`, `exposeToAgent: true`): the droid can *pull in* a strategy mode when conditions warrant — e.g. a `panic_mode` skill that injects "you are >30% behind the leader; stop building, defend cash, sell non-core assets." The model invokes it via `glove_invoke_skill` when its view says it's losing.
- **Hooks** (`defineHook`): the *driver* can force a shift — e.g. inject `/aggressive` when the Singularity Clock starts, rewriting the turn's guidance for the endgame scramble (design [§12.3](../design-notes/design.md)).

This is how "define a strategy" becomes richer than one paragraph: a base strategy plus conditional modes the droid or the engine can trigger.

### Continuum: droids as background subprocesses (`glove` skill → *Continuum*)

`glove-continuum-signal` supervises Glove agents as OS subprocesses. Two modes:

- **Triggered** — cold; each wakeup spawns a fresh subprocess that resumes its **persistent store**, runs a turn, returns, goes cold. *This is the natural fit for a per-turn droid:* the engine "wakes" it once per turn with the turn's view.
- **Concurrent** — warm, long-lived subprocess notified inline. Lower latency; use if you want droids that also react to mid-turn mesh messages.

A per-turn droid is a **triggered agent with a `.store(...)`** so it remembers across wakeups (`glove` skill gotcha #62 — triggered agents NEED a persistent store or they reset every turn).

> **Scoping note:** for a classroom, you can also just call your droids in a `Promise.all` inside the engine loop (as in Session 3's `runGame`) — that already runs them "concurrently" from the engine's view. Continuum earns its keep when droids are **long-running, isolated, independently observable, and possibly deployed separately** — which is exactly where this course is heading (Session 8). Teach the `Promise.all` version as the floor and Continuum as the real architecture.

---

## Hands-on build

**Build 1 — strategy compiler + a mode skill.**

```ts
// droid/strategy.ts (continued)
export function foldStrategyModes(glove /* IGloveBuilder */) {
  return glove
    .defineSkill({
      name: "panic-mode",
      description: "Invoke when you are >25% net worth behind the leader: defend cash, stop new builds, sell non-core.",
      exposeToAgent: true,
      handler: async () => "OVERRIDE: You are far behind. Preserve cash. Do not found or upgrade. " +
        "Sell idle assets, clear cheap debt, keep a saleable model live. Re-evaluate next turn.",
    })
    .defineHook("endgame", async () => ({
      rewriteText: "SINGULARITY CLOCK ACTIVE. Demand is spiking and asset prices are volatile (design §12.3). " +
        "Convert holdings to net worth: sell inventory into the spike, cash out non-core buildings, maximize IU this turn.",
    }));
}
```

Wire `panic-mode` as an exposed skill (the droid decides when it's losing and pulls it in); wire `/endgame` as a hook the **engine** injects into `renderView` once `singularityClock !== null`.

**Build 2 — a Continuum runner driving a background game.** Define each droid as a triggered agent; the runner wakes them per turn; a small coordinator collects commits and advances the engine.

```ts
// runner/droid-agent.ts — one file per droid archetype, discovered by the runner
import { agent, z } from "glove-continuum-signal";
import { Glove, Displaymanager } from "glove-core";
import { createAdapter } from "glove-core/models/providers";
import { buildDroidGlove } from "../droid/droid";   // folds toolbelt + memory + strategy modes

export const operatorDroid = agent("operator")
  .input(z.object({ view: z.any() /* DroidView */ }))
  .output(z.object({ actions: z.array(z.any()) }))
  .triggered()
  .store((name) => makeInboxCapableStore(`./state/${name}.db`))   // persists across turns (gotcha #62)
  .factory(async (ctx) =>
    buildDroidGlove({
      store: ctx.store!,
      strategy: OPERATOR_STRATEGY,          // from Strategy → toSystemPrompt
      model: createAdapter({ provider: "anthropic" }),
      displayManager: new Displaymanager(),
    }),
  );
```

```ts
// runner/tournament.ts
import { ContinuumRunner, MemoryAdapter, ConsoleSubscriber } from "glove-continuum-signal";
import { genesis, resolveTurn, project } from "../engine";

const runner = new ContinuumRunner({
  agentsDir: "./runner",                 // discovers operatorDroid, builderDroid, …
  adapter: new MemoryAdapter(),
  subscribers: [new ConsoleSubscriber()],
});
await runner.start();

let world = genesis(["operator","builder","consolidator","random"], /* openings */ {}, 42);
for (let t = 0; t < 40; t++) {
  const results = await Promise.all(
    ["operator","builder","consolidator"].map(async (name) => {
      const runId = await runner.trigger(name, { view: project(world, name) });   // wake the droid
      const final = await runner.waitForRun(runId);
      return { droidId: name, turn: world.turn, actions: final.output?.actions ?? [] };
    }),
  );
  results.push({ droidId: "random", turn: world.turn, actions: randomCommit(world) });
  world = resolveTurn(world, results);
}
await runner.stop({ graceful: true });
```

Now the game plays itself: each turn the runner wakes every droid subprocess with its private view, they decide in isolation, the engine resolves. This is the literal background game. The `ConsoleSubscriber` + the runner's `onAgentEvent` forwarding is your live window into every droid's reasoning — the exact feed the spectator UI consumes in Session 7.

**Build 3 (optional) — mesh signaling.** Let droids make each other offers (design's markets are anonymous order books; mesh adds *negotiation*). Mount mesh in the factory:

```ts
import { mountMesh } from "glove-mesh";
// inside the factory, after building glove:
await mountMesh(glove, {
  adapter: makeMeshAdapter(ctx.name),
  identity: { id: ctx.name, name: ctx.name, description: "A Droidnomi player", capabilities: ["trade"] },
});
```

A droid can now `glove_mesh_broadcast("Selling 5 medium chips at 17k, below spot — reply to deal")`. Keep it optional; it's a great stretch for advanced classes and sets up alliances/betrayal narratives (design README's "loyalty can be bought").

---

## Instructor notes & gotchas

- **Triggered droids MUST have `.store(...)`.** Without a persistent store every wakeup is amnesiac — the droid forgets it's mid-training-run. (`glove` skill gotcha #62.) The store must also be **inbox-capable** if you mount mesh (gotcha #54, #63).
- **Start with `Promise.all`, graduate to Continuum.** Don't let Continuum's subprocess machinery obscure the idea. Show the loop works with plain `Promise.all` first (students already have it from S3), then refactor to Continuum for isolation/observability. Same seam, more infrastructure.
- **Parent is the source of truth for turn order.** The engine coordinator advances turns; droids only decide. Never let a droid subprocess mutate world state — it returns `actions`, the engine resolves. (Mirrors gotcha #65.)
- **Observability is free — use it.** Continuum forwards every child's Glove `SubscriberEvent` via `onAgentEvent(envelope)` (gotcha #64). Capture these to a per-droid log now; Session 7 renders them. Don't add a separate logging path.
- **Mesh has no auth and is best-effort.** Sender ids are unverified; broadcast blocking resolves on the *first* ack (gotcha #56, #59). Fine for a game; just don't build trust assumptions on it.
- **Cost scales with fleet × turns × exploration.** Four droids × 40 turns × granular tools is a real bill. Use cheaper models for the random/filler droids, keep the compact `renderView`, and cap turns for class demos. Measure and show it.
- **Determinism vs. LLM nondeterminism.** The *engine* is seeded and replayable; the *droids* are not (LLMs vary). For reproducible demos, record each droid's committed actions and replay via the engine's `replay(seed, commits)` (S3 homework) rather than re-running the models.

---

## Checkpoint

- A background game of 3 Glove droids + 1 random bot resolves 40 turns unattended and produces a leaderboard.
- Each droid runs as its own Continuum triggered agent with a persistent store (survives across turns).
- A student can trigger `panic-mode` by handing a droid a "far behind" view and show the behavior change.
- Per-droid reasoning is captured to a log via the runner's forwarded events.

---

## Homework / stretch

- **Required:** author your own `Strategy` object and run it in the tournament. Compare its trajectory to a classmate's across 2 seeds.
- **Stretch:** add a second strategy mode (`vulture-mode` — buy distressed assets, design [§11](../design-notes/design.md)) as an exposed skill and show a droid consolidating a bankrupt rival.
- **Stretch:** implement mesh trade offers and let two droids complete a deal outside the order book.
- **Deeper-chain track:** have the tournament settle wages/trades through `DroidCredits` on a local `anvil` chain, so the leaderboard reflects real on-chain balances.
