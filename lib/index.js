var fs = require('fs')
var util = require('./util')
var path = require('path')
var parallel = require('node-parallel')

exports.parseFile = function (file, opts) {
  var encoding = opts.encoding || 'utf8'
  var content =fs.readFileSync(file, encoding)
  opts.file = file
  return util.parse(content, opts).fns
}

exports.parseModule = function (dir, opts, cb) {
  var encoding = opts.encoding || 'utf8'
  var f = path.resolve(dir, 'package.json')
  var o = JSON.parse(fs.readFileSync(f))
  var main = o.main || 'index.js'
  if (!path.extname(main)) main = main + '.js'
  var parsed = []
  var all = []
  function parse(file, callback) {
    parsed.push(file)
    fs.readFile(file, encoding, function (err, data) {
      // no error if not found
      if (err) return callback()
      var option = Object.assign({file: file}, opts)
      var res = util.parse(data, option)
      all = all.concat(res.fns)
      var requires = res.requires
      var p = parallel()
      p.timeout(5000)
      requires.forEach(function (f) {
        if (parsed.indexOf(f) !== -1) return
        p.add(function (done) {
          parse(f, done)
        })
      })
      p.done(function (err) {
        callback(err)
      })
    })
  }
  parse(path.resolve(dir, main), function (err) {
    if (err) return cb(err)
    cb(null, all)
  })
}

exports.parse = function (content, opts) {
  return util.parse(content, opts).fns
}
