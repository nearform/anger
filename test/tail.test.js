'use strict'

const t = require('tap')
const anger = require('..')

require('./server')((err, server) => {
  t.error(err)
  let uid = 0
  const senders = 2
  const requests = 1000
  const connections = 10
  const responses = 10000 // reqs * connections
  const instance = anger({
    url: server.info.uri,
    subscription: '/greet',
    senders: senders,
    connections: connections,
    identifier: (payload) => payload.meta.id,
    requests: 1000,
    tail: 3000,
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

    t.equal(server.count, requests, 'number of responses from the server')

    t.equal(result.requests, requests, 'number of requests in results')
    t.equal(result.responses, responses, 'number of responses in results')
    t.equal(result.connections, connections, 'connections is the same')
    t.equal(result.senders, senders, 'senders is the same')

    t.ok(result.latency, 'latency exists')
    t.ok(result.latency.average, 'latency.average exists')
    t.ok(result.latency.stddev, 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.ok(result.latency.max, 'latency.max exists')
  })
})
