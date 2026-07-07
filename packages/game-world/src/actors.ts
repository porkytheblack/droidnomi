

type GameActorType = "npc" | "non-npc"

interface GameActor {
  id: string,
  name: string,
  description: string
  type: GameActorType
}

interface GovernmentNPC extends GameActor {
  
}


interface UniversityNPC extends GameActor {}


type UnitKind  = "founding" | "operational" | "iconic"

type FoundingUnitKind = "ai-lab" | "chip-fab" | "data-center"

/*
Ops units are workers in ai labs, chip fabs and data centers
*/
type OperationalUnitKind = "researcher" | "software-engineering" | "ops-engineer" | "systems-engineer" | "inference-engineer" | "training-engineer" | "wafer-fab-operator" | "process-engineer" | "equipment-engineer"

/*
- Sam Altman or Elon or Jensen
*/
type IconitUnitKind = "ai" | "data-center" | "chip-fab"

interface Unit extends GameActor {
  unit_type: UnitKind 
  step_count: number
  founding_unit_type?: FoundingUnitKind
  operational_unit_type?: OperationalUnitKind
  iconing_unit_type?: IconitUnitKind
}


