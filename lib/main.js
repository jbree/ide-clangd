const cp = require('child_process');
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

    return childProcess;
  }
}

module.exports = new ClangdClient();
