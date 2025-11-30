import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: 'http://localhost:3001/documentation/json',
    output: {
      mode: 'split',
      target: 'app/utils/api.ts',
      schemas: 'app/utils/model',
      client: 'fetch',
      baseUrl: 'http://localhost:3001',
    },
  },
})
