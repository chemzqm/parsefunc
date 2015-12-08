# Parsefunc

[![Build Status](https://img.shields.io/travis/chemzqm/parsefunc/master.svg?style=flat-square)](http://travis-ci.org/chemzqm/parsefunc)

Parse the top level functions in a file or a module, useful for used with editor plugin.

## Install

    npm install parsefunc

## Usage

```
Usage: parsefunc file0 file1 file2 ...

Options:

  -h, --help             output usage information
  -V, --version          output the version number
  -f, --file [file]      parse a file
  -m, --module [module]  parse a module
  -e, --encoding [name]  set file encoding
  -a --all               parse all dependencies module of current project
```

If module name is this, parse files used by current module.

## TODO

* es6 support
