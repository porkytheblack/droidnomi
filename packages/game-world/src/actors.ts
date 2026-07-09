

export type GameActorKind = "npc" | "non-npc"

export interface GameActor {
  id: string,
  name: string,
  description: string
  kind: GameActorKind
}

export interface GovernmentNPC extends GameActor {
  
}


export interface UniversityNPC extends GameActor {}





