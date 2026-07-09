import { Game } from "./game-loop.js";
import { State } from "./state.js";


// main entrypoint of the game
export function main(game: Game, state: State) {
  let continueToNextTurn = true;
  
  while (continueToNextTurn) {
    // TODO: run the game turn
    continueToNextTurn = game.runTurn(state)
  }  
}

