var acorn = require('acorn/dist/acorn_loose')
var walk = require('acorn/dist/walk')
var path = require('path')

function checkState(state) {
  var res = {inside: false, hasThis: false}
  for (var i = state.length - 2; i >= 0; i--) {
    var n = state[i];
    if (i === state.length - 2) {
      if (n.type === 'AssignmentExpression') {
        if (n.left.type === 'MemberExpression' && n.left.object) {
          var left = n.left
          if (left.object.type === 'ThisExpression') {
            res.hasThis = true
          }
        }
      }
    }
    if (/Function/.test(n.type)) res.inside = true
  }
  return res
}

exports.parse = function (content, opts) {
  var version = opts.version || 5
  if (!opts.file) throw new Error('file path required for locations')
  var mode = opts.mode || 'script'
  var tree = acorn.parse_dammit(content, {
    ecmaVersion: version,
    allowHashBang: true,
    sourceType: mode,
    locations: true,
    sourceFile: opts.file
  })
  var res = {fns: [], requires: []}
  var dir = path.dirname(opts.file)

  walk.ancestor(tree, {
    FunctionExpression: function (node, state) {
      var stat = checkState(state)
      var left
      if (!stat.inside) {
        if (node.id && node.id.name) {
          res.fns.push(node)
        } else {
          var last = state[state.length - 2]
          if (last.type === 'Property') {
            res.fns.push(last.key)
          } else if(last.type === 'AssignmentExpression') {
            res.fns.push(last.left)
          }
          // ignore VariableDeclarator
        }
      } else if (stat.hasThis) {
        left = state[state.length - 2].left
        if (left) res.fns.push(left)
      }
    },
    FunctionDeclaration: function (node, state) {
      var stat = checkState(state)
      if (!stat.inside && node.id.name) res.fns.push(node)
    },
    CallExpression: function (node) {
      if (node.callee && node.callee.name === 'require') {
        var val = node.arguments[0].value
        // only relative path
        if (!/^\./.test(val)) return
        var p = path.resolve(dir, val)
        p = path.relative(process.cwd(), p)
        var ext = path.extname(p)
        if (!ext) {
          p = p + '.js'
        } else if (ext === '.') {
          p = p + 'js'
        }
        res.requires.push(p)
      }
    }
  })
  res.fns.sort(function (a, b) {
    return a.loc.start.line - b.loc.start.line
  })
  return res
}

exports.suffixFile = function (file) {
  if (path.extname(file)) return file
  return file + '.js'
}
