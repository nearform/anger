'use strict'

const EE = require('events').EventEmitter
const nes = require('nes')
const Histogram = require('native-hdr-histogram')
const steed = require('steed')
const get = require('lodash.get')
const Client = nes.Client

function anger (opts) {
  if (opts.senders > opts.connections) {
    throw Error('Senders *are* connections, must be <= connections')
  }
  const tracker = new EE()
  const clients = new Array(opts.connections)
  const senders = new Array(opts.senders)
  const latencies = new Histogram(1, 10000, 5)
  const identifier = opts.identifier || 'id'
  const tail = opts.tail || false
  const expectedResponses = typeof opts.responses === 'number' 
    ? opts.responses 
    : opts.connections * opts.requests
  const map = new Map()
  const uidOf = typeof identifier === 'function'
    ? identifier
    : (payload) => get(payload, identifier)

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
  var responses = 0

  function handler (payload) {
    responses++
    if (++expected === clients.length) {
      return next()
    }
    if (!tail && responses === expectedResponses) {
      complete()
    }
    const startTime = map.get(uidOf(payload))
    const end = process.hrtime(startTime)
    const responseTime = end[0] * 1e3 + end[1] / 1e6
    latencies.record(responseTime)
  }

  function next () {
    if (total === opts.requests) { 
      if (tail) setTimeout(complete, tail)
      return 
    }
    for (let i = 0; i < senders.length; i++) {
      const uid = opts.trigger(senders[i])
      total++ 
      map.set(uid, process.hrtime())
    }
    expected = 0
    tracker.emit('trigger')
  }

  function complete() {
    clients.forEach(disconnect)
    tracker.emit('end', {
      latency: histAsObj(latencies),
      requests: total,
      responses: responses,
      connections: clients.length,
      senders: opts.senders
    })
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
