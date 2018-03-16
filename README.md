# ide-clangd

Provides C and C++ language support for [Atom][atom] using
[Clangd language server](clangd)

## About

This plugin only provides some of the functionality designated by the language
server protocol. This plugin currently enables many of the features supported by Clangd:
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

+ [Atom 1.21-beta][atom]
+ [atom-ide-ui][atom-ide-ui] atom plugin
+ Clangd executable installed in your path ([prebuilt binaries][llvm-releases])

## Additional Notes

### compile_commands.json
+ In order to make this plugin work effectively, you need to generate a compile_commands.json file in a place where clangd can find it (project root). CMake is currently your best bet for making that happen. If you're doing an out-of-source build and you're already in your `project/build` directory, the CMake command to generate compile_commands.json along with your project looks like this: `cmake .. -DCMAKE_EXPORT_COMPILE_COMMANDS=ON`

Clangd won't see your compile_commands.json file if you do an out of source build like this, though. The best solution I've come up with so far is to symlink compile_commands.json from my build directory to my project root with `ln -s build/compile_commands.json .`

## Areas of interest

+ `clang-format` supports a plethora of formatting options. Need to figure out
how to use `.clang-format` options with Clangd.
+ Automatic installation of Clangd

[atom]: http://atom.io/beta
[clangd]: https://clang.llvm.org/extra/clangd.html
[langserver]: http://langserver.org
[llvm-releases]: http://releases.llvm.org/download.html
[atom-ide-ui]: https://atom.io/packages/atom-ide-ui
