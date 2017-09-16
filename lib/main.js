const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const {shell} = require('electron')

const {AutoLanguageClient} = require('atom-languageclient')

class ClangdClient extends AutoLanguageClient {
  getGrammarScopes () { return ['source.c', 'source.cpp']; }
  getLanguageName () { return 'C'; }
  getServerName () { return 'Clangd'; }
  getClangCommand () { return 'clangd'; }
  
  constructor () {
    super();
    this.statusElement = document.createElement('span');
    this.statusElement.className = 'inline-block';
  }
  
  startServerProcess () {
    console.log('starting server');
    const config = { 'linux': 'linux'}[process.platform];
    const serverHome = path.join(__dirname);
    if (config == null) {
      throw Error (`${this.getServerName()} not supported on ${process.platform}`);
    }
    const args = ['-run-synchronously'];
    const childProcess = cp.spawn(this.getClangCommand(), args, {cwd: serverHome});
    console.log(`clangd pid: ${childProcess.pid}`);
    
    childProcess.stdout.setEncoding('utf8');
    childProcess.stdout.on('data', (data) => {
      console.log(`server: ${data}`);
    });
    
    childProcess.stdin.setEncoding('utf8');
    childProcess.stdin.on('data', (data) => {
      console.log(`client: ${data}`);
    })
    
    return childProcess;
  }
  
  preInitialization(connection) {
    // connection.onCustom('language/status', (e) => this.updateStatusBar(`${e.type.replace(/^Started$/, '')} ${e.message}`))
    // connection.onCustom('language/actionableNotification', this.actionableNotification.bind(this));
    connection.onCustom('$/partialResult', () => {});
  }
  
  updateStatusBar (text) {
    this.statusElement.textContent = `${this.name} ${text}`
  }
  
  actionableNotification (notification) {
    const options = { dismissable: true, detail: this.getServerName() }
    if (Array.isArray(notification.commands)) {
      options.buttons = notification.commands.map(c => ({ text: c.title, onDidClick: (e) => onActionableButton(e, c.command) }))
      // TODO: Deal with the actions
    }

    const notificationDialog = this.createNotification(notification.severity, notification.message, options)

    const onActionableButton = (event, commandName) => {
      const commandFunction = this.commands[commandName]
      if (commandFunction != null) {
        commandFunction()
      } else {
        console.log(`Unknown actionableNotification command '${commandName}'`)
      }
      notificationDialog.dismiss()
    }
  }
}

module.exports = new ClangdClient