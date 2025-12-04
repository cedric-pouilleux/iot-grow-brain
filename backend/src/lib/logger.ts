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

      // Debug: log ESP32 logs specifically
      if (category === 'ESP32' || msg?.includes('[ESP32]')) {
        console.log(
          `[LOGGER DEBUG] Processing ESP32 log: level=${levelStr} (${level}), category=${category}, msg=${cleanMsg.substring(0, 100)}`
        )
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
          if (category === 'ESP32') {
            console.log(
              `[LOGGER DEBUG] Successfully inserted ESP32 log into DB: level=${levelStr}, category=${category}`
            )
          }
          callback()
        })
        .catch(err => {
          // We write to stderr directly to avoid infinite loop if we used logger
          console.error(`[LOGGER DEBUG] Failed to write log to DB:`, err)
          process.stderr.write(`Failed to write log to DB: ${err.message}\n`)
          callback()
        })
    } catch (err) {
      console.error(`[LOGGER DEBUG] Failed to parse log entry:`, err)
      process.stderr.write(`Failed to parse log entry: ${err}\n`)
      callback()
    }
  },
})
