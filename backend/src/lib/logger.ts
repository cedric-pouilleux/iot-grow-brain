import { Writable } from 'stream'
import { db } from '../db/client'
import { systemLogs } from '../db/schema'

const levelMap: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  25: 'success',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
}

export const dbLoggerStream = new Writable({
  write(chunk, encoding, callback) {
    // Write to stdout as well (to keep console logs)
    process.stdout.write(chunk)

    const logEntry = chunk.toString()
    try {
      const parsed = JSON.parse(logEntry)
      const { level, msg, time, ...details } = parsed

      const levelStr = typeof level === 'number' ? levelMap[level] || String(level) : String(level)

      // Extract category from message prefix
      let category = 'SYSTEM'
      let cleanMsg = msg || ''

      // Filter out generic Fastify logs (not useful, we have our own)
      if (
        cleanMsg === 'incoming request' ||
        cleanMsg === 'request completed' ||
        cleanMsg.startsWith('Server listening at')
      ) {
        callback()
        return
      }

      const categoryMatch = cleanMsg.match(/^\[([A-Z0-9]+)\]\s*/)
      if (categoryMatch) {
        category = categoryMatch[1]
        cleanMsg = cleanMsg.replace(/^\[([A-Z0-9→/]+)\]\s*/, '') // Remove category prefix
      }

      // Filter: Only insert WARNING (40) and ERROR (50) and FATAL (60)
      if (level < 40) {
        callback()
        return
      }

      // Insert into DB asynchronously
      db.insert(systemLogs)
        .values({
          category,
          level: levelStr,
          msg: cleanMsg,
          time: new Date(time || Date.now()),
          details: details,
        })
        .then(() => {
          // No more debug logging
          callback()
        })
        .catch(err => {
          // We write to stderr directly to avoid infinite loop if we used logger
          process.stderr.write(`Failed to write log to DB: ${err.message}\n`)
          callback()
        })
    } catch (err) {
      // console.error(`Failed to parse log entry:`, err)
      process.stderr.write(`Failed to parse log entry: ${err}\n`)
      callback()
    }
  },
})
