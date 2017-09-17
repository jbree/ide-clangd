const cp = require('child_process');
const { shell } = require("electron");
const {AutoLanguageClient} = require('atom-languageclient')

class ClangdClient extends AutoLanguageClient {

  constructor () {
    // enable debug output
    // atom.config.set('core.debugLSP', true);
    super();
  }
  getGrammarScopes () { return ['source.c', 'source.cpp']; }
  getLanguageName () { return 'C'; }
  getServerName () { return 'Clangd'; }
  getClangCommand () { return 'clangd'; }

  startServerProcess (projectPath) {
    const config = { 'linux': 'linux', 'darwin': 'mac' }[process.platform];
    if (config == null) {
      throw Error (`${this.getServerName()} not supported on ${process.platform}`);
    }

    const args = [];
    const childProcess = cp.spawn(this.getClangCommand(), args, {cwd: projectPath});

    childProcess.on("error", err =>
      atom.notifications.addError(
        "Unable to start the Clangd language server.",
        {
          dismissable: true,
          buttons: [
            {
              text: "View README",
              onDidClick: () =>
                shell.openExternal("https://github.com/jbree/ide-clangd")
            },
            {
              text: "Download Clang",
              onDidClick: () =>
                shell.openExternal("http://releases.llvm.org/download.html")
            }
          ],
          description:
            "This can occur if you do not have Clangd installed or if it is not in your path.\n\nViewing the README is strongly recommended."
        }
      )
    );

    return childProcess;
  }
}

module.exports = new ClangdClient();
