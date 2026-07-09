
type ConsumeFn = () => void

export interface GameResource {
  id: string
  name: string
  description: string,
  consume: ConsumeFn
}


export type TileKind = "bear-land" | "water" | "city" | "government"


export interface Tile extends GameResource {
  kind: TileKind
  // TODO: may need to revisit pricing and use float market price
  price: number
}


export type DevelopmentKind = "ai-lab" | "chip-fab" | "data-center"

export interface Development extends GameResource {
  kind: DevelopmentKind
  // the price for building the development
  price: number
}



export interface Model extends GameResource {
  // model level from 1 - 10
  level: number  
}


export type UnitKind  = "founding" | "operational" | "iconic"

export type FoundingUnitKind = "ai-lab" | "chip-fab" | "data-center"

/*
Ops units are workers in ai labs, chip fabs and data centers
*/
export type OperationalUnitKind = "researcher" | "software-engineering" | "ops-engineer" | "systems-engineer" | "inference-engineer" | "training-engineer" | "wafer-fab-operator" | "process-engineer" | "equipment-engineer"

/*
- Sam Altman or Elon or Jensen
*/
export type IconitUnitKind = "ai" | "data-center" | "chip-fab"

export interface Unit extends GameResource {
  unit_type: UnitKind 
  step_count: number
  founding_unit_type?: FoundingUnitKind
  operational_unit_type?: OperationalUnitKind
  iconing_unit_type?: IconitUnitKind
}

