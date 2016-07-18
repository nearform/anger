'use strict'

const t = require('tap')
const anger = require('..')

require('./timeoutServer')((err, server) => {
  t.error(err)
  let uid = 0
  const senders = 2
  const requests = 10
  const connections = 10
  const responses = 100 // reqs * connections
  const instance = anger({
    url: server.info.uri,
    subscription: '/greet',
    senders: senders,
    connections: connections,
    identifier: (payload) => payload.meta.id,
    requests: requests,
    timeout: 300,
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
    t.equal(result.responses, responses / 2, 'number of responses in results')
    t.equal(result.timedOutResponses, responses / 2, 'number of timed out responses in results')
    t.equal(result.connections, connections, 'connections is the same')
    t.equal(result.senders, senders, 'senders is the same')

    t.ok(result.latency, 'latency exists')
    t.ok(result.latency.average, 'latency.average exists')
    t.ok(result.latency.stddev, 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.ok(result.latency.max, 'latency.max exists')
  })
})
