# Session 2 — Your First Droid

> **Goal:** Build a minimal **server-side Glove agent** that receives a `DroidView` (a game-state snapshot) and returns a list of `Action`s as tool calls. This is the smallest possible droid — no engine yet, just "state in, decisions out."

Today students meet Glove. The mental shift: instead of writing `if turn < 5 then research`, you give an agent **tools** and a **strategy**, and it decides. We prove the loop with a hand-written state snapshot before there's a real world to plug into.

---

## Objectives

By the end, a student can:
- Explain Glove's core loop: user message → agent picks tools → tools run → results feed back → repeat.
- Build a server-side agent with `glove-core`: `new Glove({...}).fold(tool).build()`.
- Define a tool with a Zod `inputSchema` and a `do()` that returns `{ status, data }`.
- Feed a `DroidView` to the agent via `processRequest` and read the committed actions back out.
- See that the droid's *strategy* lives in the **system prompt**.

---

## Prerequisites

- Session 1 checkpoint. The `engine/contract.ts` stub (`DroidView`, `Action`, `Commit`).
- `ANTHROPIC_API_KEY` (or another provider key) in the environment.
- Skim the **`glove` skill** sections *"Server-Side Agents"* and *"Tool Definition"*.

---

## Timeline (~2h)

| Time | Block |
|---|---|
| 0:00–0:10 | Recap the seam. Today we build the *right* side of it (the decider). |
| 0:10–0:30 | **Concept:** the Glove agent loop, tools, `glove-core` vs `glove-react`. |
| 0:30–0:50 | **Build 1:** `pnpm add glove-core zod`; a "hello" agent that answers a prompt. |
| 0:50–1:30 | **Build 2:** the droid — one `commit_actions` tool; feed it a `DroidView` fixture. |
| 1:30–1:50 | **Build 3:** watch it think — attach a subscriber to stream tokens & tool calls. |
| 1:50–2:00 | Checkpoint + homework. |

---

## Concepts

### The agent loop (`glove` skill → *Architecture at a Glance*)

```
User message → Agent → model decides tool calls → tools execute → results fed back → loop until done
```

You define **tools** (capabilities). The **agent** decides when to call them, based on the system prompt and the conversation. For a droid, the "user message" each turn is *the game state*, and the tools are *the moves*.

### Server-side, not React (yet)

The droid has **no UI** — it runs headless in the background. So we use `glove-core` directly, not `glove-react`. Key differences (from the skill's comparison table):

| React (`glove-react`) | Server-side (`glove-core`) — what we use |
|---|---|
| `defineTool` with renderers | `.fold()` with just `do` — no renderers |
| `useGlove()` manages state | call `agent.processRequest()` directly |
| `GloveClient` + provider | `new Glove({...}).build()` |

Set `serverMode: true` — the canonical "I am headless" flag.

### Strategy = system prompt

The same tools + a different system prompt = a different player. "Play a disciplined operator; never let per-turn burn exceed revenue by more than 3k" vs. "Play an aggressive builder; race to M4, defer hard." We'll formalize this in Session 5; today just feel it by changing one string.

---

## Hands-on build

**Build 1 — a hello agent** (throwaway, to see the loop):

```ts
// droid/hello.ts
import { Glove, Displaymanager, MemoryStore, createAdapter } from "glove-core";
import { z } from "zod";

const agent = new Glove({
  store: new MemoryStore("hello"),
  model: createAdapter({ provider: "anthropic" }),
  displayManager: new Displaymanager(),
  serverMode: true,
  systemPrompt: "You are a helpful assistant.",
  compaction_config: { compaction_instructions: "Summarize the conversation." },
})
  .fold({
    name: "roll_die",
    description: "Roll a die with N sides.",
    inputSchema: z.object({ sides: z.number().describe("number of sides") }),
    async do({ sides }) {
      // NOTE: deterministic for teaching — see gotcha on Math.random
      return { status: "success", data: `You rolled a ${sides}.` };
    },
  })
  .build();

const res = await agent.processRequest("Roll a 20-sided die.");
console.log(res.messages.at(-1)?.text);
```

Run it, watch it call the tool. That's the whole framework in 20 lines.

**Build 2 — the droid.** One tool, `commit_actions`, whose input schema *is* the `Action` union. The droid reads the state we hand it and calls this tool once with its turn's moves.

```ts
// droid/droid.ts
import { Glove, Displaymanager, MemoryStore, createAdapter } from "glove-core";
import { z } from "zod";
import type { DroidView, Commit } from "../engine/contract";

// Zod mirror of the Action union from Session 1 (keep in sync — Session 4 generates this).
const ActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("found_building"), unitId: z.string(), building: z.enum(["ai_lab","chip_fab","data_center","power_plant"]) }),
  z.object({ kind: z.literal("market_order"), side: z.enum(["buy","sell"]), item: z.string(), qty: z.number(), price: z.number() }),
  z.object({ kind: z.literal("acquire_tile"), tile: z.object({ q: z.number(), r: z.number() }) }),
  // …the rest land in Session 4
]);

export function buildDroid(opts: { droidId: string; strategy: string }) {
  const committed: Commit["actions"][] = [];

  return {
    agent: new Glove({
      store: new MemoryStore(`droid_${opts.droidId}`),
      model: createAdapter({ provider: "anthropic" }),
      displayManager: new Displaymanager(),
      serverMode: true,
      systemPrompt: DROID_SYSTEM_PROMPT(opts.strategy),
      compaction_config: { compaction_instructions: "Summarize prior turns: holdings, debts, model status, plan." },
    })
      .fold({
        name: "commit_actions",
        description:
          "Commit this turn's actions. Call EXACTLY ONCE per turn with the full list. " +
          "An empty list is a valid 'pass'. After calling this, stop.",
        inputSchema: z.object({
          rationale: z.string().describe("one sentence: why these actions, given your strategy"),
          actions: z.array(ActionSchema).describe("the actions to apply this turn"),
        }),
        async do({ actions, rationale }) {
          committed.push(actions);
          return { status: "success", data: `Committed ${actions.length} action(s). Rationale noted.` };
        },
      })
      .build(),
    /** Run one turn: hand the droid its view, get its committed actions. */
    async decide(view: DroidView) {
      committed.length = 0;
      await this.agent.processRequest(renderView(view));
      return committed.at(-1) ?? [];
    },
  };
}

const DROID_SYSTEM_PROMPT = (strategy: string) => `
You are a Droid in Droidnomi — an economic simulation. Your sole objective is the
highest NET WORTH at the terminating turn (liquid credits + assets + model IP − debt).

Each turn you receive your private view of the world as JSON. Decide your moves and
call commit_actions exactly once. Think about cash-flow runway: every building is a
per-turn liability before it earns. Do not found what you cannot pay to run.

YOUR STRATEGY:
${strategy}
`.trim();

// A compact, model-friendly rendering of the view. Full JSON works but burns tokens;
// tighten it in Session 4. For now:
function renderView(v: DroidView): string {
  return `Turn ${v.turn}. Here is your state:\n\`\`\`json\n${JSON.stringify(v.self)}\n\`\`\`\n` +
    `Market & board:\n\`\`\`json\n${JSON.stringify(v.board)}\n\`\`\`\nDecide and commit.`;
}
```

**Build 3 — a `DroidView` fixture + watch it think.** Hand-write one snapshot (turn 0, 100k credits, one founding unit) and attach a subscriber so students *see* the reasoning stream — this is exactly what the spectator frontend will show in Session 7.

```ts
// droid/run-once.ts
import { buildDroid } from "./droid";
import type { DroidView } from "../engine/contract";
import type { SubscriberAdapter } from "glove-core";

