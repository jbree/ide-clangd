const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const { shell } = require("electron");
const {AutoLanguageClient, DownloadFile} = require('atom-languageclient')

const serverDownloadUrl = 'http://releases.llvm.org/5.0.0/clang+llvm-5.0.0-x86_64-apple-darwin.tar.xz';
const serverDownloadSize = 252642380;
const serverDir = 'clang+llvm-5.0.0-x86_64-apple-darwin/bin';
const serverLauncher = serverDir + '/clangd';


class ClangdClient extends AutoLanguageClient {

  constructor () {
    // enable debug output
    atom.config.set('core.debugLSP', true);
    super();

    this.statusElement = document.createElement('span');
    this.statusElement.className = 'inline-block';
  }
  getGrammarScopes () { return ['source.c', 'source.cpp']; }
  getLanguageName () { return 'C'; }
  getServerName () { return 'Clangd'; }
  getClangCommand () { return 'clangd'; }

  startServerProcess (projectPath) {
    const serverHome = path.join(__dirname, '..', 'server')

    const config = { 'linux': 'linux', 'darwin': 'mac' }[process.platform];
    if (config == null) {
      throw Error (`${this.getServerName()} not supported on ${process.platform}`);
    }

    const args = [];
    // const childProcess = cp.spawn(this.getClangCommand(), args, {cwd: projectPath});

    // childProcess.on("error", err =>
    //   atom.notifications.addError(
    //     "Unable to start the Clangd language server.",
    //     {
    //       dismissable: true,
    //       buttons: [
    //         {
    //           text: "View README",
    //           onDidClick: () =>
    //             shell.openExternal("https://github.com/jbree/ide-clangd")
    //         },
    //         {
    //           text: "Download Clang",
    //           onDidClick: () =>
    //             shell.openExternal("http://releases.llvm.org/download.html")
    //         }
    //       ],
    //       description:
    //         "This can occur if you do not have Clangd installed or if it is not in your path.\n\nViewing the README is strongly recommended."
    //     }
    //   )
    // );

    return this.installServerIfRequired(serverHome)
      .then(() => {
        const command = (path.join(serverHome, serverLauncher));
        this.logger.debug(`starting "${command}"`)
        const childProcess = cp.spawn(command, {cwd: path.join(serverHome, serverDir)});
        childProcess.on('error', err => {
          atom.notifications.addError(
            "Unable to start the Clangd language server",
            {
              dismissable: true
            }
          )
        })
        return childProcess;
      }
    )

    // return childProcess;
  }

  installServerIfRequired (serverHome) {
    this.logger.log('ifreqd');
    return this.isServerInstalled(serverHome)
      .then(doesExist => { if (!doesExist) return this.installServer(serverHome) })
  }

  isServerInstalled (serverHome) {
    const exists = this.fileExists(path.join(serverHome, serverLauncher));
    this.logger.log(`exists ${exists}`);
    return exists
  }

  installServer (serverHome) {
    const localFileName = path.join(serverHome, 'download.tar.gz')
    const decompress = require('decompress')
    const decompressTarxz = require('decompress-tarxz')
    const decompressOptions = {
      plugins: [ decompressTarxz() ]
    }

    this.logger.log(`Downloading ${serverDownloadUrl} to ${localFileName}`);
    return this.fileExists(serverHome)
      .then(doesExist => { if (!doesExist) fs.mkdirSync(serverHome) })
      .then(() => DownloadFile(serverDownloadUrl, localFileName, (bytesDone, percent) => this.updateStatusBar(`downloading ${percent}%`), serverDownloadSize))
      .then(() => this.updateStatusBar('unpacking'))
      .then(() => decompress(localFileName, serverHome, decompressOptions))
      .then(() => this.fileExists(path.join(serverHome, serverLauncher)))
      .then(doesExist => { if (!doesExist) throw Error(`Failed to install the ${this.getServerName()} language server`) })
      .then(() => this.updateStatusBar('installed'))
      .then(() => fs.unlinkSync(localFileName))
  }

  consumeStatusBar (statusBar) {
    this.statusTile = statusBar.addRightTile({ item: this.statusElement, priority: 1000 })
  }

  updateStatusBar (text) {
    this.statusElement.textContent = `${this.name} ${text}`
  }

  fileExists (path) {
    return new Promise((resolve, reject) => {
      fs.access(path, fs.R_OK, error => {
        resolve(!error || error.code !== 'ENOENT')
      })
    })
  }
}

module.exports = new ClangdClient();
