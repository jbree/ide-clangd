# ide-clangd

Provides C and C++ language support for [Atom] using
[Clangd language server][Clangd]

## About

This plugin only provides some of the functionality designated by the language
server protocol. This plugin currently enables many of the features supported by
Clangd:
+ Diagnostics (errors, warnings, info)
+ Code Formatting
+ Completion
+ Fix-its
+ Function signature help
+ Document highlights
+ ~~Go To Definition~~ (it will go to the declaration, but not the definition)
+ ~~Rename~~ (not yet supported by Atom)

All contributions and feedback are appreciated.

## Requirements

+ [Atom] 1.21 or later
+ [atom-ide-ui] atom plugin
+ [Clangd] executable installed in your path ([prebuilt binaries])

## Compilation Database

In order to make this plugin work effectively, clangd requires information about
how your code should be compiled. There are two options: compile_commands.json,
or compile_flags.txt.

### compile_commands.json

[CMake] is currently your best bet for generating a compile_commands.json file.
The command to generate compile_commands.json along with your project looks
something like this: `cmake (SOURCE_DIR) -DCMAKE_EXPORT_COMPILE_COMMANDS=ON`

CMake doesn't include header information in the compile_commands.json file. To
rectify this, I use a tool called [compdb].

Clangd won't see your compile_commands.json file if it's placed in your build
directory, so you should either symlink it to your project directory, or have
compdb generate its output there.

### compile_flags.txt

[Another supported solution][compile-flags] is to make a compile_flags.txt file
and place it in your project directory. Clangd will treat all project files with
the same options. A simple compile_flags.txt might look something like this:

```
-std=c++11
-Iinclude
-DMY_DEBUG_FLAG
```

## Areas of interest

+ Automatic installation of Clangd

[Atom]: http://atom.io/
[Clangd]: https://clang.llvm.org/extra/clangd.html
[CMake]: https://cmake.org
[compdb]: https://github.com/Sarcasm/compdb
[compile-flags]: https://clang.llvm.org/docs/JSONCompilationDatabase.html#alternatives
[langserver]: http://langserver.org
[prebuilt binaries]: http://releases.llvm.org/download.html
[atom-ide-ui]: https://atom.io/packages/atom-ide-ui
