import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from './schemas/index.js'


const client = new PGlite("./game-database/")
export const db = drizzle({client})
