'use strict'

const EE = require('events').EventEmitter
const nes = require('nes')
const Histogram = require('native-hdr-histogram')
const steed = require('steed')
const Client = nes.Client

function nesone (opts) {
  const tracker = new EE()
  const sender = new Client(opts.url)
  sender.connect({}, noop)

  const clients = new Array(opts.connections)
  const latencies = new Histogram(1, 10000, 5)

  for (var i = 0; i < clients.length; i++) {
    clients[i] = new Client(opts.url)
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
  var startTime

  function handler () {
    if (++expected === clients.length) {
      return next()
    }
    const end = process.hrtime(startTime)
    const responseTime = end[0] * 1e3 + end[1] / 1e6
    latencies.record(responseTime)
  }

  function next () {
    if (total++ === opts.publishes) {
      sender.disconnect()
      clients.forEach(disconnect)
      tracker.emit('end', {
        latency: histAsObj(latencies),
        publishes: total - 1,
        connections: clients.length
      })
      return
    }

    startTime = process.hrtime()
    opts.trigger(sender)
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

function noop () {
}

module.exports = nesone
