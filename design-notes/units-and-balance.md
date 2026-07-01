# Droidnomi — Units, Rates & Balance (v0.1)

> Companion to the design doc. Extends §5 (Producers) and §6 (Models) with the **unit system** and a full set of **starting numbers**. Every value here is a v0.1 calibration point, not a law — they're chosen to be internally consistent and to produce the intended pacing, and expected to move in playtest. All currency is **Droid Credits (DCr)**.

**Anchors everything is derived from:** 1 low-performance chip = **5,000 DCr**; ~**4,000 DCr** of chips builds a basic unit; starting capital = **100,000 DCr** (≈ 20 low chips).

---

## 1. Units: the new mental model

A Droid doesn't own a single headquarters. A Droid owns **units**, and units found and staff buildings. Buildings, in turn, graduate more units. The whole map presence is an expanding mesh you seed and steer — how far and how fast it spreads is set by movement and graduation rates.

### 1.1 Founding units
Founding units are the seeds. A founding unit walks to a tile, spends a **found action**, and is **consumed** — it becomes the founding staff of the new building. Types map to what they found:

| Founding unit | Founds | Produced by |
|---|---|---|
| AI researcher | AI Lab | any AI Lab you own |
| Chip researcher | Chip Fab | any Chip Fab you own |
| DataCenter builder | Data Center (training or inference) | any Data Center you own |

Because *any* owned building of a type can graduate that type, expansion compounds: 1 lab → more researchers → more labs → more researchers. Capital is the brake (each new building costs DCr + land + ongoing upkeep), so it grows fast when funded and stalls when you're broke — never runaway.

### 1.2 Operational units
Not everything is a founder. Buildings need **workers / maintenance crews** to run (staff a fab line, keep a data center cooled, run a power plant). These are recruited, not consumed, and they leave if unpaid (§9.4).

### 1.3 Iconic units
Rare, named legends (evoking real industry figures — the Altman/Amodei/Musk archetypes). You don't build them; you **earn** them via Prestige Points (§8). They don't do physical work — they radiate an **aura** that buffs everything around them and boost your score. They have a tenure and eventually depart unless re-signed.

---

## 2. Movement (the number you asked for)

Movement is in **movement points (MP) per turn**. Each tile costs MP to enter based on its terrain. A unit spends MP until it can't afford the next tile.

### 2.1 MP per turn by unit
| Unit | MP / turn | Rationale |
|---|---|---|
| AI researcher | **3** | Light knowledge worker, highly mobile |
| Chip researcher | **3** | Same class |
| DataCenter builder | **2** | Hauls racks/equipment; slower |
| Worker / crew | **2** | Ground staff |
| Iconic unit | **4** | Flown around; plus 1 free **redeploy** (teleport to any owned building) every 10 turns |
| Recruit in transit (from university) | **3** | Or pay a relocation premium to place instantly |

### 2.2 Tile entry cost
| Tile | MP to enter |
|---|---|
| Bare | 1 |
| Home / city-edge | 1 |
| Forest | 2 (rough) |
| Water | **impassable** to land units (path around, or build a bridge upgrade → 3) |
| **Inside your own influence** | **×0.5** (your infrastructure is fast) |

Worked reach, so the numbers are legible:
- An **AI researcher** (3 MP) covers 3 bare tiles, or 1 bare + 1 forest (1+2), or **6 tiles inside your own territory** (0.5 each).
- A **DC builder** (2 MP) covers 2 bare, or 1 forest, or 4 tiles inside territory.

The ×0.5 influence discount is deliberate: contiguous territory makes your whole network faster, so grabbing tiles isn't just resource control, it's logistics. Fast researchers let you *reach out* to snag distant water/university/uranium tiles; slow builders keep data centers *close to home*.

### 2.3 The found action
To found, a unit must **end its turn on a buildable tile you own or can claim**, then spend a found action next turn. Construction then runs on a timer (§4), during which the unit is locked in and consumed on completion.

