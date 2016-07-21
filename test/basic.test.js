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
    responses: responses,
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
    t.ok(result.latency.p50, 'latency.p50 exists')
    t.ok(result.latency.p75, 'latency.p75 exists')
    t.ok(result.latency.p99, 'latency.p99 exists')
    t.ok(result.latency.p999, 'latency.p999 exists')
    t.ok(result.latency.p9999, 'latency.p9999 exists')
    t.ok(result.latency.p99999, 'latency.p99999 exists')

    t.ok(result.connectLatencies, 'connectLatencies exists')
    t.ok(result.retriesAvg >= 0, 'retriesAvg exists')
    t.ok(result.connectLatencies.average >= 0, 'connectLatencies.average exists')
    t.ok(result.connectLatencies.stddev >= 0, 'connectLatencies.stddev exists')
    t.ok(result.connectLatencies.min >= 0, 'connectLatencies.min exists')
    t.ok(result.connectLatencies.max >= 0, 'connectLatencies.max exists')
    t.ok(result.connectLatencies.p50 >= 0, 'connectLatencies.p50 exists')
    t.ok(result.connectLatencies.p75 >= 0, 'connectLatencies.p75 exists')
    t.ok(result.connectLatencies.p99 >= 0, 'connectLatencies.p99 exists')
    t.ok(result.connectLatencies.p999 >= 0, 'connectLatencies.p999 exists')
    t.ok(result.connectLatencies.p9999 >= 0, 'connectLatencies.p9999 exists')
    t.ok(result.connectLatencies.p99999 >= 0, 'connectLatencies.p99999 exists')

    t.ok(result.disconnects >= 0, 'disconnects exist')
    t.ok(result.reconnects >= 0, 'reconnects exists')
  })
})
