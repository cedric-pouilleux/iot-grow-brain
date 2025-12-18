
import { db } from './src/db/client'
import { systemLogs } from './src/db/schema'
import { sql } from 'drizzle-orm'

async function checkLogDistribution() {
  console.log('Checking log distribution for the last 24 hours...')
  
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  
  const result = await db.execute(sql`
    SELECT category, count(*) as count
    FROM system_logs
    WHERE time >= ${start.toISOString()} AND time <= ${end.toISOString()}
    GROUP BY category
    ORDER BY count DESC
  `)
  
  console.log('Log counts by category:')
  console.table(result.rows)
  
  process.exit(0)
}

checkLogDistribution().catch(console.error)
