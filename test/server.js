'use strict'

const hapi = require('hapi')

function build (cb) {
  const server = new hapi.Server()

  server.connection({ port: 0 })

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
          server.publish('/greet', { hello: 'world' })
          return reply('world!')
        }
      }
    })
  })

  server.start((err) => {
    cb(err, server)
  })
}

module.exports = build
