var fs = require('fs')
var util = require('./util')
var path = require('path')
var parallel = require('node-parallel')
var unique = require('array-unique')
var timeout = 3000


exports.parse = function (content, opts) {
  opts = opts || {}
  return util.parse(content, opts).fns
}

function parseFile(file, opts, cb) {
  var encoding = opts.encoding || 'utf8'
  fs.readFile(file, encoding, function (err, data) {
    if (err) return cb(err)
    var option = Object.assign({file: file}, opts)
    var res = util.parse(data, option)
    cb(null, res)
  })
}

exports.parseFiles = function (files, opts, cb) {
  opts = opts || {}
  var p = parallel()
  p.timeout(timeout)
  var fns = []
  files.forEach(function (f) {
    p.add(function (done) {
      parseFile(f, opts, function (err, res) {
        if (err) return done(err)
        fns = fns.concat(res.fns)
        done()
      })
    })
  })
  p.done(function (err) {
    cb(err, fns)
  })
}

exports.parseModules = function (file, opts, cb) {
  var encoding = opts.encoding || 'utf8'
  opts.self = true
  var fns = []
  fs.readFile(file, encoding, function (err, content) {
    if (err) return cb(err)
    var names = util.parseModules(content, opts)
    names = unique(names)
    console.log(names)
    var files = names.map(function (name) {
      return util.resolveToFile(name, file)
    })
    files = files.filter(function (f) {
      return !!f
    })
    var p = parallel()
    p.timeout(timeout)
    files.forEach(function (f) {
      p.add(function (done) {
        parseRelative(f, Object.assign({file: f}, opts), function (err, data) {
          if (err) return done(err)
          fns = fns.concat(data)
          done()
        })
      })
    })
    p.done(function (err) {
      cb(err, fns)
    })
  })
}

exports.parseModule = function (dir, opts, cb) {
  opts = opts || {}
  var encoding = opts.encoding || 'utf8'
  var f = path.resolve(dir, 'package.json')
  var o = JSON.parse(fs.readFileSync(f))
  var main = o.main || 'index.js'
  main = util.suffixFile(main)
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
      p.timeout(timeout)
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

var parseRelative = exports.parseRelative = function (relative, opts, cb) {
  opts = opts || {}
  var encoding = opts.encoding || 'utf8'
  fs.readFile(relative, encoding, function (err, data) {
    if (err) return cb(err)
    var fns = []
    var res = util.parse(data, Object.assign({file: relative}, opts))
    if (opts.self) fns = fns.concat(res.fns)
    var requires = unique(res.requires)
    if (!requires.length) return cb(null, fns)
    var p = parallel()
    p.timeout(timeout)
    requires.forEach(function (f) {
      p.add(function (done) {
        fs.readFile(f, encoding, function (err, data) {
          // not throw if not found
          if (err) return done()
          var option = Object.assign({file: f}, opts)
          var res = util.parse(data, option)
          fns = fns.concat(res.fns)
          done()
        })
      })
    })
    p.done(function (err) {
      cb(err, fns)
    })
  })
}
