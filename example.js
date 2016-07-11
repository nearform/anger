'use strict'

const hapi = require('hapi')

buildServer(runAnger)

function runAnger (err, server) {
  'use strict'

  const anger = require('./')

  let uid = 0
  const instance = anger({
    url: server.info.uri,
    subscription: '/greet',
    senders: 2,
    connections: 10,
    requests: 1000,
    responses: 10000,
    identifier: (payload) => payload.meta.id,
    trigger: (sender) => {
      sender.request({
        method: 'POST',
        path: '/h',
        payload: {
          id: ++uid
        }
      })
      return uid
    }
  })

  instance.on('end', (result) => {
    server.stop()
    // do things with result! yay!
  })
}

function buildServer (cb) {
  const server = new hapi.Server()

  server.connection({
    host: 'localhost',
    port: 0
  })

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
          // in the publish response we assign meta.id to the request payload id
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
