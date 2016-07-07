var Hapi = require('hapi')
var Basic = require('hapi-auth-basic')
var Bcrypt = require('bcrypt')
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
    var users = {
      john: {
        username: 'john',
        password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm',   // 'secret'
        name: 'John Doe',
        id: '2133d32a'
      }
    }

    var validate = function (request, username, password, callback) {
      var user = users[username]
      if (!user) {
        return callback(null, false)
      }

      Bcrypt.compare(password, user.password, function (err, isValid) {
        callback(err, isValid, { id: user.id, name: user.name })
      })
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
