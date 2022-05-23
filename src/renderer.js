import './css/katex.css';
import './css/reset.css';
import './css/style.css';

import './css/fonts/KaTeX_AMS-Regular.woff2';
import './css/fonts/KaTeX_Caligraphic-Bold.woff2';
import './css/fonts/KaTeX_Caligraphic-Regular.woff2';
import './css/fonts/KaTeX_Fraktur-Bold.woff2';
import './css/fonts/KaTeX_Fraktur-Regular.woff2';
import './css/fonts/KaTeX_Main-Bold.woff2';
import './css/fonts/KaTeX_Main-BoldItalic.woff2';
import './css/fonts/KaTeX_Main-Italic.woff2';
import './css/fonts/KaTeX_Main-Regular.woff2';
import './css/fonts/KaTeX_Math-BoldItalic.woff2';
import './css/fonts/KaTeX_Math-Italic.woff2';
import './css/fonts/KaTeX_SansSerif-Bold.woff2';
import './css/fonts/KaTeX_SansSerif-Italic.woff2';
import './css/fonts/KaTeX_SansSerif-Regular.woff2';
import './css/fonts/KaTeX_Script-Regular.woff2';
import './css/fonts/KaTeX_Size1-Regular.woff2';
import './css/fonts/KaTeX_Size2-Regular.woff2';
import './css/fonts/KaTeX_Size3-Regular.woff2';
import './css/fonts/KaTeX_Size4-Regular.woff2';
import './css/fonts/KaTeX_Typewriter-Regular.woff2';

import {NoteManager} from './note-manager'

const noteManager = new NoteManager()

window.onload = () => {
  noteManager.prepare()
}

window.addEventListener( 'resize', () => {
  noteManager.onResize()
}, false)
