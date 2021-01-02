const {PrintNoteManager} = require('./note-manager')

const noteManager = new PrintNoteManager()

window.onload = () => {
  noteManager.prepare()
}

