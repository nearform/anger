'use strict'

const t = require('tap')
const anger = require('..')

require('./authServer')((err, server) => {
  t.error(err)
  let uid = 0
  const instance = anger({
    url: server.info.uri,
    subscription: '/greet',
    senders: 1,
    connections: 10,
    identifier: (payload) => payload.meta.id,
    auth: (client, i) => {
      return i % 2
            ? { headers: { authorization: `Basic ${new Buffer('john:john', 'utf8').toString('base64')}` } }
            : { headers: { authorization: `Basic ${new Buffer('james:james', 'utf8').toString('base64')}` } }
    },
    requests: 1,
    responses: 10,
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

  instance.on('error', t.error)

  instance.on('end', (result) => {
    server.stop(() => {
      t.end()
    })
    t.equal(server.count, 1, 'number of responses from the server')
    t.equal(server.users.john.signin, 5, 'number of john signins on the server')
    t.equal(server.users.james.signin, 5, 'number of james signins on the server')

    t.equal(result.requests, 1, 'number of requests in results')
    t.equal(result.responses, 10, 'number of responses in results')
    t.equal(result.connections, 10, 'connections is the same')
    t.equal(result.senders, 1, 'senders is the same')

    t.ok(result.latency, 'latency exists')
    t.ok(result.latency.average, 'latency.average exists')
    t.type(result.latency.stddev, 'number', 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.ok(result.latency.max, 'latency.max exists')
  })
})
