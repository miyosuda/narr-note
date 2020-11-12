import {NoteManager} from './note_manager'

let noteManager = new NoteManager()

window.onload = () => {
  noteManager.prepare()
}
