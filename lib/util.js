var acorn = require('acorn/dist/acorn_loose')
var walk = require('acorn/dist/walk')
var path = require('path')
var req = require('enhanced-resolve');
var DirectoryDescriptionFileFieldAliasPlugin = require('enhanced-resolve/lib/DirectoryDescriptionFileFieldAliasPlugin');

var resolver = new req.Resolver(new req.SyncNodeJsInputFileSystem());
resolver.apply(
  new DirectoryDescriptionFileFieldAliasPlugin('package.json', 'browser'),
  new req.ModulesInDirectoriesPlugin('node', ['node_modules']),
  new req.ModuleAsFilePlugin('node'),
  new req.ModuleAsDirectoryPlugin('node'),
  new req.DirectoryDescriptionFilePlugin('package.json', ['main', 'browser']),
  new req.DirectoryDefaultFilePlugin(['index']),
  new req.FileAppendPlugin(['', '.js'])
)

var resolveToFile = exports.resolveToFile = function (name, parentFile) {
  try {
    var fullParent
    if (path.isAbsolute(parentFile)) {
      fullParent = parentFile
    } else {
      fullParent = path.resolve(process.cwd(), parentFile);
    }
    return resolver.resolveSync(fullParent, name);
  } catch(e) {
    return ''
  }
}

function checkState(state) {
  var res = {inside: false, hasThis: false, hasExport: false}
  for (var i = state.length - 2; i >= 0; i--) {
    var n = state[i];
    if (i === state.length - 2) {
      if (n.type === 'AssignmentExpression') {
        if (n.left.type === 'MemberExpression' && n.left.object) {
          var left = n.left
          if (left.object.type === 'ThisExpression') {
            res.hasThis = true
          } else if (left.object.name ==='module' && left.property.name == 'exports') {
            res.hasExport = true
          } else if (left.object.name ==='exports') {
            res.hasExport = true
          }
        }
      }
    }
    if (/Function/.test(n.type)) res.inside = true
  }
  return res
}

exports.parseModules = function (content, opts) {
  var version = opts.version || 6
  var mode = opts.mode || 'script'
  var tree = acorn.parse_dammit(content, {
    ecmaVersion: version,
    allowHashBang: true,
    sourceType: mode,
    locations: true
  })
  var requires = []
  walk.simple(tree, {
    CallExpression: function (node) {
      if (node.callee && node.callee.name === 'require') {
        var args = node.arguments
        if (!args.length) return
        var val = args[0].value
        // no relative path
        if (/^\./.test(val)) return
        // filter other extension
        if (!/^(\.js)?$/.test(path.extname(val))) return
        requires.push(val)
      }
    }
  })
  return requires
}

exports.parse = function (content, opts) {
  var version = opts.version || 6
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
          } else if (last.type === 'MethodDefinition') {
            res.fns.push(last.key)
          }
          // ignore VariableDeclarator
        }
      } else if (stat.hasThis || stat.hasExport) {
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
        var args = node.arguments
        if (!args.length) return
        var val = args[0].value
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
