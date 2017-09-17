# ide-clangd

Provides C and C++ language support for [Atom][atom] using
[Clangd language server](clangd)

## About

This plugin only provides some of the functionality designated by the language
server protocol. This plugin currently supports 3 of the 5 features supported by Clangd itself:
+ Diagnostics (errors, warnings, info),
+ Code Formatting,
+ Go To Definition
+ ~~Completion~~
+ ~~Fix-its~~

Clangd, the language server upon which this plugin depends, is still a "work in
progress" according to [langserver.org][langserver], and only implements some
parts of the protocol.

This plugin is in very early development, so don't expect it to be fully
functional.

All contributions and feedback are appreciated.

## Requirements

+ [Atom 1.21-beta][atom]
+ [atom-ide-ui][atom-ide-ui] atom plugin
+ Clangd executable installed in your path ([prebuilt binaries][llvm-releases])

## Additional Notes

+ In the current release of Clangd, there's no way to tell it where to look for
headers. The binary distribution includes headers, and by creating a symlink to
the `include/c++` directory in your `/usr/local/include/` directory, headers
will be recognized.

## Areas of interest

+ Autocomplete is supported by Clangd, but what comes back isn't useful, so it's
disable for now.
+ `clang-format` supports a plethora of formatting options. Need to figure out
how to use `.clang-format` options with Clangd.

[atom]: http://atom.io/beta
[clangd]: https://clang.llvm.org/extra/clangd.html
[langserver]: http://langserver.org
[llvm-releases]: http://releases.llvm.org/download.html
[atom-ide-ui]: https://atom.io/packages/atom-ide-ui