---

## 3. Turn scale & starting position

- **Turn 0 (genesis):** each Droid gets **100,000 DCr** and **chooses one free founding unit** — an AI researcher (opens a Lab), a chip researcher (opens a Fab), or a DataCenter builder (opens a Cloud). This is the opening pick (design doc §3.4). Free 3-tile relocation available (design doc §2).
- **Target game length:** ~60–100 turns, ended by the Singularity Clock (§11).
- **Base per-turn burn** on a starting lab is ~2,300–2,500 DCr once every cost line is counted (facility 400 + 2 junior researchers 1,000 + power 500 + maintenance ~400), not just facility+wages — see §4.5 for the full model. Starting cash gives ~**20-turn runway** at zero revenue, so reaching a saleable product early is not optional.

---

## 4. Producers: costs, upkeep, build time, graduation

| Building | Build cost (DCr) | Build time (turns) | **Facility / turn** | Graduates | Every |
|---|---|---|---|---|---|
| AI Lab L1 | 20,000 | 2 | 400 | AI researcher | 4 turns |
| AI Lab L2 | +25,000 upgrade | 2 | 700 | AI researcher | 3 turns |
| AI Lab L3 | +40,000 upgrade | 3 | 1,100 | AI researcher | 2 turns |
| Chip Fab | 35,000 | 3 | 900 | chip researcher | 5 turns |
| Data Center (shell) | 25,000 | 3 | 700 | DC builder | 6 turns |
| Power Plant — Solar | 15,000 | 2 | 300 | — | — |
| Power Plant — Coal | 20,000 | 2 | 700 (fuel) | — | — |
| Power Plant — Hydro | 30,000 | 3 | 400 | — | — |
| Power Plant — Nuclear | 80,000 | 5 | 1,500 + license | — | — |

The **Facility / turn** column is *only* the fixed cost of keeping the building open — rent, base admin, license amortization. It is **not** the full cost of running the building. Salaries, utilities, maintenance, and tax are separate recurring lines, all detailed in §4.5. Graduation only fires when the building is **staffed and all its per-turn costs are paid**. Skip them and graduation pauses and decay starts (§9.1).

---

## 4.5 Operating costs & cash flow

Founding a building is the *cheap* part. The moment it exists it becomes a **per-turn liability** across five separate lines. This is the real pressure in the game: capital gets you started, but **cash flow is what keeps you alive**, and every new building you found accelerates your burn until its own output covers it.

Total per-turn cost of a building =
**Facility overhead + Salaries + Utilities + Maintenance + Activity surcharge**, and then **Tax** is levied on the Droid's net profit across everything.

### 4.5.1 Salaries (headcount-driven)
Every unit assigned to a building draws a wage every turn — the single largest recurring cost for a research-heavy Droid. Wages depend on unit type *and* seniority. You choose seniority at recruit time: junior talent is cheap but produces at base rate; senior talent costs ~2.5× the wage but roughly **doubles output** (research rate, graduation speed, benchmark contribution).

| Unit | Junior wage / turn | Senior wage / turn | Senior output |
|---|---|---|---|
| AI researcher | 500 | 1,200 | ~2× RC & graduation |
| Chip researcher | 450 | 1,000 | ~2× fab yield |
| DataCenter builder | 400 | 900 | faster builds, higher CU efficiency |
| Worker / crew | 200 | 400 | ~1.5× |
| Iconic unit | retainer only — see §10 (5,000 × re-sign count) | | |

**The labor market moves.** Universities have finite senior talent, and every Droid is hiring from the same pool. The **wage index** rises with total active hires on the board:

**effective wage = base wage × (1 + 0.02 × board_hire_pressure)**

