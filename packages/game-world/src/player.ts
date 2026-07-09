import { State } from "./state.js"


export interface TurnDecision {
  // TODO:
}
// TODO: pass in game state and come up with a final decision
type PlayTurnFn = (state: State) => TurnDecision


export interface Player {
  id: string,
  play: PlayTurnFn
}
