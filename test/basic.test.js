'use strict'

const t = require('tap')
const anger = require('..')

require('./server')((err, server) => {
  t.error(err)
  let uid = 0
  const senders = 2
  const publishes = 1000
  const connections = 10
  const instance = anger({
    url: server.info.uri,
    subscription: '/greet',
    senders: senders,
    connections: connections,
    publishes: publishes,
    identifier: 'meta.id',
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
    server.stop(() => {
      t.end()
    })

    t.equal(server.count, senders * publishes, 'number of publishes in the server')

    t.equal(result.publishes, senders * publishes, 'number of publishes in results')
    t.equal(result.connections, connections, 'connections is the same')
    t.equal(result.senders, senders, 'senders is the same')

    t.ok(result.latency, 'latency exists')
    t.ok(result.latency.average, 'latency.average exists')
    t.ok(result.latency.stddev, 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.ok(result.latency.max, 'latency.max exists')
  })
})