where `board_hire_pressure` scales with how many units everyone has recruited relative to available university seats. Early game labor is cheap; a late-game frontier race bids senior researchers up sharply. Two levers push back: the **Frontier Evangelist** iconic (§10) cuts your effective wage / raises join rate, and **owning university-adjacent tiles** gives you a local hiring discount.

### 4.5.2 Utilities (metered — this is where the power economy bites)
Buildings draw **power** (and data centers/fabs draw **water** for cooling) every turn. You either **buy on the market** or **self-generate** from your own plants — the classic build-vs-buy, now on the OPEX side.

| Building | Power draw / turn | Water draw / turn |
|---|---|---|
| AI Lab | 5 | 0 |
| Chip Fab | 40 | 5 |
| Data Center | 1 power per 2 active CU | 1 water per 4 active CU |

Market prices: **power ≈ 100 DCr / unit**, **water ≈ 50 DCr / unit**. So a bought-power AI Lab spends 500/turn on electricity alone; a 100-CU data center spends ~5,000/turn on power plus ~1,250 on water. That utility bill is exactly what a self-built solar farm (15k capex, 300 facility, ~20 power/turn) or an owned water tile (one-time acquisition, then free) is competing against. **Under-supply throttles** the building (CU drops) and, for cooling, doubles chip failure (§9.2).

### 4.5.3 Maintenance
Spend ~**2% of build cost per turn** to hold depreciation at the 1.5%/turn baseline. Skip it and **neglect decay** kicks in (+5%/turn, output stops) — a deferred-maintenance building fails in ~15–20 turns. Maintenance requires a crew unit assigned (whose salary is already counted above).

### 4.5.4 Activity surcharge (variable)
On top of idle running cost, *doing work* costs extra:
- **Training run:** +50 DCr per allocated CU per turn + 500 overhead (already in §7.1) — this is why a builder's frontier bet bleeds.
- **Inference serving:** ~0.2 DCr marginal cost per IU produced (the "cost of goods sold" on intelligence).

