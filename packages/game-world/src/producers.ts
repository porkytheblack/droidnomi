import { GameActor } from "./actors.js"
import { GameResource } from "./entities.js"

export interface Product {
  resource: GameResource,
  units_produced: number
}

export interface ProductionRequirement { // 5k ai chips + 20 researchers
  req: GameResource,
  required_amount: number
}


// TODO: pass in inventory
export type ProduceFn = () => Product // e.g a Model

export interface Producer {
  id: string
  name: string
  produce: ProduceFn
  production_requirements: Array<ProductionRequirement>
}


// Chip Units | AI Training Units | AI Inference Units | University Workforce |
// how to encode production
