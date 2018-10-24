const cp = require('child_process');
const fs = require('fs');
const hasbin = require('hasbin');
const path = require('path');
const { AutoLanguageClient, DownloadFile } = require('atom-languageclient');

const scrapeDownloadUrl = require('./scrape');

const PACKAGE_NAME = require('../package.json').name;

const parameter = {
  commandArguments: `${PACKAGE_NAME}.commandArguments`,
  executable: `${PACKAGE_NAME}.executable`,
  useClangdOnPath: `${PACKAGE_NAME}.useClangdOnPath`,
};


/// @return true if clangd is on the user's $PATH
function isClangdOnPath ()
{
  return new Promise((resolve) => {
    hasbin('clangd', result => resolve(result));
  });
}


/// check if the file located at path is executable
/// @param filePath string
/// @return Promise<bool>
function isExecutable (filePath)
{
  return new Promise((resolve) => {
    fs.access(filePath, fs.X_OK, err => resolve(!err));
  });
}


/// check if the file located at path exists
/// @param filePath string
/// @return Promise<bool>
function exists (filePath)
{
  return new Promise((resolve) => {
    fs.access(filePath, fs.W_OK, err => resolve(!err));
  });
}


/// prompt user, use existing or download clangd
/// @return Promise<bool>
function promptShouldUseExistingClangd ()
{
  return new Promise((resolve) => {
    const notification = atom.notifications.addInfo(
      'Clangd was found on your path',
      {
        buttons: [
          {
            text: 'Use mine',
            onDidClick: () => {
              resolve(true);
              if (notification != null) {
                notification.dismiss();
              }
            },
          },
          {
            text: 'Download',
            onDidClick: () => {
              resolve(false);
              if (notification != null) {
                notification.dismiss();
              }
            },
          },
        ],
        detail: `Do you want to use your version, or let ${PACKAGE_NAME} `
          + 'download its own separate copy?',
        dismissable: true,
      },
    );
  });
}


/// prompt user, should install clangd?
/// @param description string why do we need to install clangd
/// @return Promise<bool>
function promptShouldInstallClangd (detail)
{
  return new Promise((resolve) => {
    const notification = atom.notifications.addInfo(
      'Download Clangd?',
      {
        buttons: [
          {
            text: 'Not Now',
            onDidClick: () => {
              resolve(false);
              if (notification != null) {
                notification.dismiss();
              }
            },
          },
          {
            text: 'Download',
            onDidClick: () => {
              resolve(true);
              if (notification != null) {
                notification.dismiss();
              }
            },
          },
        ],
        dismissable: true,
        description: `${PACKAGE_NAME} needs to install \`clangd\`, which is `
            + 'part of the LLVM Project, in order to function. Download now?',
        detail,
      },
    );
  });
}


/// An AutoLanguageClient which launches Clangd to provide C and C++ language
/// support through atom-ide
class ClangdClient extends AutoLanguageClient {
  constructor ()
  {
    // enable debug output
    // atom.config.set('core.debugLSP', true);
    super();

    this.statusElement = document.createElement('span');
    this.statusElement.className = 'inline-block';
  }

  getGrammarScopes () { return ['source.c', 'source.cpp', 'c', 'cpp']; }

  getLanguageName () { return 'C'; }

  getServerName () { return 'Clangd'; }

  /// update status bar item with provided text
  /// @param text string text to put in status bar
  updateStatusBar (text)
  {
    this.statusElement.textContent = `${this.name} ${text}`;

    if (!this.statusTile && this.statusBar) {
      this.statusTile = this.statusBar.addLeftTile(
        { item: this.statusElement, priority: 1000 },
      );
    }
  }


  /// conform to Atom StatusBar API
  /// @param statusBar StatusBar atom statusbar object to consume
  consumeStatusBar (statusBar)
  {
    this.statusBar = statusBar;
  }


  /// conform to AutoLanguageClient API
  /// @param projectPath string path to project requiring this language server
  /// @return Promise<ChildProcess> spawned clangd language server process
  startServerProcess (projectPath)
  {
    const platform = {
      linux: 'linux',
      darwin: 'mac',
    }[process.platform];

    if (platform == null) {
      throw Error(`${this.getServerName()} not supported on ${process.platform}`);
    }

    const args = [];
    //TODO add support for custom args
    // const args = atom.config.get(parameter.commandArguments);

    const promise = this.getPathToClangdExecutable()
      .then(clangdPath => cp.spawn(clangdPath, args, { cwd: projectPath }));

    return promise;
  }


