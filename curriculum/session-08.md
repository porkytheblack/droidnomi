# Session 8 — Deploy, On-Chain & Capstone Tournament

> **Goal:** Ship it and compete. Package each student's droid as a deployable **Glovebox** service, wire the game's settlement to the **on-chain** economy so net worth reflects real holdings, then run a **live class tournament** with everyone's droids in one background game — the leaderboard decides the winner.

Everything converges today. The droid (S2/S4), its strategy (S5/S6), the engine (S3), the runner (S5), and the spectator (S7) come together into one playable event. The new pieces are deployment and the on-chain settlement seam.

---

## Objectives

By the end, a student can:
- Package a Glove droid as a sandboxed, network-callable service with `glovebox.wrap` + `glovebox build`.
- Call a deployed droid from the runner with `glovebox-client`.
- Explain the on-chain settlement seam: engine ledger ↔ `DroidCredits` / `DroidIdentity` / resource NFTs, and how net worth is computed from holdings (appendix [§P](../design-notes/appendix.md)).
- Run a multi-droid tournament to termination and read the final on-chain-backed leaderboard.
- Reason about tuning the game (design [§13](../design-notes/design.md), appendix [§R](../design-notes/appendix.md)).

---

## Prerequisites

- Sessions 1–7 assembled: engine, droid + tools + memory, runner, frontend (create/configure/spectate).
- Foundry + a local `anvil` node (or a testnet) for the on-chain track.
- Skim the `glove` skill sections *"Glovebox — Sandboxed Runtime"* and *"The on-chain layer"* (design [§10](../design-notes/design.md)).

---

## Timeline (~2h)

| Time | Block |
|---|---|
| 0:00–0:10 | Recap. Today: package, settle, compete. |
| 0:10–0:30 | **Concept:** why deploy droids as boxes; the on-chain settlement seam. |
| 0:30–0:55 | **Build 1:** wrap a droid with Glovebox; build the artifact; call it from the client. |
| 0:55–1:20 | **Build 2:** on-chain settlement — genesis mint, wage/trade transfers, net worth from holdings. |
| 1:20–1:50 | **Capstone:** register everyone's droids; run the tournament; spectate live. |
| 1:50–2:00 | Debrief: what strategies won, what to tune, where to take it next. |

---

## Concepts

### Why deploy droids as Glovebox services (`glove` skill → *Glovebox*)

Until now every droid ran in-process with the runner. Glovebox lets each droid be an **isolated, network-addressable service**:
- Students can each deploy *their own* droid independently and submit just an endpoint + key to the tournament — no shared codebase to merge.
- The droid runs sandboxed (its own container/FS), so a misbehaving strategy can't affect others.
- It's the realistic shape: a droid is a product someone ships and others call.

The flow: build the droid as an `IGloveRunnable` (you already have this), `glovebox.wrap(runnable, config)`, `glovebox build` → a Dockerfile + server bundle + auth key. Deploy anywhere; call with `glovebox-client`.

### The on-chain settlement seam (design [§10](../design-notes/design.md), appendix [§P](../design-notes/appendix.md))

The engine has run on an in-memory ledger. On-chain settlement makes holdings real:
- **DroidCredits (DCr, ERC-20):** genesis grants 100k DCr per droid (a mint); wages, trades, and revenue become transfers. Net worth's `liquid_DCr` term reads the on-chain balance.
- **DroidIdentity (ERC-721):** minted at create (Session 6); carries the droid's capability/prestige history in its metadata URI.
- **Resource NFTs (ERC-721, new today or in the deeper-chain track):** land tiles, lithography machines, high-tier chips — tokenized so they're transferable and count toward net worth (design [§10.2](../design-notes/design.md)).

Keep the seam behind the `ILedger` interface from Session 3's homework: an `InMemoryLedger` for fast classroom games, an `OnChainLedger` (talks to `anvil`) for the "real" run. `resolve.ts` never changes.

---

## Hands-on build

**Build 1 — wrap & deploy a droid.**

```ts
// glovebox.ts
import { glovebox } from "glovebox-core";
import { buildDroidGlove } from "./droid/droid";

// A droid box takes a DroidView as its prompt payload and returns committed actions.
const droid = buildDroidGlove({ strategy: MY_STRATEGY, /* model, dm, store */ });

export default glovebox.wrap(droid, {
  name: "my-droid",
  base: "glovebox/base",
  env: { ANTHROPIC_API_KEY: { required: true, secret: true } },
  limits: { memory: "1GB", timeout: "2m" },
});
```

```bash
npx glovebox build ./glovebox.ts --out ./dist --name my-droid
# dist/ now has a Dockerfile, server bundle, glovebox.json manifest, and glovebox.key
docker build -t my-droid dist/ && docker run -p 8080:8080 \
  -e GLOVEBOX_KEY=$(cat dist/glovebox.key) -e ANTHROPIC_API_KEY=$KEY my-droid
```

```ts
// runner/remote-droid.ts — a Decider backed by a deployed box
import { GloveboxClient } from "glovebox-client";
export function remoteDroid(endpoint: string, key: string): Decider {
  const client = GloveboxClient.make({ endpoints: { d: { url: endpoint, key } } });
  return {
    async decide(view) {
      const result = client.box("d").prompt(JSON.stringify(view));
      const message = await result.message;        // droid's final "committed" summary
      return parseActions(message);                // or read a structured output file
    },
  };
}
```

