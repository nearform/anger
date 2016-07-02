'use strict'

const EE = require('events').EventEmitter
const nes = require('nes')
const Histogram = require('native-hdr-histogram')
const steed = require('steed')
const get = require('lodash.get')
const Client = nes.Client

function anger (opts) {
  const tracker = new EE()
  const clients = new Array(opts.connections)
  const senders = new Array(opts.senders)
  const latencies = new Histogram(1, 10000, 5)
  const identifier = opts.identifier || 'id'
  const map = {}

  for (var i = 0; i < clients.length; i++) {
    clients[i] = new Client(opts.url)
    if (i < opts.senders) {
      senders[i] = clients[i]
    }
  }

  steed.each(clients, (client, done) => {
    client.connect({}, done)
  }, (err) => {
    if (err) {
      tracker.emit('error', err)
      return
    }

    tracker.emit('connect')

    steed.each(clients, (client, done) => {
      client.subscribe(opts.subscription, handler, done)
    }, (err) => {
      if (err) {
        tracker.emit('error', err)
        return
      }

      tracker.emit('subscribe')
    })
  })

  tracker.on('subscribe', next)

  var expected = 0
  var total = 0

  function handler (payload) {
    if (++expected === clients.length * senders.length) {
      return next()
    }
    const startTime = map[get(payload, identifier)]
    const end = process.hrtime(startTime)
    const responseTime = end[0] * 1e3 + end[1] / 1e6
    latencies.record(responseTime)
  }

  function next () {
    if (total++ === (opts.publishes)) {
      clients.forEach(disconnect)
      tracker.emit('end', {
        latency: histAsObj(latencies),
        publishes: (total - 1) * opts.senders,
        connections: clients.length,
        senders: opts.senders
      })
      return
    }
    for (let i = 0; i < senders.length; i++) {
      const uid = opts.trigger(senders[0])
      map[uid] = process.hrtime()
    }

    expected = 0
    tracker.emit('trigger')
  }

  function disconnect (client) {
    client.disconnect()
  }

  return tracker
}

// copied from autocannon
function histAsObj (hist, total) {
  const result = {
    average: Math.ceil(hist.mean() * 100) / 100,
    stddev: Math.ceil(hist.stddev() * 100) / 100,
    min: hist.min(),
    max: hist.max()
  }

  if (typeof total === 'number') {
    result.total = total
  }

  return result
}

module.exports = anger
