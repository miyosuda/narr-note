const {NoteManager} = require('./note-manager')

const noteManager = new NoteManager()

window.onload = () => {
  noteManager.prepare()
}

window.addEventListener( 'resize', () => {
  noteManager.onResize()
}, false)

