# Droidnomi — Implementation Appendix (v0.2)

Non-narrative reference. Every constant, enum, and formula. All values are v0.2 calibration. Currency = Droid Credits (DCr). Companion to `droidnomi-design.md` (concepts) and `droidnomi-units-and-balance.md` (rationale).

---

## A. Global constants

| Key | Value |
|---|---|
| Starting capital | 100,000 DCr |
| Genesis free relocation | up to 3 tiles |
| Genesis founding unit | player choice: AI researcher \| chip researcher \| DC builder |
| Tax-free tiles | first 5 owned |
| Tile acquisition / turn | 1–2 |
| Power market price | 100 DCr / unit |
| Water market price | 50 DCr / unit |
| Compute rental (spot) | 80 DCr / CU / turn |
| Chip anchor (low) | 5,000 DCr |
| Singularity countdown | 8 turns |
| Game hard-end backstop | turn 100 |
| Fiscal period (tax carry-forward) | 4 turns |

---

## B. Enums

| Enum | Values |
|---|---|
| TileType | bare, forest, home, water |
| UnitClass | founding, operational, iconic |
| FoundingUnit | ai_researcher, chip_researcher, dc_builder |
| OperationalUnit | worker, maintenance_crew |
| BuildingType | ai_lab, chip_fab, data_center, power_plant |
| DataCenterMode | training, inference |
| PowerType | solar, coal, hydro, nuclear |
| ChipTier | low, medium, high |
| ModelLevel | M1, M2, M3, M4, M5, M6 |
| BuildingStatus | active, deferred, dormant, for_sale |
| Seniority | junior, senior |
| DemandClass | commodity, premium |
| MarketType | building, consumer |

---

## C. Units

| Unit | Class | Move (MP) | Founds | Wage junior | Wage senior | Senior output |
|---|---|---|---|---|---|---|
| ai_researcher | founding | 3 | ai_lab | 500 | 1,200 | ~2× RC & graduation |
| chip_researcher | founding | 3 | chip_fab | 450 | 1,000 | ~2× fab yield |
| dc_builder | founding | 2 | data_center | 400 | 900 | faster builds, ↑CU eff. |
| worker | operational | 2 | — | 200 | 400 | ~1.5× |
| maintenance_crew | operational | 2 | — | 200 | 400 | ~1.5× |
| iconic | iconic | 4 | — | retainer (see N) | — | aura only |

- Iconic redeploy: 1 free teleport to any owned building every 10 turns.
- Recruit-in-transit move = 3 MP (or pay premium for instant placement).
- Founding unit is **consumed** on found completion.
- Effective wage = base_wage × (1 + 0.02 × board_hire_pressure).
- Unpaid operational unit → leaves next turn.

---

## D. Movement / terrain entry cost

| Tile | MP to enter |
|---|---|
| bare | 1 |
| home | 1 |
| forest | 2 |
| water | impassable (bridge upgrade → 3) |
| inside own influence | ×0.5 multiplier |

---

## E. Buildings

| Building | Build cost | Build turns | Facility/turn | Graduates | Cadence | Power draw | Water draw |
|---|---|---|---|---|---|---|---|
| ai_lab L1 | 20,000 | 2 | 400 | ai_researcher | 4 turns | 5 | 0 |
| ai_lab L2 | +25,000 | 2 | 700 | ai_researcher | 3 turns | 5 | 0 |
| ai_lab L3 | +40,000 | 3 | 1,100 | ai_researcher | 2 turns | 5 | 0 |
| chip_fab | 35,000 | 3 | 900 | chip_researcher | 5 turns | 40 | 5 |
| data_center | 25,000 | 3 | 700 | dc_builder | 6 turns | 1 / 2 CU | 1 / 4 CU |
| power_plant solar | 15,000 | 2 | 300 | — | — | — | 0 |
| power_plant coal | 20,000 | 2 | 700 | — | — | — | 0 |
| power_plant hydro | 30,000 | 3 | 400 | — | — | — | (water tile) |
| power_plant nuclear | 80,000 | 5 | 1,500 + license | — | — | — | cooling |

Power plant output (power/turn): solar 20, coal 60, hydro 40, nuclear 200.

Building per-turn cost stack = facility + salaries + utilities + maintenance + activity (see F–H, L, O).
Graduation fires only if building is `active` and all its per-turn costs are paid that turn.

---

## F. Chips → compute

| Tier | CU/turn | Price | Failure/turn |
|---|---|---|---|
| low | 1 | 5,000 | 3% |
| medium | 4 | 18,000 | 4% |
| high | 16 | 60,000 | 6% |

- Under-cooled data center: failure ×2, CU throttled.
- Internal compute cost ≈ 50 DCr / CU / turn. Rental spot = 80 DCr / CU / turn.

---

## G. Research

| Lab level | RC/turn (2 researchers) |
|---|---|
| L1 | 20 |
| L2 | 50 |
| L3 | 120 |

| Breakthrough | RC cost |
|---|---|
| M1 | 100 |
| M2 | 300 |
| M3 | 800 |
| M4 | 2,000 |
| M5 | 5,000 |
| M6 | 12,000 |

Senior researcher ≈ ×2 RC contribution. Breakthroughs are one-time unlocks; first-to-level → +50 PP + capability point.

---

## H. Training

| Level | CU·turns required |
|---|---|
| M1 | 20 |
| M2 | 80 |
| M3 | 400 |
| M4 | 1,500 |
| M5 | 5,000 |
| M6 | 20,000 |

- training_turns = ceil(required_CU_turns / allocated_CU)
- training_cost/turn = 50 × allocated_CU + 500
- Overtraining (extra CU·turns beyond required) raises benchmark within band.

---

## I. Model spec sheet

