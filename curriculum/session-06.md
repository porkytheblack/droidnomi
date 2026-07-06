# Session 6 — Frontend I: Create & Configure a Droid

> **Goal:** Build the human on-ramp. A player lands on the app, **creates a droid** (names it, picks an opening, mints its identity), and **defines its strategy through conversation** — describing how they want to play in plain language while a Glove agent turns that into the structured `Strategy` object from Session 5.

This is where the course pivots from backend to product. The key idea: the strategy-builder is *itself* a Glove app — the player talks, the agent asks clarifying questions with interactive tools, and the output is the exact `Strategy` the droid runs on.

---

## Objectives

By the end, a student can:
- Stand up a Next.js frontend with `glove-next` (`createChatHandler`) and `glove-react` (`GloveProvider`, `useGlove`, `<Render>`).
- Build **interactive tools** with `defineTool` that render UI and collect input (`pushAndWait`, `render`, `resolveSchema`).
- Drive a conversational flow that produces a validated `Strategy` object.
- Wire the "create droid" action to the backend (register with the engine; mint `DroidIdentity`).
- Understand the **bridge pattern** for reaching app state (wallet, current draft) from inside a tool.

---

## Prerequisites

- Session 5. A `Strategy` type and `toSystemPrompt`. A running engine/runner you can register a droid with.
- Skim the `glove` skill sections *"Quick Start (Next.js)"*, *"Display Stack Patterns"*, and *"`<Render>` Component"*.

---

## Timeline (~2h)

| Time | Block |
|---|---|
| 0:00–0:10 | Recap. The frontend is a Glove app; the strategy-builder is an agent. |
| 0:10–0:30 | **Concept:** glove-react architecture; interactive tools; display strategies. |
| 0:30–0:55 | **Build 1:** scaffold — route, provider, chat surface. |
| 0:55–1:30 | **Build 2:** the strategy-builder agent — tools for opening pick, priorities, guardrails → `Strategy`. |
| 1:30–1:50 | **Build 3:** "Create droid" — persist the config, register with the engine, mint identity. |
| 1:50–2:00 | Checkpoint + homework. |

---

## Concepts

### glove-react in one picture (`glove` skill → *Quick Start*)

```
GloveProvider(client) ── useGlove() ──> { timeline, slots, sendMessage, … }
        │                                   └─ <Render> draws messages + tool UI ("slots")
   GloveClient(endpoint:/api/chat, tools, systemPrompt)
        │
   /api/chat  ── createChatHandler({ provider, model })  (glove-next, SSE streaming)
```

You define tools with **colocated renderers** (`defineTool`), the agent decides when to call them, and their `render()` draws UI right in the chat. This is perfect for a strategy interview.

### Interactive tools = the interview (`glove` skill → *Display Stack Patterns*)

- **`pushAndWait`** blocks the tool until the user responds — use it for the opening pick, priority ranking, guardrail confirmation. The resolved value returns into `do()`.
- **`pushAndForget`** shows UI without blocking — use it for a live "strategy summary" card that updates as the interview proceeds.
- **`displayStrategy: "hide-on-complete"`** on the picker tools so answered questions collapse (`glove` skill *Display Strategies*).

### The output is a validated object, not vibes

The whole conversation exists to fill one `Strategy` (S5). The final tool, `finalize_strategy`, validates the assembled object with the Zod schema and hands it to the app. If the player was vague, the agent asks again. **Structured output from unstructured input** — that's the pattern.

---

## Hands-on build

**Build 1 — scaffold.** (`glove` skill *Quick Start* is the exact recipe.)

```ts
// web/app/api/chat/route.ts
import { createChatHandler } from "glove-next";
export const POST = createChatHandler({ provider: "anthropic", model: "claude-sonnet-4-20250514" });
```

```tsx
// web/app/providers.tsx
"use client";
import { GloveProvider } from "glove-react";
import { strategyClient } from "@/lib/strategy-client";
export function Providers({ children }: { children: React.ReactNode }) {
  return <GloveProvider client={strategyClient}>{children}</GloveProvider>;
}
```

**Build 2 — the strategy-builder agent.** A `GloveClient` with a system prompt that runs a short interview and interactive tools that collect each piece.

