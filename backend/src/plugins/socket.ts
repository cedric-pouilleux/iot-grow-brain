import fp from 'fastify-plugin'
import { Server } from 'socket.io'

declare module 'fastify' {
  interface FastifyInstance {
    io: Server
  }
}

export default fp(async fastify => {
  const io = new Server(fastify.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', socket => {
    fastify.log.info('🔌 New WebSocket client connected')
    socket.on('disconnect', () => {
      // fastify.log.info('🔌 Client disconnected');
    })
  })

  fastify.decorate('io', io)

  fastify.addHook('onClose', (instance, done) => {
    instance.io.close()
    done()
  })
})
