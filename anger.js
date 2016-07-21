'use strict'

const EE = require('events').EventEmitter
const nes = require('nes')
const Histogram = require('native-hdr-histogram')
const tryAgain = require('try-again')
const histUtil = require('hdr-histogram-percentiles-obj')
const steed = require('steed')
const get = require('lodash.get')
const xtend = require('xtend')
const Client = nes.Client

const defaultAgainOpts = {
  retries: 8,
  max: 10000,
  jitter: 0.2,
  factor: 2,
  min: 100
}

function anger (opts) {
  if (opts.senders > opts.connections) {
    throw Error('Senders *are* connections, must be <= connections')
  }
  const tracker = new EE()
  const clients = new Array(opts.connections)
  const retries = new Array(opts.connections)
  const senders = new Array(opts.senders)
  const latencies = new Histogram(1, 10000, 5)
  const connectLatencies = new Histogram(1, 10000, 5)
  const identifier = opts.identifier || 'id'
  const tail = opts.tail || false
  const timeout = opts.timeout || false
  const expectedResponses = typeof opts.responses === 'number'
    ? opts.responses
    : opts.connections * opts.requests
  const map = new Map()
  const uidOf = typeof identifier === 'function'
    ? identifier
    : (payload) => get(payload, identifier)
  const auth = getAuth(opts.auth)

  const again = tryAgain(xtend(defaultAgainOpts, opts.retryOpts))

  let timedOutResponses = 0

  for (let i = 0; i < clients.length; i++) {
    clients[i] = new Client(opts.url)
    clients[i].anger = {
      id: i,
      sender: false
    }
    retries[i] = 0
    if (i < opts.senders) {
      senders[i] = clients[i]
      clients[i].anger.sender = true
    }
  }

// map because of errors
  steed.map(clients, (client, done) => {
    const startTime = process.hrtime()
    let numRetries = 0
    again((success, failure, fatal) => {
      client.connect({ auth: auth(client, client.anger.id) }, (err) => {
        if (err) failure(err)
        else success()
      })
    }, (err) => {
      if (err) {
        numRetries++
      } else {
        connectLatencies.record(process.hrtime(startTime))
        retries[client.anger.id] = numRetries
        done()
      }
    }, done)
  }, (err) => {
    if (err) {
      return onError(err)
    }

    tracker.emit('connect')

    // map because of errors
    steed.map(clients, (client, done) => {
      client.subscribe(opts.subscription, handler, done)
    }, (err) => {
      if (err) {
        return onError(err)
      }

      tracker.emit('subscribe')
    })
  })

  tracker.on('subscribe', next)

  let totalResponses = 0
  let totalRequests = 0
  function handler (payload) {
    const uid = uidOf(payload)
    const mapObj = map.get(uid)

    if (mapObj.finished) return

    totalResponses++

    recordResponseTime(mapObj.start)

    if (!--mapObj.expectedResponses) {
      mapObj.finished = true
      if (timeout) clearTimeout(mapObj.timeout)
      tracker.emit('publish-events-received', uid)

      if (!tail && totalResponses + timedOutResponses >= expectedResponses) {
        complete()
      }

      return next(mapObj.sender)
    }
  }

  function handleTimeout (uid) {
    return function () {
      const mapObj = map.get(uid)
      mapObj.finished = true
      recordResponseTime(mapObj.start)

      timedOutResponses += mapObj.expectedResponses
      if (!tail && totalResponses + timedOutResponses === expectedResponses) {
        complete()
      }

      return next(mapObj.sender)
    }
  }

  function next (sender) {
    if (totalRequests === opts.requests) return

    // begin emitting the requests if none have been emitted
    if (!totalRequests) {
      for (let i = 0; i < senders.length; i++) {
        triggerSender(senders[i])
      }
    }

    // if sender is passed in, trigger it
    if (sender) triggerSender(sender)
  }

  function triggerSender (sender) {
    const uid = opts.trigger(sender)
    if (++totalRequests === opts.requests && tail) setTimeout(complete, tail)
    let replyTimeout
    if (timeout) replyTimeout = setTimeout(handleTimeout(uid), timeout)
    map.set(uid, {
      start: process.hrtime(),
      sender: sender,
      expectedResponses: clients.length,
      timeout: replyTimeout,
      finished: false,
      id: uid
    })

    // emit trigger every time a client sends a message
    tracker.emit('trigger', uid)
  }

  function complete () {
    clients.forEach(disconnect)
    tracker.emit('end', {
      latency: histUtil.addPercentiles(latencies, histUtil.histAsObj(latencies)),
      requests: totalRequests,
      responses: totalResponses,
      timedOutResponses: timedOutResponses,
      connectLatencies: histUtil.addPercentiles(connectLatencies, histUtil.histAsObj(connectLatencies)),
      retriesAvg: mean(retries),
      connections: clients.length,
      senders: opts.senders
    })
  }

  function disconnect (client) {
    client.disconnect()
  }

  function onError (err) {
    clients.forEach(disconnect)
    tracker.emit('error', err)
  }

  function recordResponseTime (startTime) {
    const end = process.hrtime(startTime)
    const responseTime = end[0] * 1e3 + end[1] / 1e6
    latencies.record(responseTime)
  }

  return tracker
}

function _noop () {}

function getAuth (auth) {
  let ret = _noop
  if (auth) {
    if (typeof auth === 'function') {
      ret = auth
    } else {
      ret = function () { return auth }
    }
  }
  return ret
}

function mean (vals) {
  return vals.reduce((a, b) => a + b) / vals.length
}

module.exports = anger