```tsx
// web/lib/strategy-client.tsx
import { GloveClient, defineTool } from "glove-react";
import { z } from "zod";

const pickOpening = defineTool({
  name: "pick_opening",
  description: "Ask the player which opening to play. Call once, early.",
  inputSchema: z.object({ question: z.string() }),
  displayPropsSchema: z.object({ question: z.string() }),
  resolveSchema: z.enum(["lab", "fab", "cloud"]),
  displayStrategy: "hide-on-complete",
  async do(input, display) {
    const opening = await display.pushAndWait(input);       // typed enum back
    return { status: "success", data: `Opening chosen: ${opening}`, renderData: { opening } };
  },
  render({ props, resolve }) {
    return (
      <div className="opening-picker">
        <p>{props.question}</p>
        <button onClick={() => resolve("lab")}>🔬 Lab — research-first (builder)</button>
        <button onClick={() => resolve("fab")}>🔩 Fab — silicon, earliest cash flow</button>
        <button onClick={() => resolve("cloud")}>☁️ Cloud — rent compute (landlord)</button>
      </div>
    );
  },
});

const finalizeStrategy = defineTool({
  name: "finalize_strategy",
  description: "Assemble and validate the full Strategy once opening, archetype, priorities and guardrails are known. Call last.",
  inputSchema: z.object({
    archetype: z.enum(["operator", "builder", "consolidator"]),
    opening: z.enum(["lab", "fab", "cloud"]),
    priorities: z.array(z.string()).min(1),
    guardrails: z.array(z.string()),
    riskAppetite: z.enum(["low", "medium", "high"]),
  }),
  async do(strategy) {
    // hand off to the app via the bridge (see gotcha) — the "Create droid" button reads this
    strategyDraft.set(strategy);
    return { status: "success", data: "Strategy finalized. Ready to create the droid.", renderData: strategy };
  },
  renderResult({ data }) {
    const s = data as any;
    return <StrategyCard strategy={s} />;   // pushAndForget-style summary from history
  },
});

export const strategyClient = new GloveClient({
  endpoint: "/api/chat",
  systemPrompt: `You are the Droid Architect. Interview the player to design their Droidnomi strategy.
Explain the three openings if they're unsure (Lab = research/builder, Fab = silicon/earliest cash, Cloud = compute landlord).
Elicit: archetype (operator/builder/consolidator), 2–4 ordered priorities, hard guardrails (cash buffers, deferral limits), risk appetite.
Use pick_opening early. When you have everything, call finalize_strategy. Keep it to a few focused questions — respect their time.`,
  tools: [pickOpening, /* pick_archetype, add_priority, add_guardrail, */ finalizeStrategy],
});
```

```tsx
// web/app/create/page.tsx
"use client";
import { useGlove, Render } from "glove-react";
export default function Create() {
  const glove = useGlove();
  return (
    <Render
      glove={glove}
      strategy="interleaved"
      renderMessage={({ entry }) => <ChatBubble entry={entry} />}
    />
  );
}
```

The player types "I want to play safe and cash-flow positive, sell chips early" → the agent picks up "operator + fab", asks two clarifiers with the interactive picker, and calls `finalize_strategy`. A `StrategyCard` renders the result.

**Build 3 — "Create droid."** When a finalized `Strategy` exists, enable a **Create Droid** button that: (1) POSTs `{ name, strategy }` to a backend route that registers the droid with the engine/runner (Session 5), and (2) mints its `DroidIdentity` NFT with a metadata URI (name, opening, created-at).

```ts
// web/app/api/droids/route.ts
export async function POST(req: Request) {
  const { name, strategy } = await req.json();
  const droidId = await registerDroidWithRunner({ name, strategy });   // Session 5 runner
  const tokenId = await mintDroidIdentity(name, strategy);             // contracts/DroidIdentity (owner key server-side)
  return Response.json({ droidId, tokenId });
}
```

Keep minting mockable behind an interface so classes on the "skip chain" track just return a fake `tokenId`.

---

## Instructor notes & gotchas

- **Tools run outside React** (`glove` skill gotcha #24). A tool's `do()` can't call `useWallet()` or React context directly. Use the **bridge pattern**: a mutable singleton (`strategyDraft`, a wallet ref) synced from a component with `useEffect`. This is how `finalize_strategy` hands the object to the page.
- **`data` vs `renderData`** (gotcha #7, #10). Put the human-facing strategy object in `renderData` (client-only) and a short confirmation in `data` (model-facing). The model doesn't need the whole object echoed back.
- **`<Render>` ships a default input** (gotcha #23). If you build a custom composer, pass `renderInput={() => null}` or you'll get two input boxes.
- **`displayPropsSchema` + `resolveSchema` give you types** in `render()` — `props` and `resolve` are both typed. Use them; it catches the "resolved the wrong shape" class of bug at compile time.
- **Keep the interview short.** The system prompt should push the agent to 3–5 questions, not an interrogation. Respect the "too busy" player — the whole selling point is fast setup. Cap it explicitly in the prompt.
- **Validate at `finalize_strategy`.** The Zod schema on that tool's input is the gate — if the model assembles a bad object, the executor makes it retry (that's the framework's structured-output guarantee). Don't validate in three places; validate here.
- **Session, not global.** Give each player a session id (`getSessionId` on the client) so two players configuring droids don't share a conversation (`glove` skill *Quick Start* comment).

---

## Checkpoint

- A player can hold a short conversation and end with a rendered, validated `Strategy` card.
- The interactive opening-picker renders in-chat and its choice flows into the final object.
- "Create Droid" registers the droid with the backend and returns an id (and a real-or-mocked `tokenId`).
- Two browser tabs configure independent droids without crosstalk.

---

## Homework / stretch

- **Required:** add `pick_archetype`, `add_priority`, and `add_guardrail` interactive tools so the whole `Strategy` is collected through UI, not just free text.
- **Stretch:** show a live `pushAndForget` "strategy so far" card that updates as each field is filled.
- **Stretch:** add a "surprise me" path where the agent proposes a full strategy for a chosen archetype and the player just approves it (`approve_plan` tool from the registry).
- **Deeper-chain track:** wire a wallet connect and mint `DroidIdentity` from the player's address instead of a server key.
