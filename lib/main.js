const cp = require('child_process');
const { shell } = require("electron");
const {AutoLanguageClient} = require('atom-languageclient')

const PACKAGE_NAME = require('../package.json').name;

class ClangdClient extends AutoLanguageClient {

  constructor () {
    // enable debug output
    // atom.config.set('core.debugLSP', true);
    super();
  }
  getGrammarScopes () { return ['source.c', 'source.cpp']; }
  getLanguageName () { return 'C'; }
  getServerName () { return 'Clangd'; }

  startServerProcess (projectPath) {
    const config = atom.config.get(PACKAGE_NAME);

    const platform = { 'linux': 'linux', 'darwin': 'mac' }[process.platform];
    if (platform == null) {
      throw Error (`${this.getServerName()} not supported on ${process.platform}`);
    }

    const rawArgs = config.commandArguments;
    let args = []
    if (config.commandArguments && config.commandArguments.length > 0) {
      args = config.commandArguments.split(',');
    }

    const childProcess = cp.spawn(config.clangdCommand, args, {cwd: projectPath});

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

module.exports.config = {
    clangdCommand: {
      type: 'string',
      title: 'Clangd executable',
      description: 'Specify the location of clangd if it is not in your $PATH. Reload or restart to take effect',
      default: 'clangd'
    },
    commandArguments: {
      type: 'string',
      title: 'Command-line arguments',
      description: 'Specify arguments passed to clangd at launch, separated by comma (`,`). Format as `-arg1=value1,-arg2=value2`. Reload or restart to take effect',
      default: ''
    }
};
