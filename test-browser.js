var stream = require('stream')
var pump = require('./index')

var rs = new stream.Readable()
var ws = new stream.Writable()

rs._read = function (size) {
  this.push(Buffer(size).fill('abc'))
}

ws._write = function (chunk, encoding, cb) {
  setTimeout(function () {
    cb()
  }, 100)
}

var toHex = function () {
  var reverse = new (require('stream').Transform)()

  reverse._transform = function (chunk, enc, callback) {
    reverse.push(chunk.toString('hex'))
    callback()
  }

  return reverse
}

var wsClosed = false
var rsClosed = false
var callbackCount = 0

var check = function () {
  if (wsClosed && rsClosed && callbackCount === 1) {
    console.log('test-browser.js passes')
    clearTimeout(timeout)
  }
}

ws.on('finish', function () {
  wsClosed = true
  check()
})

rs.on('end', function () {
  rsClosed = true
  check()
})

var res = pump(rs, toHex(), toHex(), toHex(), ws, function () {
  callbackCount++
  if (callbackCount > 1) throw new Error('pump callback called more than once')
  check()
})

if (res !== ws) {
  throw new Error('should return last stream')
}

setTimeout(function () {
  rs.push(null)
  rs.emit('close')
}, 1000)

var timeout = setTimeout(function () {
  check()
  throw new Error('timeout')
}, 5000)

// Test: callback fires only once when a transform errors mid-pipeline
;(function () {
  var rs2 = new stream.Readable()
  var ws2 = new stream.Writable()
  var ts = new stream.Transform()

  rs2._read = function () {
    this.push(Buffer.alloc(64).fill('x'))
  }

  var count = 0
  ts._transform = function (chunk, enc, next) {
    count++
    if (count === 3) return next(new Error('transform error'))
    this.push(chunk)
    next()
  }

  ws2._write = function (chunk, enc, next) {
    next()
  }

  var errorCallbackCount = 0
  pump(rs2, ts, ws2, function () {
    errorCallbackCount++
    if (errorCallbackCount > 1) throw new Error('error pump callback called more than once')
  })
})()
