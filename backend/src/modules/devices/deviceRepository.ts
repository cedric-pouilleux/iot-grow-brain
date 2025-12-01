import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, sql } from 'drizzle-orm'
import * as schema from '../../db/schema'

export class DeviceRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async getAllModules() {
    return this.db
      .selectDistinct({ moduleId: schema.deviceSystemStatus.moduleId })
      .from(schema.deviceSystemStatus)
      .orderBy(schema.deviceSystemStatus.moduleId)
  }

  async getDeviceStatus(moduleId: string) {
    const result = await this.db
      .select({
        moduleId: schema.deviceSystemStatus.moduleId,
        ip: schema.deviceSystemStatus.ip,
        mac: schema.deviceSystemStatus.mac,
        uptimeStart: schema.deviceSystemStatus.uptimeStart,
        rssi: schema.deviceSystemStatus.rssi,
        flashUsedKb: schema.deviceSystemStatus.flashUsedKb,
        flashFreeKb: schema.deviceSystemStatus.flashFreeKb,
        flashSystemKb: schema.deviceSystemStatus.flashSystemKb,
        heapTotalKb: schema.deviceSystemStatus.heapTotalKb,
        heapFreeKb: schema.deviceSystemStatus.heapFreeKb,
        heapMinFreeKb: schema.deviceSystemStatus.heapMinFreeKb,
        chipModel: schema.deviceHardware.chipModel,
        chipRev: schema.deviceHardware.chipRev,
        cpuFreqMhz: schema.deviceHardware.cpuFreqMhz,
        flashKb: schema.deviceHardware.flashKb,
        cores: schema.deviceHardware.cores,
      })
      .from(schema.deviceSystemStatus)
      .leftJoin(
        schema.deviceHardware,
        eq(schema.deviceSystemStatus.moduleId, schema.deviceHardware.moduleId)
      )
      .where(eq(schema.deviceSystemStatus.moduleId, moduleId))

    return result[0] || null
  }

  async getSensorStatus(moduleId: string) {
    return this.db
      .select()
      .from(schema.sensorStatus)
      .where(eq(schema.sensorStatus.moduleId, moduleId))
  }

  async getSensorConfig(moduleId: string) {
    return this.db
      .select()
      .from(schema.sensorConfig)
      .where(eq(schema.sensorConfig.moduleId, moduleId))
  }

  async getHistoryData(moduleId: string, days: number, limit: number) {
    if (days > 7) {
      // Using raw SQL for TimescaleDB specific queries but mapping to camelCase
      const query = sql`
                SELECT bucket as time, sensor_type as "sensorType", avg_value as value
                FROM measurements_hourly
                WHERE module_id = ${moduleId}
                  AND bucket > NOW() - (${days} || ' days')::interval
                ORDER BY bucket DESC
                LIMIT ${limit}
            `
      const result = await this.db.execute(query)
      return result.rows.map(row => ({
        time: new Date(row.time as string | Date),
        sensorType: row.sensorType as string,
        value: Number(row.value),
      }))
    } else if (days > 1) {
      // Pour 1-7 jours : agrégation par minute (acceptable pour cette période)
      try {
        const query = sql`
                    SELECT time_bucket('1 minute', time) as time, sensor_type as "sensorType", AVG(value) as value
                    FROM measurements
                    WHERE module_id = ${moduleId}
                      AND time > NOW() - (${days} || ' days')::interval
                    GROUP BY time, sensor_type
                    ORDER BY time DESC
                    LIMIT ${limit}
                `
        const result = await this.db.execute(query)
        return result.rows.map(row => ({
          time: new Date(row.time as string | Date),
          sensorType: row.sensorType as string,
          value: Number(row.value),
        }))
      } catch {
        // Fallback without time_bucket
        const query = sql`
                    SELECT time, sensor_type as "sensorType", value
                    FROM measurements
                    WHERE module_id = ${moduleId}
                      AND time > NOW() - (${days} || ' days')::interval
                    ORDER BY time DESC
                    LIMIT ${limit}
                `
        const result = await this.db.execute(query)
        return result.rows.map(row => ({
          time: new Date(row.time as string | Date),
          sensorType: row.sensorType as string,
          value: Number(row.value),
        }))
      }
    } else {
      // Pour < 1 jour : données brutes (pas d'agrégation) pour correspondre au temps réel
      const query = sql`
                SELECT time, sensor_type as "sensorType", value
                FROM measurements
                WHERE module_id = ${moduleId}
                  AND time > NOW() - (${days} || ' days')::interval
                ORDER BY time DESC
                LIMIT ${limit}
            `
      const result = await this.db.execute(query)
      return result.rows.map(row => ({
        time: new Date(row.time as string | Date),
        sensorType: row.sensorType as string,
        value: Number(row.value),
      }))
    }
  }

  async updateSensorConfig(moduleId: string, sensorType: string, interval: number) {
    return this.db
      .insert(schema.sensorConfig)
      .values({
        moduleId,
        sensorType,
        intervalSeconds: interval,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.sensorConfig.moduleId, schema.sensorConfig.sensorType],
        set: {
          intervalSeconds: interval,
          updatedAt: new Date(),
        },
      })
  }
}
