const {NoteManager} = require('./note-manager')

let noteManager = new NoteManager()

window.onload = () => {
  noteManager.prepare()
}

window.addEventListener( 'resize', () => {
  noteManager.onResize()
}, false)