| Level | Benchmark band | Context |
|---|---|---|
| M1 | 20–35 | 4K |
| M2 | 35–50 | 16K |
| M3 | 50–68 | 64K |
| M4 | 68–82 | 200K |
| M5 | 82–92 | 500K |
| M6 | 92–100 | 1M+ |

Stat sources:
- benchmark = band_base(level) + chip_tier_bonus + overtraining_bonus
- token_gen_speed → set by inference CU allocated at deploy
- prompt_speed → inference CU + chip tier
- context → level base, extendable with extra training-data investment
- price_per_Mtok → player-set each turn (capped by market via pricing_multiplier)

---

## J. Inference & intelligence

- IU/turn = allocated_inference_CU × 10 × speed_factor
- speed_factor ∈ [0.8, 1.5] from model token_gen_speed
- IU marginal cost = 0.2 DCr / IU
- Per-city ingestion cap = f(population); excess IU unsold.

---

## K. Demand & pricing

- D(t) = 2,000 × 1.05^t  (total market IU/turn; t = turn index)
- Order = { volume, min_context, min_benchmark, max_latency, max_price }
- Eligibility: model meets all min/max spec floors
- Fill order: eligible models by price ascending, tiebreak latency then reputation
- Commodity price band: 2–3 DCr / IU
- Premium price band: 10–50 DCr / IU (requires benchmark floor)
- effective_price = base_price × pricing_multiplier (see L)

---

## L. Degradation

**Buildings**
- depreciation = 1.5% / turn (declining balance), floor 30% of build cost
- maintenance to hold baseline = 2% of build cost / turn (requires crew)
- neglect (unpaid/uncrewed) = +5% / turn decay, output = 0, fails ~15–20 turns
- dormant salvage value = 40% of depreciated value

**Chips**
- failure/turn per tier (F); under-cooled ×2

**Model obsolescence**
- frontier_benchmark B_f rises ≈ +1 / turn (faster if multiple droids race)
- pricing_multiplier = clamp(1 + (model_benchmark − B_f) / 20, 0.2, 3.0)

**Units**
- unpaid operational unit → leaves next turn
- dormant building furlough grace = 5 turns, then units leave 1/turn

---

## M. Deferral / default / distressed

| Key | Value |
|---|---|
| Deferrable | facility cost only |
| Deferral interest | 5% / turn (compounding) |
| Deferral cap | 50% of building asset value |
| Deferral deadline | 15 turns |
| Profit auto-sweep to debt | 50% of net profit / turn (highest-interest first) |
| Default triggers | cap breached OR deadline hit OR salaries/utilities unpayable |
| Dormant effects | production 0, wages paused, still depreciates + land tax |
| Restart cost | 25% of build cost (+ bring debt under cap) |
| Distressed sale discount | 40–70% below assessed value |
| Sale settlement | outstanding debt paid from proceeds first |
| Buyer on acquire | skips build cost + build time; pays restart cost; must staff |

---

## N. Iconic units & Prestige

| PP source | PP |
|---|---|
| First-to-model-level | +50 |
| Breakthrough (self) | +10 |
| Frontier model deployed (at B_f) | +15 |
| Top-revenue turn on board | +5 |
| Trigger Singularity Clock | +200 |

- PP per iconic draft = 100
- Tenure = 20 turns; re-sign cost = 5,000 × (times_resigned + 1)
- Aura radius = 3 hexes (unless noted)

| Archetype | Effect |
|---|---|
| Frontier Evangelist | +25% recruit interest, +5% research |
| Safety Researcher | unlocks govt/regulated premium contracts, +license goodwill, +2 benchmark ceiling |
| Hardware Maverick | −20% chip cost OR +25% fab output; found fabs on any owned tile |
| Capital Allocator | +15% trade efficiency, opens credit line |

---

## O. Tax & licenses

| Item | Value |
|---|---|
| Corporate tax | 15% of net profit/turn (only if positive) |
| Loss carry-forward | 1 fiscal period (4 turns) |
| Land tax | 100 DCr/turn per tile beyond first 5 |
| Nuclear license | 2,000 DCr/turn |
| Frontier-model (M4+) license | 1,500 DCr/turn |
| No license | activity blocked; illegal operation risks fine/seizure |

---

## P. Net worth

```
NW = liquid_DCr
   + Σ chip_inventory (market_value × condition)
   + Σ building_assessed_value        # dormant → salvage (40% of depreciated)
   + Σ tile_value (base × type_mult × influence_weight)
   + Σ model_IP_value
   + prestige_bonus
   − Σ deferred_and_distressed_debt   # incl. accrued interest

model_IP_value = cumulative_revenue × 0.5
               + benchmark_tier_bonus × current_pricing_multiplier
```

Win = highest NW at termination. Tiebreak = capability points.

---

## Q. Termination — Singularity Clock

```
on first M6 deploy:
    grant trigger droid +200 PP + capability bonus
    start countdown = 8 turns
    during countdown: demand_spike ON, asset_price_volatility ON
at countdown == 0  (or turn == 100 if no M6):
    tally NW for all droids
    rank by NW desc, tiebreak capability_points desc
```

---

## R. Primary tuning knobs

| Knob | Default | Governs |
|---|---|---|
| D₀ / growth | 2,000 / 1.05^t | operator vs. builder favor; market ceiling |
| Deferral interest | 5%/turn | leverage viability (vs. demand growth) |
| Frontier rate | +1/turn | obsolescence pressure, retrain cadence |
| Training CU·turns + burn | table H / 50/CU | frontier-bet punishment |
| Graduation cadence | 4/5/6 turns | expansion/compounding speed |
| Singularity countdown | 8 | endgame drama window |
| PP per iconic / thresholds | 100 | iconic frequency |
| Corporate tax | 15% | government drag on snowballing |