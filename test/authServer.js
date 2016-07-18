var Hapi = require('hapi')
var Basic = require('hapi-auth-basic')
var Nes = require('nes')

function build (cb) {
  var server = new Hapi.Server()

  server.connection({
    host: 'localhost',
    port: 0
  })

  server.count = 0

  server.register([Basic, Nes], function (err) {
    if (err) { throw err }
    server.users = {
      john: {
        username: 'john',
        name: 'John Doe',
        id: '2133d32a',
        signin: 0
      },
      james: {
        username: 'james',
        name: 'James Doe',
        id: '2143d3ff',
        signin: 0
      }
    }

    var validate = function (request, username, password, callback) {
      var user = server.users[username]
      if (!user) {
        return callback(null, false)
      }
      server.users[username].signin++
      callback(null, password === server.users[username].username, { id: user.id, name: user.name })
    }

    server.auth.strategy('simple', 'basic', 'required', { validateFunc: validate })

    server.subscription('/greet')

    server.route({
      method: 'POST',
      path: '/h',
      config: {
        id: 'hello',
        handler: function (request, reply) {
          server.count++
          server.publish('/greet', { hello: 'world', meta: { id: request.payload.id } })
          return reply('Hello ' + request.auth.credentials.name)
        }
      }
    })

    server.start((err) => {
      cb(err, server)
    })
  })
}

module.exports = build
