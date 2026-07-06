# Session 7 — Frontend II: Launch & Spectate

> **Goal:** Build the watch surface. A player **launches** their configured droid into a running game and **spectates** — a live hex board, a net-worth leaderboard over time, a per-droid panel that streams *why* each droid is acting, and the Singularity Clock ticking down the endgame. This is the "view what's going on" half of the brief.

The engine already runs in the background (Sessions 3–5) and already emits per-droid reasoning events (Session 5's Continuum forwarding). Today we surface all of it. The spectator is a *read* view over the same data the engine and droids already produce.

---

## Objectives

By the end, a student can:
- Stream live game state from the background engine to the browser (SSE or WebSocket) and render it.
- Render the hex board, unit/building positions, and territory from `World` state.
- Plot the net-worth leaderboard over turns (design [§12](../design-notes/design.md)).
- Stream a droid's **reasoning** (text + tool calls) into a readable activity feed, using Glove's subscriber events.
- Render the Singularity Clock and endgame state (design [§12.3](../design-notes/design.md)).

---

## Prerequisites

- Sessions 5–6. A background game producing per-turn `World` snapshots and per-droid event logs; the frontend scaffold.
- Skim the `glove` skill sections *"Subscribers"*, *"useGlove Hook Return"* (the `stats`, `timeline` shapes), and Continuum *"Subscriber model"* (`onAgentEvent`).
- If visualizing charts, the **`dataviz` skill** is worth a look for the leaderboard.

---

## Timeline (~2h)

| Time | Block |
|---|---|
| 0:00–0:10 | Recap. Spectator = a read view over data we already emit. |
| 0:10–0:30 | **Concept:** the two live streams (world state, droid reasoning); transport choices. |
| 0:30–1:00 | **Build 1:** the game-state stream — engine → SSE → `useGameState()` hook → board. |
| 1:00–1:35 | **Build 2:** the reasoning feed — droid events → per-droid activity panel. |
| 1:35–1:55 | **Build 3:** leaderboard-over-time + Singularity Clock; "Launch" wired end-to-end. |
| 1:55–2:00 | Checkpoint + homework. |

---

## Concepts

### Two live streams

The spectator consumes two feeds, both already produced upstream:

1. **World state, per turn** — the `World` snapshot the engine writes at the end of each `resolveTurn` (Session 3). This drives the board, leaderboard, market, and clock. Low frequency (one per turn), whole-state.
2. **Droid reasoning, continuous** — the Glove `SubscriberEvent`s each droid emits while deciding (`text_delta`, `tool_use`, `tool_use_result`). In Session 5, Continuum already forwards these via `onAgentEvent(envelope)` with the droid's identity attached. High frequency, per-droid.

The lesson: **you're not computing anything new in the frontend** — you're transporting and rendering what the backend already knows. Keep it a dumb, honest mirror.

### Transport (pick one)

- **SSE** — simplest for a one-way spectator stream; a Next.js route that writes `text/event-stream`. Recommended default.
- **WebSocket** — if you want the spectator to also *send* (pause, speed, focus a droid). More moving parts.
- **Poll** — a `/api/game/:id/state` endpoint polled every second. Ugly but bulletproof for a first pass; fine to start here and upgrade.

### The reasoning feed is the "wow"

Watching net worth tick is fine. Watching a droid *say* "I'm 20% behind the leader and my M2 is going obsolete — invoking panic mode, selling the idle fab" is the moment the whole course pays off. Prioritize the reasoning panel; it's what makes AI players legible and is unique to this being an agent game.

---

## Hands-on build

**Build 1 — game-state stream + board.** The engine publishes each turn's snapshot; a route streams it; a hook consumes it.

```ts
// engine/bus.ts — tiny pub/sub the runner writes to each turn
type Listener = (w: World) => void;
const listeners = new Set<Listener>();
export const publishWorld = (w: World) => listeners.forEach((l) => l(w));
export const subscribeWorld = (l: Listener) => (listeners.add(l), () => listeners.delete(l));
```

```ts
// web/app/api/game/[id]/stream/route.ts  (SSE)
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const unsub = subscribeWorld((w) => controller.enqueue(enc.encode(`data: ${JSON.stringify(w)}\n\n`)));
      // clean up on close
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
```

```tsx
// web/app/spectate/[id]/HexBoard.tsx — render tiles, ownership, units, buildings
export function HexBoard({ world }: { world: World }) {
  return (
    <svg viewBox={boardViewBox(world)}>
      {Object.values(world.tiles).map((t) => <Hex key={key(t.ref)} tile={t} ownerColor={colorFor(t.owner)} />)}
      {Object.values(world.buildings).map((b) => <BuildingGlyph key={b.id} building={b} />)}
      {Object.values(world.units).map((u) => <UnitDot key={u.id} unit={u} />)}
    </svg>
  );
}
```

Keep the hex math simple (axial `q,r` → pixel). The point is legibility, not a game engine renderer — colored hexes for ownership, glyphs for buildings, dots for units.

**Build 2 — the reasoning feed.** The runner already receives `onAgentEvent` envelopes (Session 5). Fan them into a per-droid ring buffer and stream them alongside the world.

```ts
// runner/reasoning-bus.ts
const feeds: Record<string, ReasoningEvent[]> = {};
export function onDroidEvent(envelope: AgentEventEnvelope<any>) {
  const { agentName, event_type, data } = envelope;
  (feeds[agentName] ??= []);
  if (event_type === "text_delta") appendText(feeds[agentName], data.text);
  if (event_type === "tool_use") feeds[agentName].push({ kind: "action", name: data.name, at: envelope.timestamp });
  if (event_type === "tool_use_result") annotateLast(feeds[agentName], data);
  publishReasoning(agentName, feeds[agentName].at(-1)!);
}
```

```tsx
// web/app/spectate/[id]/DroidPanel.tsx
export function DroidPanel({ droidId }: { droidId: string }) {
  const feed = useReasoningFeed(droidId);   // subscribes to the reasoning SSE for this droid
  return (
    <aside>
      <h3>{droidId}</h3>
      {feed.map((e, i) =>
        e.kind === "thought" ? <p className="thought">{e.text}</p>
        : <p className="action">▶ {e.name} <span>{e.summary}</span></p>,
      )}
    </aside>
  );
}
```

This is the same `text_delta` / `tool_use` stream students watched in the terminal in Session 2 — now it's a product feature. Call that out; it lands the "the framework gave us this for free" point.

**Build 3 — leaderboard-over-time + the clock + Launch.**

```tsx
// web/app/spectate/[id]/Leaderboard.tsx — net worth per droid across turns
export function Leaderboard({ history }: { history: World[] }) {
  const series = buildNetWorthSeries(history);   // [{ turn, droidId, netWorth }]
  return <LineChart series={series} highlight="me" />;   // see the dataviz skill for palette/axes
}
```

```tsx
// SingularityClock.tsx
export function SingularityClock({ world }: { world: World }) {
  if (world.singularityClock == null) return <span>Frontier B_f: {world.frontierBenchmark}</span>;
  return <Countdown turnsLeft={world.singularityClock} label="⚠ Singularity — endgame scramble" />;
}
```

Wire the **Launch** button from Session 6: it registers the player's configured droid into a game the runner is driving, then routes to `/spectate/:gameId`. From the player's side the arc is now complete — **create → configure → launch → watch**.

---

## Instructor notes & gotchas

- **`model_response_complete`, not `model_response`** (`glove` skill gotcha #1). Streaming adapters emit the `_complete` variant — handle both in the reasoning fan-in or you'll miss end-of-turn text.
- **`renderData` is stripped from model messages** (gotcha #10) — but the spectator reads engine `World` state and Continuum envelopes, not the model's tool results, so you get full fidelity. Reinforce the boundary: the *droid's* model never sees the spectator; the spectator sees everything.
- **Backpressure on `text_delta`.** Token deltas are chatty. Debounce/coalesce before pushing to the browser (e.g. flush every 100ms or per sentence) or the SSE stream floods. Coalescing into sentences also reads better.
- **Snapshot vs. replay.** For a class demo, streaming a *pre-recorded* game (from the S3 `replay(seed, commits)`) is smoother and cheaper than a live one and lets you scrub. Build the spectator to consume a snapshot stream so it works for both live and replay — same interface.
- **Don't recompute net worth in the browser.** The engine already computes it (appendix [§P](../design-notes/appendix.md)); the frontend plots it. Any divergence is a bug in one place, not two.
- **Fog of war is a product decision.** A pure spectator sees all; a *player watching their own droid* might see only their view (`project()`). Decide which you're building — a god-view spectator is simpler and better for teaching.
- **Charts: use the `dataviz` skill.** The net-worth-over-time line chart is the one real visualization; get the palette, axes, and light/dark handling right rather than hand-rolling.

---

## Checkpoint

- Launching a droid drops it into a running game and opens a spectator that updates live.
- The hex board shows tiles/ownership/buildings/units and changes each turn.
- Each droid's panel streams its reasoning (thoughts + actions) as it decides.
- The leaderboard plots net worth over turns; the Singularity Clock appears and counts down when an M6 deploys.

---

## Homework / stretch

- **Required:** add a "focus droid" control that expands one droid's panel and highlights its territory on the board.
- **Stretch:** add playback controls (pause / step / 2×) over a replayed game using the S3 replay helper.
- **Stretch:** surface *rejected* actions (from Session 4's validation) in the feed — "tried to found a fab, insufficient credits" — so viewers see the droid's mistakes, not just its moves.
- **Deeper-chain track:** show live on-chain balances (DCr) next to the engine's ledger and reconcile them in the UI.