  /// check config variables for path to clangd, and offer user option to
  /// install if it is not available
  /// @return Promise<string> path to clangd
  async getPathToClangdExecutable ()
  {
    const useClangdOnPath = atom.config.get(parameter.useClangdOnPath);

    if (useClangdOnPath) {
      if (!await isClangdOnPath()) {
        const installPrompt = 'Clangd not found on path';

        if (await promptShouldInstallClangd(installPrompt) === true) {
          return this.installClangd();
        }
      }
      return 'clangd';
    }

    const executablePath = atom.config.get(parameter.executable);

    // is this first run? on first run, executablePath is falsy
    if (!executablePath) {
      if (await isClangdOnPath()) {
        // should we use the version on the path?
        if (await promptShouldUseExistingClangd()) {
          atom.config.set(parameter.useClangdOnPath, true);
          return 'clangd';
        }

        // user wants to install new clangd
        return this.installClangd();
      }

      // if no preexisting clangd, ask user if they want us to install
      if (await promptShouldInstallClangd() === true) {
        return this.installClangd();
      }

      throw Error('No installation of Clangd available');
    }

    // we already know path to clangd. if it's good, use it.
    if (await isExecutable(executablePath)) {
      return executablePath;
    }

    // otherwise, prompt user to fix by installing.
    const installPrompt = 'Unable to launch clangd at specified path '
        + `${executablePath}`;
    if (await promptShouldInstallClangd(installPrompt) === true) {
      return this.installClangd();
    }

    throw Error('No installation of Clangd available');
  }


  /// install clangd
  /// @return Promise<string> path to clangd
  async installClangd ()
  {
    // tmp dir to download into.
    //TODO use fs.mkdtempSync instead
    const downloadPath = path.join(__dirname, '..', 'download');

    // contains local copy(ies?) of clang/llvm
    const serverPath = path.join(__dirname, '..', 'server');

    // load decompress plugins
    const decompress = require('decompress');
    const decompressTarxz = require('decompress-tarxz');
    const decompressOptions = {
      plugins: [decompressTarxz()],
      strip: 1, // strip off the parent dir of tarball contents
    };

    // make temporary download dir
    if (!await exists(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }

    // make directory to hold installed servers
    if (!await exists(serverPath)) {
      fs.mkdirSync(serverPath);
    }

    // scrape download info
    const info = await scrapeDownloadUrl();

    const savePath = path.join(downloadPath, info.file);

    await DownloadFile(
      info.url,
      savePath,
      (bytes, percent) => {
        const progress = percent ? `${percent}%` : `${(bytes / 1e6).toFixed(1)}MB`;
        this.updateStatusBar(`${progress} downloaded`);
      },
    );

    const extractPath = path.join(serverPath, `v${info.version}`);

    // make directory to extract this version of server
    if (!await exists(extractPath)) {
      fs.mkdirSync(extractPath);
    }

    // decompress the server
    this.updateStatusBar('unpacking');
    await decompress(savePath, extractPath, decompressOptions);

    const newPath = path.join(extractPath, '/bin/clangd');

    // confirm downloaded clangd exists and is executable
    if (await exists(newPath) && await isExecutable(newPath)) {
      this.updateStatusBar('installed');
      atom.config.set(parameter.executable, newPath);
      atom.config.set(parameter.useClangdOnPath, false);
      atom.notifications.addInfo(`Clangd has been downloaded to ${newPath}`);
      return newPath;
    }

    this.updateStatusBar('error');

    throw Error('Could not execute downloaded clangd');
  }
}

module.exports = new ClangdClient();

module.exports.config = {
  useClangdOnPath: {
    type: 'boolean',
    title: 'Search for Clangd on path',
    description: 'Check this box to use an installation of clangd that already exists on your executable path (Ignore Clangd executable).',
    default: false,
  },
  executable: {
    type: 'string',
    title: 'Clangd executable',
    description: 'Specify the location of Clangd if it is not in your $PATH. Reload or restart to take effect',
    default: '',
  },
  commandArguments: {
    type: 'string',
    title: 'Command-line arguments',
    description: 'Specify arguments passed to Clangd at launch, separated by comma (`,`). Format as `-arg1=value1,-arg2=value2`. Reload or restart to take effect',
    default: '',
  },
};
