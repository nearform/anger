'use strict'

const hapi = require('hapi')
const nes = require('nes')
const server = new hapi.Server()

server.connection({
  host: 'localhost',
  port: 3000
})

server.register(nes, (err) => {
  if (err) { throw err }

  server.subscription('/greet')

  server.route({
    method: 'POST',
    path: '/h',
    config: {
      id: 'hello',
      handler: function (request, reply) {
        // in the publish response we assign meta.id to the request payload id
        server.publish('/greet', { hello: 'world', meta: { id: request.payload.id } })
        return reply('world!')
      }
    }
  })
})

server.start((err) => {
  if (err) throw err
  console.log('now listening on localhost:3000')
})
