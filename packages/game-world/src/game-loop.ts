import { Player, TurnDecision } from "./player.js"
import { State } from "./state.js"



type RunFn = (state: State) => Array<TurnDecision> 

type RunTurn = (state: State) => boolean
export interface Game {
  currentTurn: number,
  players: Array<Player>
  turnDecisions: Map<number, Array<TurnDecision>>
  runPlayer: RunFn,
  runProduction: RunFn,
  runTurn: RunTurn
} 
