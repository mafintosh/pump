var pump = require('./index')

var eos = require('end-of-stream')

var rs = require('fs').createReadStream('/dev/random')
var ws = require('fs').createWriteStream('/dev/null')

var toHex = function () {
  var reverse = new (require('stream').Transform)()

  reverse._transform = function (chunk, enc, callback) {
    reverse.push(chunk.toString('hex'))
    callback()
  }

  return reverse
}

var withErr = function(msg) {
  var errs = new (require('stream').Transform)()

  errs._transform = function (chunk, enc, callback) {
    callback(new Error(msg))
  }

  return errs
}

var wsClosed = false
var rsClosed = false
var callbackCalled = false

var check = function () {
  if (wsClosed && rsClosed && callbackCalled) {
    console.log('test-node.js passes')
    clearTimeout(timeout)
  }
}

ws.on('close', function () {
  wsClosed = true
  check()
})

rs.on('close', function () {
  rsClosed = true
  check()
})

var res = pump(rs, toHex(), toHex(), toHex(), ws, function () {
  callbackCalled = true
  check()
})

if (res !== ws) {
  throw new Error('should return last stream')
}

// Returned stream swallows errors
var rs2 = require('fs').createReadStream('/dev/random')
var ws2 = require('fs').createWriteStream('/dev/null')

process.once('uncaughtException', function(err) {
  err.message === 'Pump Fail'
})

eos(pump(rs2, withErr('Pump Fail'), ws2), function(err) {
  if (!err) {
    throw new Error('should propagate error on stream')
  }
})

// Native .pipe rethrows errors
var rs3 = require('fs').createReadStream('/dev/random')
var ws3 = require('fs').createWriteStream('/dev/null')

process.once('uncaughtException', function(err) {
  err.message === 'Pipe Fail'
})

eos(rs3.pipe(withErr('Pipe Fail')).pipe(ws3), function(err) {
  if (!err) {
    throw new Error('should propagate error on stream')
  }
})

setTimeout(function () {
  rs.destroy()
  rs2.destroy()
  rs3.destroy()
}, 1000)

var timeout = setTimeout(function () {
  throw new Error('timeout')
}, 5000)
