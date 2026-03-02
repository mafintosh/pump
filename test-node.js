var pump = require('./index')

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

var wsClosed = false
var rsClosed = false
var callbackCount = 0

var check = function () {
  if (wsClosed && rsClosed && callbackCount === 1) {
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
  callbackCount++
  if (callbackCount > 1) throw new Error('pump callback called more than once')
  check()
})

if (res !== ws) {
  throw new Error('should return last stream')
}

setTimeout(function () {
  rs.destroy()
}, 1000)

var timeout = setTimeout(function () {
  throw new Error('timeout')
}, 5000)
