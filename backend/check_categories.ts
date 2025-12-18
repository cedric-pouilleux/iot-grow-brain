
import { db } from './src/db/client'
import { systemLogs } from './src/db/schema'
import { sql } from 'drizzle-orm'

async function checkCategories() {
  console.log('Checking category encodings...')
  
  const result = await db.execute(sql`
    SELECT DISTINCT category, length(category) as len, encode(category::bytea, 'hex') as hex
    FROM system_logs
  `)
  
  console.table(result.rows)
  process.exit(0)
}

checkCategories().catch(console.error)
