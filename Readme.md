# Parsefunc

[![Build Status](https://img.shields.io/travis/chemzqm/parsefunc/master.svg?style=flat-square)](http://travis-ci.org/chemzqm/parsefunc)

Parse the top level functions in a file or a module, useful for used with editor plugin.

The backend of file parsing is done by [acorn](https://github.com/ternjs/acorn)

## Install

    npm install -g parsefunc

## Example

    # parse files
    parsefunc fileA fileB

    # parse files required by fileA
    parsefunc -r fileA

    # parse files of a module
    parsefunc -m module

    # parse files of current module
    parsefunc -m this

    # parse files of all modules in dependencies of package.json
    parsefunc -a

The output would looks like:

```
lib/index.js:9:exports.parse
lib/index.js:14:exports.parseFiles
lib/index.js:36:exports.parseModule
lib/index.js:73:exports.parseRealtive
lib/util.js:5:checkState
lib/util.js:24:exports.parse
lib/util.js:86:exports.suffixFile
```

## TODO

* es6 support
