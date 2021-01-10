const { app, Menu, BrowserWindow, shell } = require('electron')
const ipc = require('electron').ipcMain
const dialog = require('electron').dialog
const fs = require('fs')


CONFIRM_ANSWER_SAVE   = 0
CONFIRM_ANSWER_DELETE = 1
CONFIRM_ANSWER_CANCEL = 2


let editDirty = false
let filePath = null


ipc.on('set-dirty', (event, dirty) => {
  editDirty = dirty
})


const showSaveConfirmDialog = () => {
  const options = {
    type: 'info',
    buttons: ['Save', 'Delete', 'Cancel'],
    message: 'File not saved. Save?',
  }
  
  const ret = dialog.showMessageBoxSync(options)
  console.log("ret=" + ret)
  return ret
}

let onSavedFunction = null

const save = (browserWindow, onSavedHook=null) => {
  if( filePath == null ) {
    const options = {
      title: 'Save',
      filters: [
        {
          name: 'Data',
          extensions: ['.json']
        }
      ]
    }
    
    const path = dialog.showSaveDialogSync(options)
    if( path != null ) {
      onSavedFunction = onSavedHook
      browserWindow.webContents.send('selected-save-file', path)
      // filePathの設定
      filePath = path
    }
  } else {
    onSavedFunction = onSavedHook
    browserWindow.webContents.send(
      'request', 'save'
    )
  }
}


const onSaveFinished = () => {
  if( onSavedFunction != null ) {
    onSavedFunction()
  }
}


ipc.on('save-finished', (event) => {
  onSaveFinished()
})


let lastWorkerWindow = null
let lastPDFPath = null

ipc.on('print-to-pdf', (event, arg) => {
  const options = {
    title: 'Export',
    filters: [
      {
        name: 'PDF file',
        extensions: ['.pdf']
      }
    ]
  }
  
  const pdfPath = dialog.showSaveDialogSync(options)
  if( pdfPath == null ) {
    return
  }
  
  if (lastWorkerWindow !== null) {
    // エラーにより前回のページが残っていた場合の対処
    lastWorkerWindow.close()
  }
  
  const workerWin = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })
  workerWin.loadURL('file://' + __dirname + '/index-print.html')

  workerWin.on('closed', () => {
    lastWorkerWindow = null
  })

  workerWin.on('ready-to-show', () => {
    workerWin.send('print-to-pdf', arg)
  })

  lastWorkerWindow = workerWin
  lastPDFPath = pdfPath
})

ipc.on('ready-print-to-pdf', (event, dims) => {
  const win = BrowserWindow.fromWebContents(event.sender)

  const options = {
    printBackground: true,
    pageSize: {
      width: parseInt(dims.width * 200),
      height: parseInt(dims.height * 200),
    },
    marginsType: 1,
  }

  win.webContents.printToPDF(options).then(data => {
    fs.writeFile(lastPDFPath, data, (err) => {
      if( err ) {
        throw err
      }
    })
    shell.openExternal('file://' + lastPDFPath)
    win.close()
  })
})


const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.on('close', (event) => {
    if( editDirty ) {
      const quit = () => {
        app.quit()
      }
      
      const ret = showSaveConfirmDialog()
      if( ret == CONFIRM_ANSWER_SAVE ) {
        // save後にquitを実行する
        event.preventDefault()
        save(win, quit)
      } else if( ret == CONFIRM_ANSWER_DELETE ) {
        editDirty = false
      } else {
        event.preventDefault()
      }
    }
  })

  win.loadURL('file://' + __dirname + '/index.html')
  //win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
  /*
  if (process.platform !== 'darwin') {
    app.quit()
  }
  */
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
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: (menuItem, browserWindow, event) => {
          const quit = () => {
            app.quit()
          }
          
          if( editDirty ) {
            const ret = showSaveConfirmDialog()
            if( ret == CONFIRM_ANSWER_SAVE ) {
              // save後にquitを実行する
              save(browserWindow, quit)
            } else if( ret == CONFIRM_ANSWER_DELETE ) {
              editDirty = false
              quit()
            }
          } else {
            quit()
          }
        },
      },      
    ]
  },
  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        accelerator: 'CmdOrCtrl+N',
        click: (menuItem, browserWindow, event) => {
          const requestNewFile = () => {
            browserWindow.webContents.send(
              'request', 'new-file'
            )
            // filePathの設定
            filePath = null
          }
          
          if( editDirty ) {
            const ret = showSaveConfirmDialog()
            if( ret == CONFIRM_ANSWER_SAVE ) {
              // save後にnew fileを実行する
              save(browserWindow, requestNewFile)
            } else if( ret == CONFIRM_ANSWER_DELETE ) {
              requestNewFile()
            }
          } else {
            requestNewFile()
          }
        },
      },
      {
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click: (menuItem, browserWindow, event) => {
          const requestOpen = () => {
            const options = {
              properties: ['openFile']
            }
            const pathes = dialog.showOpenDialogSync(options)
            if(pathes != null && pathes.length > 0) {
              const path = pathes[0]
              browserWindow.webContents.send('selected-load-file', path)
              // filePathの設定
              filePath = path
            }
          }
          
          if( editDirty ) {
            const ret = showSaveConfirmDialog()
            if( ret == CONFIRM_ANSWER_SAVE ) {
              // save後にopenする
              save(browserWindow, requestOpen)
            } else if( ret == CONFIRM_ANSWER_DELETE ) {
              requestOpen()
            }
          } else {
            requestOpen()
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: (menuItem, browserWindow, event) => {
          save(browserWindow)
        }
      },
      {
        label: 'Export PDF',
        accelerator: 'CmdOrCtrl+E',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'export-pdf'
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
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'undo'
          )
        }
      },
      {
        label: 'Redo',
        accelerator: 'CmdOrCtrl+Shift+Z',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'redo'
          )
        }
      },
      {
        type: 'separator',
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'cut'
          )
        }        
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'copy'
          )
        }
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'paste'
          )
        }
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
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'selectall'
          )
        }
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