### 4.5.5 Tax (government's cut)
The government NPC monetizes you three ways:
- **Corporate tax: 15%** of net profit, settled each turn (only when profit is positive — losses aren't taxed but can carry forward one fiscal period of 4 turns).
- **Land tax: 100 DCr / turn** per owned tile beyond your first **5** free tiles — a soft cap on land-hoarding.
- **License fees:** nuclear operating license **2,000/turn**; frontier-model (M4+) operating license **1,500/turn**. No license → can't run the activity, or run it illegally and risk a government fine/seizure event.

### 4.5.6 Worked per-turn P&L — the operator at T9 (M1 just deployed)
This is the number that makes the runway real. One L1 lab + one small inference DC, 5 CU each, buying power:

| Line | DCr / turn |
|---|---|
| **Revenue** — 500 IU × 2.5 | **+1,250** |
| Lab facility | −400 |
| 2 junior AI researchers | −1,000 |
| Lab power (5 × 100) | −500 |
| Inference DC facility | −700 |
| 1 junior crew | −200 |
| Inference power (~3 units) | −300 |
| Inference water/cooling | −150 |
| IU marginal (500 × 0.2) | −100 |
| Maintenance (~2% of 45k) | −900 |
| **Net (pre-tax)** | **−3,000** |

So the operator is still burning **~3,000/turn** *after* first revenue — no tax owed because there's no profit. Break-even doesn't arrive from launching M1; it arrives from **scaling IU into the growing demand curve**: at ~3,000 IU/turn (or a jump to premium pricing) revenue crosses ~7–8k and clears the stack. With 1.05ᵗ demand growth plus added inference CU, that's realistically **~turn 20–24** for a disciplined operator — a touch later than the pre-OPEX estimate, which is correct: operating costs *should* push break-even out.

### 4.5.7 Design consequence: marginal revenue must beat marginal OPEX
The rule the whole game turns on: **every new building must earn more than it costs to run, or it accelerates your bankruptcy.** A second lab is +~2,000/turn in salary+facility+power before it produces a single RC. A fab is a ~3,000/turn hole until its chips sell or feed your own training. This is the discipline that stops "found everything" from being a strategy and makes the builder's negative-cash-flow gamble a genuine gamble — they're carrying a stack of liabilities on the bet that a frontier model's 3× pricing (§9.3) clears all of it at once.

---

## 4.6 Deferral, default & distressed assets

The runway pressure above is real but shouldn't be an instant guillotine — a pre-revenue Droid needs room to *reach* revenue. So facility cost is **deferrable**, default is a **dormancy** state rather than death, and defaulted buildings become **tradeable distressed assets**. This turns the failure mode from "you lose" into "you get consolidated," and opens a whole predatory-M&A layer of play.

### 4.6.1 Deferral (bridge financing)
Any building can be flagged **Deferred**. While deferred:
- Its **facility cost is not paid in cash** — it accrues to a **deferred balance** instead.
- The deferred balance compounds **interest at 5% / turn** (debt is expensive on purpose).
- The building **keeps producing normally** — that's the whole point: you defer so you can reach the revenue that pays it back.
- The building is publicly flagged **distressed** — every other player can see it (this is what makes it a target, §4.6.3).

**Auto-sweep — "delayed until you start making returns":** once the Droid turns net-profitable, **50% of net profit each turn is automatically swept** to pay down deferred balances (highest-interest first) until they clear. So in the intended happy path you defer while building, then the moment intelligence revenue lands the debt drains itself. Deferral is bridge financing against future returns, exactly as intended.

Two guardrails stop it from being free money:
- **Cap:** if a building's deferred balance reaches **50% of its current asset value**, it can't defer further — the next unpaid turn triggers default.
- **Deadline:** a building may stay deferred for at most **15 turns**. Hit the deadline without clearing → default.

Salaries and metered utilities are **not** deferrable — units leave if unpaid (§9.4) and power gets cut if the bill isn't. Deferral covers facility overhead only; to cut salary you must furlough units (which drops output).

### 4.6.2 Default → dormancy
A building **defaults** when it breaches the cap, misses the deadline, or the Droid simply can't cover its salaries/utilities that turn. On default the building goes **dormant**:
- **Units stop producing** — no graduation, no RC / chips / IU / research. The building contributes nothing.
- Units are **furloughed** — no wages paid, but after **5 dormant turns** they start leaving (1 unit/turn). Long dormancy hollows a building out.
- The building **keeps depreciating** (§9.1) and still owes **land tax** — dormancy is not free storage.
- The **deferred debt stays on your books** and keeps accruing interest until settled.

### 4.6.3 Reactivation vs. liquidation
A dormant building is a decision, not a corpse. Two exits:

**Restart it —** pay a fixed **restart cost = 25% of the building's build cost**, and bring the deferred balance back under the cap. Production resumes next turn; any units that already walked away must be re-recruited (and re-moved into range, §2).

**Sell it (distressed) —** list it on the **Building Market** (§9 of the design doc). Because it's dormant and indebted, it clears at a **distressed discount of 40–70%** below assessed value. On sale, the **outstanding deferred debt is settled first** out of the proceeds; you keep the remainder. Even when debt exceeds the sale price, offloading can be worth it — it wipes the liability and the land tax off your books.

### 4.6.4 The distressed-asset market (predatory M&A)
This is the strategic payoff. A cash-rich Droid can run a **vulture strategy**: sit disciplined and profitable, watch the public *distressed* flags, and **buy over-leveraged rivals' fabs, data centers, and in-progress training runs cheap** the moment they default. For the buyer:
- You **skip the original build cost and build time** — you get instant, discounted capacity.
- You pay the **restart cost** and must **staff it** (a unit in range, or a relocation cost — §2).
- You inherit any half-finished asset — a data center mid-training-run, a fab mid-yield.

So the game's failure state feeds directly back into the board: the operator who kept cash-flow discipline consolidates the builder who over-reached. It's thematically exact — the AI industry's real endgame is consolidation — and it gives the disciplined-operator archetype a genuine win condition beyond just surviving. Meanwhile it hands the builder a real instrument: **defer aggressively, race intelligence revenue against 5%/turn interest, and clear the debt via auto-sweep before you breach the cap.** Time it right and leverage wins; misjudge the demand curve and you become someone else's discounted data center.

### 4.6.5 Net-worth interaction
Deferred balances and any distressed debt **subtract from net worth** (added to §11). Dormant buildings are marked to **salvage value (40% of depreciated value)** until reactivated. So over-leverage is *visible* on the scoreboard the whole time — a builder deep in deferral is scoring low even while their frontier bet is still cooking, and only vaults up the board if the bet actually lands.

---

## 5. Research → breakthroughs

Labs drip **research credits (RC)** per turn; breakthroughs spend accumulated RC to *unlock the ability to train* a model level.

| Lab level | RC / turn (2 researchers) |
|---|---|
| L1 | 20 |
| L2 | 50 |
| L3 | 120 |

| Breakthrough | RC cost | Turns to unlock at 20 RC/turn (single L1 lab) |
|---|---|---|
| M1 | 100 | 5 |
| M2 | 300 | 15 (cumulative) |
| M3 | 800 | 40 (cumulative) |
| M4 | 2,000 | needs L2/L3 or multiple labs |
| M5 | 5,000 | multi-lab |
| M6 | 12,000 | endgame research effort |

Multiple labs and upgrades stack RC/turn, so a research-focused Droid collapses these timelines — that's a legitimate strategy (be first, bank Prestige Points).

---

## 6. Chips → compute (CU)

Compute is measured in **compute units (CU)**. Chip tiers give super-linear CU at sub-linear price — high chips are far more efficient per rack, but capital-heavy and they run hot (degrade faster, need more cooling).

| Chip | CU / turn | Market price (DCr) | Failure / turn |
|---|---|---|---|
| Low | 1 | 5,000 | 3% |
| Medium | 4 | 18,000 | 4% |
| High | 16 | 60,000 | 6% (×2 if under-cooled) |

**Compute rental (spot):** a data-center owner may host another Droid's workload for **~80 DCr per CU per turn** (a ~60% margin over the ~50 DCr/CU internal running cost). This is the landlord revenue behind the Cloud opening (design doc §3.4, §6.4) and gives compute a spot price independent of chips.

---

## 7. Training & the model spec sheet

### 7.1 Training cost
Training requires accumulating **CU·turns** (compute × turns). You choose how much compute to throw at it; more compute = fewer turns.

| Level | CU·turns required |
|---|---|
| M1 | 20 |
| M2 | 80 |
| M3 | 400 |
| M4 | 1,500 |
| M5 | 5,000 |
| M6 | 20,000 |

- **Training turns** = ⌈required ÷ allocated CU⌉.
- **Per-turn burn** = 50 DCr × allocated CU + 500 overhead (power, crew, depreciation).

Example: M3 needs 400 CU·turns. With **100 CU** (25 medium chips) → **4 turns**, burning ~5,500 DCr/turn = ~22,000 DCr total. With 40 CU → 10 turns. Big models are genuinely expensive and slow — the reason a builder goes cash-negative.

### 7.2 Spec sheet (generated from your inputs)
The five stats from design doc §7, and what sets them:

| Stat | Set by |
|---|---|
| Benchmark performance | model level (band) + chip tier used + overtraining (extra CU·turns) |
| Token generation speed | inference compute allocated at deploy |
| Prompt processing speed | inference compute + chip tier |
| Context length | model level, extendable with extra training-data investment |
| Price / M tokens | **you set it** — but benchmark sets the ceiling the market pays |

Benchmark bands (0–100) and context by level:

| Level | Benchmark band | Context |
|---|---|---|
| M1 | 20–35 | 4K |
| M2 | 35–50 | 16K |
| M3 | 50–68 | 64K |
| M4 | 68–82 | 200K |
| M5 | 82–92 | 500K |
| M6 | 92–100 | 1M+ |

Where you land in the band = chip quality + overtraining. Train M3 on high chips and overtrain → benchmark ~66; rush it on low chips → ~52.

---

## 8. Inference, intelligence & revenue

### 8.1 Producing intelligence units (IU)
Deploy a model on an inference data center:
- **IU / turn** = allocated inference CU × 10 × `speed_factor` (0.8–1.5, from the model's token-gen stat).
- Each city has an **ingestion cap** (population-scaled) — you can't dump unlimited IU into one city.

### 8.2 Demand curve
Total market demand grows as AI adoption rises:

**D(t) = D₀ × 1.05ᵗ**, with **D₀ = 2,000 IU/turn** at genesis.

So demand ~triples by turn 22 and ~10×s by turn 47. Late game is where the money is — another reason builders can wait.

### 8.3 Pricing
- **Commodity** demand (citizens, price-sensitive): base **2–3 DCr / IU**.
- **Premium** demand (enterprise/government, spec-gated): **10–50 DCr / IU**, but only fillable by models meeting a benchmark floor.
- **Price you can actually charge** = base × `pricing_multiplier` (§9.3, obsolescence).

Anchor: 500 IU/turn at 2.5 DCr = 1,250 DCr/turn from a tiny deployment; scale to 10,000 IU at premium and you're printing.

---

## 9. Degradation (four channels)

Decay is what forces continuous reinvestment and stops any single early lead from snowballing.

### 9.1 Buildings
- **Upkeep:** per §4. Pay it or the building pauses.
- **Depreciation:** asset value declines **1.5% / turn** (declining balance) toward a salvage floor of ~30% of build cost.
- **Neglect:** unpaid upkeep or no maintenance crew → **+5% / turn** decay and no output; a fully neglected building fails in ~15–20 turns.

### 9.2 Chips
- Failure rates per §6. A failed chip loses its CU. Expected life of a low chip ≈ 33 turns, but effective CU tapers before then.
- **Cooling matters:** under-cooled data centers double chip failure and throttle CU — this is where water tiles and cooling fans pay off.

### 9.3 Model obsolescence (the big one)
Your model's benchmark is fixed at training; the **market's frontier** keeps rising:

- **Frontier benchmark** `B_f(t)` rises ~**+1 / turn** in a competitive game (faster if several Droids race).
- **pricing_multiplier** = clamp( 1 + (your_benchmark − B_f) / 20 , **0.2**, **3.0** ).

So at or above frontier you charge up to **3×**; 20 points behind, you're floored at **0.2×** (pure commodity). A M3 at benchmark 60, launched when B_f = 55, opens at ~1.25× premium and slides to commodity in ~15 turns. Translation: **retrain or die.**

### 9.4 Unit attrition
- Workers/crews leave the **next turn** if wages go unpaid.
- Iconic units have a **20-turn tenure**; re-signing costs rise each time (§10).

---

## 10. Iconic units & Prestige

### 10.1 Earning them
Milestones grant **Prestige Points (PP)**:

| Event | PP |
|---|---|
| First on the board to a model level | +50 |
| Any breakthrough (you) | +10 |
| Frontier model deployed (at B_f) | +15 |
| High-revenue turn (top of board) | +5 |

Every **100 PP** → draft one iconic unit.

### 10.2 Archetypes (evoking the figures you named)
Effects are mechanical auras, not characterizations. Aura radius = 3 hexes unless noted.

| Archetype (inspiration) | Effect |
|---|---|
| **Frontier Evangelist** (Altman-type) | +25% recruit interest (units join faster/cheaper), +5% research |
| **Safety Researcher** (Amodei-type) | Unlocks regulated & government premium contracts, +license goodwill, +2 to benchmark ceiling |
| **Hardware Maverick** (Musk-type) | −20% chip cost *or* +25% fab output; can found fabs on any owned tile |
| **Capital Allocator** | +15% market trade efficiency, opens a credit line (borrow against net worth) |

While active, an iconic unit also grants **+flat capability points** each turn. Tenure 20 turns; re-sign cost = 5,000 × (times re-signed + 1).

---

## 11. Net worth & termination

### 11.1 Net worth (tallied at game end)
**NW =**
- liquid DCr
- + Σ chip inventory (market value × condition)
- + Σ building assessed value (build cost × depreciation factor) — **dormant buildings at salvage (40% of depreciated value)** per §4.6.5
- + Σ tile value (base × type multiplier × influence weight)
- + Σ **model IP value**
- + prestige/iconic bonus
- **− Σ deferred balances & distressed debt** (with accrued interest, §4.6)

**Model IP value** = (cumulative revenue × 0.5) + (benchmark_tier_bonus × current pricing_multiplier). A frontier model that's been earning is your single biggest asset; an obsolete one is nearly worthless — which is why timing the endgame matters.

Because debt subtracts in real time, a deeply-deferred builder **scores low the entire time their frontier bet is cooking**, and only vaults up the board if it lands. That's the leverage gamble made visible on the scoreboard.

### 11.2 The Singularity Clock (termination)
Primary trigger, not a fixed clock:

- The **first Droid to deploy an M6 model** starts an **8-turn countdown** and gets **+200 PP** plus a large capability bonus.
- During the countdown: **demand spikes** (everyone races to serve the surge) and **asset prices go volatile** — a final scramble to convert holdings into net worth.
- **Backstop:** if no M6 by **turn 100**, the game hard-ends there.
- At the end, highest **net worth** wins; **capability points** break ties.

This makes the endgame a real event: the leader who triggers it isn't guaranteed the win, because the 8 turns of chaos let operators cash out and rivals dump premium inventory into the demand spike.

---

## 12. Worked example — two viable paths through ~turn 30

**Operator (early revenue):**
- T0: 100k. Found Lab (20k) + 2 researchers (4k) + 5 low chips (25k). Cash ~51k, burn ~1.6k/turn.
- T1–5: 20 RC/turn → 100 → unlock **M1**.
- T5: train M1 (5 CU → 4 turns, ~750/turn).
- T6: found small inference DC (25k shell). Cash ~20k.
- T9: **M1 live** (benchmark ~28, 4K ctx). Deploy 5 CU → ~500 IU/turn, sell commodity @2.5 → ~1,250/turn. Still slightly negative, climbing.
- T10–18: lab graduates researchers (T4/8/12…), reinvest, push **M2** (~T15), scale chips, ride the growing demand curve. **Cash-flow positive ~T18–20.**

**Builder (frontier bet):**
- Skips early inference. Pours capital into a second lab + a fab + high chips.
- Runs **cash-negative until ~T30**, racing toward **M4** and its 68–82 benchmark band.
- Bets that premium pricing (up to 3×) on a frontier model, into a demand curve that's ~5× genesis by then, plus first-to-M4 PP → an iconic unit, compounds past the operators by endgame.

Both are rational. The operator has a floor; the builder has a ceiling. Which wins depends on how aggressively rivals push the frontier benchmark — i.e. on the obsolescence race in §9.3. That interaction is the game.

---

## 13. Tuning knobs (what to touch first in playtest)
- **D₀ and 1.05 growth** — sets whether operators or builders are favored.
- **Frontier +1/turn** — the master dial on obsolescence pressure and retrain cadence.
- **Training CU·turns & 50 DCr/CU burn** — sets how punishing frontier bets are.
- **Graduation rates** — set expansion/compounding speed.
- **Singularity countdown (8) & PP thresholds** — set endgame drama.