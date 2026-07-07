

interface GameEntity {
  id: string
  name: string
  description: string
}


type TileKind = "bear-land" | "water" | "city" | "government"


interface Tile extends GameEntity {
  kind: TileKind
  // TODO: may need to revisit pricing and use float market price
  price: number
}


type DevelopmentKind = "ai-lab" | "chip-fab" | "data-center"

interface Development extends GameEntity {
  kind: DevelopmentKind
  // the price for building the development
  price: number
}



interface Model extends GameEntity {
  // model level from 1 - 10
  level: number  
}



