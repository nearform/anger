'use strict'

const t = require('tap')
const anger = require('..')

require('./server')((err, server) => {
  t.error(err)

  const reqOpts = {
    method: 'POST',
    path: '/h'
  }

  const instance = anger({
    url: server.info.uri,
    subscription: '/greet',
    connections: 10,
    publishes: 1000,
    trigger: (client) => {
      client.request(reqOpts)
    }
  })

  instance.on('end', (result) => {
    server.stop(() => {
      t.end()
    })

    t.equal(server.count, 1000, 'number of publishes in the server')

    t.equal(result.publishes, 1000, 'number of publishes in results')
    t.equal(result.connections, 10, 'connections is the same')

    t.ok(result.latency, 'latency exists')
    t.ok(result.latency.average, 'latency.average exists')
    t.ok(result.latency.stddev, 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.ok(result.latency.max, 'latency.max exists')
  })
})
