

export type GameActorType = "npc" | "non-npc"

export interface GameActor {
  id: string,
  name: string,
  description: string
  type: GameActorType
}

export interface GovernmentNPC extends GameActor {
  
}


export interface UniversityNPC extends GameActor {}