const view: DroidView = {
  turn: 0,
  self: { droidId: "d1", credits: 100_000, netWorth: 100_000, units: [{ id: "u1", role: "ai_researcher" }], buildings: [], models: [], tiles: [] },
  board: { visibleTiles: [], npcs: [], market: { chips: { low: 5000 } }, frontierBenchmark: 20, demand: { total: 2000 }, leaderboard: [], singularityClock: null },
} as any; // leaf types firm up in Session 3

const droid = buildDroid({
  droidId: "d1",
  strategy: "Operator. Open the Lab. Reach a saleable M1 fast, keep burn under control.",
});

const trace: SubscriberAdapter = {
  async record(type, data) {
    if (type === "text_delta") process.stdout.write((data as any).text);
    if (type === "tool_use") console.log(`\n[tool] ${(data as any).name}`);
  },
};
droid.agent.addSubscriber(trace);

const actions = await droid.decide(view);
console.log("\nCOMMITTED:", JSON.stringify(actions, null, 2));
```

Run it. The droid should reason about its opening and commit something like "found the AI Lab." Change the `strategy` string to a builder and watch the plan change — that's the payoff moment of the session.

---

## Instructor notes & gotchas

- **`Displaymanager` casing** — lowercase `m`. It's required even server-side; pass an empty one. (`glove` skill gotcha #5.)
- **`createAdapter` streams by default** — `stream` is `true` unless you pass `stream: false`. Streaming is what makes Build 3's live trace work. (Gotcha #6.)
- **"Call the tool exactly once."** Without that instruction the model may narrate instead of committing, or call the tool repeatedly. Put the constraint in both the tool description and the system prompt. (Gotcha #26 — document tools explicitly.)
- **`data` goes to the model; `renderData` stays client-side.** `commit_actions` returns a short confirmation string as `data` so the model knows it succeeded and stops. Don't dump the whole state back. (Gotcha #7, #10.)
- **No `Math.random()` / `Date.now()` in tools you want reproducible.** The engine owns randomness (seeded) — droids should be deterministic given a view. Keep dice out of tools; the "roll_die" hello is throwaway.
- **Keep the Zod `Action` schema and `contract.ts` in sync by hand for now.** Session 4 introduces a single source of truth (derive the TS type from Zod with `z.infer`) so they can't drift.
- **Token cost.** Dumping full JSON works for one turn but gets expensive over a game. Note it now; fix it in Session 4 with a tighter `renderView` and `glove-memory`.

---

## Checkpoint

A student can run `run-once.ts` and show:
1. The droid's streamed reasoning about its opening.
2. A `commit_actions` call with a plausible turn-0 plan.
3. The committed `Action[]` printed out.
4. A **different** committed plan after swapping the strategy string — proving strategy lives in the prompt.

---

## Homework / stretch

- **Required:** write two more strategy strings (a builder and a consolidator) and note how each turn-0 commit differs. Bring them to Session 5.
- **Stretch:** add a second read-only tool `explain_rule(topic)` that returns a snippet from the balance spec, so the droid can "look up" costs before deciding. (Foreshadows giving droids real reference access.)
- **Stretch:** tighten `renderView` to a compact line-per-entity format and compare token usage to the JSON dump.
