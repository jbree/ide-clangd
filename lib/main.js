const cp = require('child_process');
const {AutoLanguageClient} = require('atom-languageclient')

class ClangdClient extends AutoLanguageClient {
  getGrammarScopes () { return ['source.c', 'source.cpp']; }
  getLanguageName () { return 'C'; }
  getServerName () { return 'Clangd'; }
  getClangCommand () { return 'clangd'; }

  startServerProcess () {
    const config = { 'linux': 'linux', 'darwin': 'mac' }[process.platform];

    const serverHome = __dirname;
    if (config == null) {
      throw Error (`${this.getServerName()} not supported on ${process.platform}`);
    }
    const args = [];
    const childProcess = cp.spawn(this.getClangCommand(), args, {cwd: serverHome});
    console.log(`clangd pid: ${childProcess.pid}`);

    // childProcess.stdout.setEncoding('utf8');
    // childProcess.stdout.on('data', (data) => {
    //   console.log(`server: ${data}`);
    // });

    return childProcess;
  }
}

module.exports = new ClangdClient();
