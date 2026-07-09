import {defineConfig} from 'drizzle-kit'


export default defineConfig({
  dialect: 'postgresql',
  driver:'pglite',
  schema: './src/db/schemas/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: './game-database/'
  }
})
