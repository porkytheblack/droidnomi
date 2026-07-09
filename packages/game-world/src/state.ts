import { GameActor } from "./actors.js";
import { GameResource } from "./entities.js";
import { Player } from "./player.js";


export interface State {
  players: Array<Player>,
  resources: Array<GameResource>,
  actors: Array<GameActor>
}
