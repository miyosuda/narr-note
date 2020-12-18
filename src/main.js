const { app, Menu, BrowserWindow } = require('electron')
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


// ElectronのMenuの設定
const templateMenu = [
  {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: 'File',
    submenu: [
      {
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'open-file'
          )
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'save'
          )
        }
      },
      {
        role: 'close'
      },
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        role: 'undo',
      },
      {
        role: 'redo',
      },
      {
        type: 'separator',
      },
      {
        role: 'cut',
      },
      {
        role: 'copy',
      },
      {
        role: 'paste',
      },
      {
        type: 'separator',
      },
      {
        label: 'Duplicate',
        accelerator: 'CmdOrCtrl+D',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'duplicate'
          )
        }
      },
      {
        type: 'separator',
      },      
      {
        role: 'selectall',
      },
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        role: 'reload',
      },
      {
        type: 'separator',
      },
      {
        role: 'resetzoom',
      },
      {
        role: 'zoomin',
      },
      {
        role: 'zoomout',
      },
      {
        type: 'separator',
      },
      {
        role: 'togglefullscreen',
      },
      {
        role:
        'toggleDevTools'
      },      
    ]
  }
]

const menu = Menu.buildFromTemplate(templateMenu)
Menu.setApplicationMenu(menu)