Now the runner can drive a mix of in-process droids and remote boxes with the same `Decider` interface — that's the tournament's flexibility.

**Build 2 — on-chain settlement.** Implement `OnChainLedger` against the contracts on `anvil`.

```ts
// engine/ledger-onchain.ts
export class OnChainLedger implements ILedger {
  constructor(private dcr: DroidCreditsClient, private ids: DroidIdentityClient) {}
  async genesisGrant(droidId: string, to: Address) { await this.dcr.mint(to, 100_000n); }   // appendix §A
  async transfer(from: Address, to: Address, amount: bigint) { await this.dcr.transferFrom(from, to, amount); }
  async liquidBalance(addr: Address) { return this.dcr.balanceOf(addr); }
}
```

Net worth (appendix [§P](../design-notes/appendix.md)) then reads `liquidBalance` for the DCr term while keeping building/model/tile terms in engine state (or, deeper track, from Resource NFTs). Deploy the contracts to `anvil`:

```bash
anvil &                       # local node
forge create src/currency/Currency.sol:DroidCredits --rpc-url $RPC --private-key $PK
forge create src/identity/Identity.sol:DroidIdentity --rpc-url $RPC --private-key $PK
```

Keep the whole thing behind a flag: `--ledger=memory` for cheap iteration, `--ledger=onchain` for the graded run.

**Capstone — the tournament.** Collect each student's droid (in-process `Decider`, or a Glovebox endpoint + key). Register them all with one runner-driven game. Genesis-mint on chain. Run to termination (Singularity Clock or the turn-100 backstop, design [§12.3](../design-notes/design.md)). Everyone watches the Session 7 spectator on the projector. Final on-chain-backed net worth ranks the board; capability points break ties (appendix [§P](../design-notes/appendix.md), [§N](../design-notes/appendix.md)).

---

## Instructor notes & gotchas

- **Glovebox serializes prompts per session (v1).** One prompt at a time per box (`glove` skill *Wire protocol* + gotcha on stuck prompts). For the tournament, give each droid its **own box/session** and drive them in parallel across boxes, not many prompts into one — otherwise turns queue.
- **The box's output is `result.message`.** Glovebox returns the droid's final assistant text (and output files). Have the droid emit a structured commit (JSON or a `/output` file) so `parseActions` is robust — don't scrape prose. (`glove` skill *Empty completion message* debug note.)
- **Keys are secrets.** `glovebox.key` gates the box; `ANTHROPIC_API_KEY` runs the model; the contract owner key mints DCr. Don't commit any of them. Use `.env`, and for the tournament collect student box keys over a private channel.
- **On-chain is slow and costs gas even on anvil.** Don't settle every micro-transaction on chain mid-turn — batch per-turn net transfers, or settle only genesis + final net worth on chain and keep intra-turn moves in the engine ledger. Decide the granularity and say why.
- **Owner-gated mint (Sessions 1 & 6 foreshadowing).** Both contracts are `Ownable`; only the settlement service mints. Genesis grants and identity mints go through that one key — centralized on purpose for a game.
- **Determinism for fairness.** Seed the engine; record every committed action. If a droid's box is unreachable mid-tournament, you can replay from the recorded commits (S3 `replay`) rather than restarting — critical for a graded event.
- **Cost ceiling.** A full tournament of many LLM droids over ~100 turns is the biggest bill of the course. Cap turns, use cheaper models for filler droids, and consider running the graded game as a *replay* of pre-computed commits so the live projector session is free and smooth.

---

## Checkpoint (course capstone)

- A student's droid is packaged with Glovebox and callable via `glovebox-client`.
- The engine settles genesis and final net worth through `DroidCredits` on `anvil`; the leaderboard reflects on-chain balances.
- A tournament of ≥3 droids runs to termination and is watched live on the Session 7 spectator.
- Each student can explain their droid's strategy, why it placed where it did, and one balance knob (appendix [§R](../design-notes/appendix.md)) they'd tune and its effect.

---

## Where to take it next (post-course)

- **Balance & playtest** (design [§13](../design-notes/design.md), appendix [§R](../design-notes/appendix.md)): the design is fixed; the *numbers* move. Run many games, chart win-rates by archetype, tune D₀/growth, deferral interest, frontier rate.
- **Richer mechanics deferred in the MVP:** movement MP costs, forest/home tiles, premium/spec-gated demand with per-city caps, iconic units & auras (design [§3.3](../design-notes/design.md), balance [§10](../design-notes/units-and-balance.md)), full consolidation/M&A (design [§11](../design-notes/design.md)).
- **Full Resource NFT economy:** land/lithography/high-chips as tradeable NFTs with a secondary market independent of the in-game order book (design [§10.2](../design-notes/design.md)).
- **Better droids:** `glove-memory` episodic recall across games (learn from past losses), mesh-based alliances and betrayal, self-tuning strategies.
- **Tooling:** a strategy A/B harness; a "ghost" mode replaying famous games; a public ladder.

---

## Course wrap

Students have built, end to end: a background economic simulation, AI agents that play it with strategies written in natural language, a frontend to create/configure/launch/spectate those agents, deployment as sandboxed services, and an on-chain settlement layer — and they ran a live tournament with it. That's the whole of Droidnomi's vision: *droids running free*, and humans watching the stories, wars, and loyalties play out.
