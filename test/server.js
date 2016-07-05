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
          server.publish('/greet', { hello: 'world', meta: { id: request.payload.id } })
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

if (require.main === module) {
  build((err, server) => {
    if (err) {
      throw err
    }
    console.log(`server listening at ${server.info.uri}`)
  })
}
