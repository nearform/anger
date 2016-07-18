'use strict'

const hapi = require('hapi')

function build (cb) {
  const server = new hapi.Server()

  server.connection({
    host: 'localhost',
    port: 0
  })

  server.count = 0

  server.register(require('nes'), (err) => {
    if (err) { throw err }

    server.subscription('/greet')

    server.route({
      method: 'POST',
      path: '/h',
      config: {
        id: 'hello',
        handler: function (request, reply) {
          server.count++
          // only reply to every second one
          if (server.count % 2) {
            server.publish('/greet', { hello: 'world', meta: { id: request.payload.id } })
            return reply('world!')
          } else {
            return
          }
        }
      }
    })
  })

  server.start((err) => {
    cb(err, server)
  })
}

module.exports = build
