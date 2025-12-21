import { io, Socket } from 'socket.io-client'
import type { MqttMessage } from '~/types'

export const useMqtt = (options: {
  onMessage: (message: MqttMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}) => {
  const config = useRuntimeConfig()
  let socket: Socket | null = null

  const connect = () => {
    if (socket?.connected) {
      console.log('[WEBSOCKET] Already connected, skipping')
      return
    }

    try {
      const socketUrl = config.public.socketUrl
      console.log(`[WEBSOCKET] Connecting to: ${socketUrl}`)

      socket = io(socketUrl, {
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      })

      socket.on('connect', () => {
        console.log('[WEBSOCKET] Connected successfully', {
          id: socket?.id,
          transport: socket?.io?.engine?.transport?.name,
        })
        options.onConnect?.()
      })

      socket.on('disconnect', (reason: string) => {
        console.log('[WEBSOCKET] Disconnected', { reason })
        options.onDisconnect?.()
      })

      socket.on('connect_error', (error: Error) => {
        console.error('[WEBSOCKET] Connection error:', error.message)
        options.onError?.(error)
      })

      socket.on('reconnect', (attemptNumber: number) => {
        console.log(`[WEBSOCKET] Reconnected after ${attemptNumber} attempts`)
      })

      socket.on('reconnect_attempt', (attemptNumber: number) => {
        console.log(`[WEBSOCKET] Reconnection attempt #${attemptNumber}`)
      })

      socket.on('reconnect_error', (error: Error) => {
        console.error('[WEBSOCKET] Reconnection error:', error.message)
      })

      socket.on('reconnect_failed', () => {
        console.error('[WEBSOCKET] Reconnection failed')
      })

      socket.on('mqtt:data', (message: MqttMessage) => {
        console.debug('[WEBSOCKET] Received MQTT data:', message.topic)
        options.onMessage(message)
      })
    } catch (e) {
      console.error('[WEBSOCKET] Error during connection setup:', e)
      options.onError?.(e as Error)
    }
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  }

  return {
    connect,
    disconnect,
  }
}
