/*global describe, it*/

var parser = require('..')
var fs = require('fs')
var path = require('path')
var assert = require('assert')

function resolve(p) {
  return path.resolve(__dirname, './scripts/' + p)
}

describe('parse funcs', function() {
  it('should parse content', function (done) {
    fs.readFile(resolve('inner.js'), 'utf8', function (err, data) {
      if (err) return done(err)
      var fns = parser.parse(data, {file: 'stdin'})
      assert.equal(fns.length, 4)
      var names = fns.map(function (node) {
        return toString(node)
      })
      assert(names.indexOf('abc') !== -1)
      assert(names.indexOf('this.xyz') !== -1)
      assert(names.indexOf('abc.prototype.tmd') !== -1)
      assert(names.indexOf('test') !== -1)
      done()
    })
  })

  it('should parse files', function (done) {
    var files = [resolve('inner.js'), resolve('other.js')]
    parser.parseFiles(files, null, function (err, fns) {
      if (err) return done(err)
      assert.equal(fns.length, 5)
      var names = fns.map(function (node) {
        return toString(node)
      })
      assert(names.indexOf('other') !== -1)
      done()
    })
  })

  it('should parse module', function (done) {
    var dir = resolve('module')
    parser.parseModule(dir, {}, function (err, fns) {
      if (err)  return done(err)
      var names = fns.map(function (node) {
        return toString(node)
      })
      assert.equal(names.length, 3)
      assert(names.indexOf('main') !== -1)
      assert(names.indexOf('main.prototype.test') !== -1)
      assert(names.indexOf('exports.test') !== -1)
      done()
    })
  })

  it('sholud parse relative files', function (done) {
    var relative = resolve('module/index.js')
    parser.parseRealtive(relative, {}, function (err, fns) {
      if (err)  return done(err)
      assert.equal(fns.length, 1)
      done()
    })
  })
})

function toString (node) {
  switch (node.type) {
    case 'Identifier':
      return node.name || ''
    case 'ThisExpression':
      return 'this'
    case 'ArrayExpression':
      var str = node.elements.reduce(function (p, node) {
        return p + toString(node)
      }, '')
      return '[' + str + ']'
    case 'MemberExpression':
      return toString(node.object) + '.' +  toString(node.property)
    case 'Literal':
      return node.raw
    case 'FunctionDeclaration':
      return node.id.name
    case 'FunctionExpression':
      if (node.id == null) return ''
      return node.id.name
    default:
      return ''
  }
}

