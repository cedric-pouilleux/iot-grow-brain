import { io, Socket } from 'socket.io-client'
import type { MqttMessage } from '../types'

export const useMqtt = (options: {
  onMessage: (message: MqttMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}) => {
  const config = useRuntimeConfig()
  let socket: Socket | null = null

  const connect = () => {
    if (socket?.connected) return

    try {
      socket = io(config.public.socketUrl, {
        transports: ['websocket'],
        upgrade: false,
      })

      socket.on('connect', () => {
        options.onConnect?.()
      })

      socket.on('disconnect', () => {
        options.onDisconnect?.()
      })

      socket.on('connect_error', error => {
        options.onError?.(error)
      })

      socket.on('mqtt:data', (message: MqttMessage) => {
        options.onMessage(message)
      })
    } catch (e) {
      console.error('Erreur connexion WebSocket:', e)
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
