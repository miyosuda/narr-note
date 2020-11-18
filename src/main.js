const { app, BrowserWindow } = require('electron')
const ipc = require('electron').ipcMain
const dialog = require('electron').dialog


ipc.on('open-file-dialog', function(event) {
  const options = {
    properties: ['openFile']
  }
  const pathes = dialog.showOpenDialogSync(options)
  if(pathes != null && pathes.length > 0) {
    event.sender.send('selected-file', pathes[0])
  }
})

ipc.on('save-dialog', function(event) {
  const options = {
    title: 'Save',
    filters: [
      {
        name: 'Data',
        extensions: ['.json']
      }
    ]
  }
  
  const path = dialog.showSaveDialogSync(options);
  if( path != null ) {
    event.sender.send('saved-file', path)
  }
})


function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadURL('file://' + __dirname + '/index.html');
  //win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
