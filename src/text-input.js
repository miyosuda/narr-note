const {getElementDimension, renderMathOnPos} = require('./text-utils')

const KEY_ENTER = 13
const KEY_SHIFT = 16

// ショートカット設定
const shortCutSetting = {
  'i' : {
    text : '\\',
    pos: 1,
  },
  '1' : {
    text : '\\mathbf{}',
    pos: 8,
  },
  '2' : {
    text : '\\frac{}{}',
    pos: 6,
  },
  '3' : {
    text : '{}',
    pos: 1,
  },
  '4' : {
    text : '\\partial ',
    pos: 9,
  },
  '5' : {
    text : '\\left(  \\right)',
    pos: 7,
  },
}


// 全角を2文字としてカウントする文字列カウント
const getStringLength = (str) => {
  if( str == null ) {
    return 0
  }
  
  let result = 0
  for(let i=0; i<str.length; i++) {
    const chr = str.charCodeAt(i)
    if((chr >= 0x00 && chr < 0x81) ||
       (chr === 0xf8f0) ||
       (chr >= 0xff61 && chr < 0xffa0) ||
       (chr >= 0xf8f1 && chr < 0xf8f4)) {
      result += 1
    } else {
      result += 2
    }
  }
  return result
}


const getStringLengthAndRow = (str, minSize=5) => {
  const texts = str.split('\n')
  const rowSize = texts.length

  let maxLength = minSize
  for(let i=0; i<texts.length; i++) {
    const text = texts[i]
    const length = getStringLength(text)
    if(length > maxLength) {
      maxLength = length
    }
  }

  return [maxLength, rowSize]
}


class TextInput {
  constructor(noteManager) {
    this.noteManager = noteManager
    this.foreignObject = document.getElementById('textInputObj')
    
    const input = document.getElementById('textInput')
    this.input = input
    
    this.textChanged = false
    this.shiftOn = false
    
    const inputContainer = document.getElementById('textInputContainer')
    this.inputContainer = inputContainer
    
    this.mathPreviewElement = null

    input.addEventListener('input', () => {
      this.onTextInput()
    })

    input.addEventListener('change', () => {
      this.onTextChange(input.value)
    })

    input.addEventListener('blur', (event) => {
      this.onTextChange(input.value)
    })

    input.addEventListener('keydown', (event) => {
      const key = event.keyCode || event.charCode || 0

      if( (event.ctrlKey || event.metaKey) && shortCutSetting[event.key] ) {
        // ショートカット対応
        this.processShortCut(shortCutSetting[event.key])
      }

      if(key == KEY_ENTER) { // Enter key
        if(!this.shiftOn) {
          // シフトキーが押されていなかった場合、入力決定とする
          this.onTextChange(input.value)
        }
      } else if(key == KEY_SHIFT) { // Shift key
        // shiftキー押下
        this.shiftOn = true
      }
    })

    input.addEventListener('keyup', (event) => {
      const key = event.keyCode || event.charCode || 0
      
      if(key == KEY_SHIFT) {
        // shiftキー離した
        this.shiftOn = false
      }
    })
    
    input.addEventListener('keyup',       (event)=>{this.onCaretMove(event)})
    //input.addEventListener('mousedown',   (event)=>{this.onCaretMove(event)})
    input.addEventListener('mouseup',   (event)=>{this.onCaretMove(event)})
    input.addEventListener('touchstart',  (event)=>{this.onCaretMove(event)})
    //input.addEventListener('input',       (event)=>{this.onCaretMove(event)})
    input.addEventListener('paste',       (event)=>{this.onCaretMove(event)})
    input.addEventListener('cut',         (event)=>{this.onCaretMove(event)})
    //input.addEventListener('mousemove',   ()=>{this.onCaretMove(event)})
    input.addEventListener('select',      (event)=>{this.onCaretMove(event)})
    input.addEventListener('selectstart', (event)=>{this.onCaretMove(event)})
    
    this.hide()
  }

  show(data, initialCaretPos=0) {
    this.data = data
    this.input.value = this.data.text

    this.textOnShown = this.data.text
    
    this.updateInputSize()

    // 先にdisplayをセットしておかないとinput.offsetWidth等が取れない
    this.foreignObject.style.display = 'block'
    
    this.foreignObject.x.baseVal.value = this.data.x
    this.foreignObject.y.baseVal.value = this.data.y
    this.updateOuterSize()
    
    this.input.focus()
    if( initialCaretPos != 0 ) {
      this.input.setSelectionRange(initialCaretPos, initialCaretPos)
    }
    
    this.textChanged = false
    this.shown = true
  }

  hide() {
    this.foreignObject.style.display = 'none'
    this.shown = false

    this.removePreview()
  }

  updateInputSize() {
    // テキストが変化した
    let [stringLength, rows] = getStringLengthAndRow(this.input.value)
    this.input.style.width = (stringLength * 11 + 10) + "px"
    this.input.setAttribute('rows', rows)
  }

  updateOuterSize() {
    // foreignObjectのサイズを更新する
    const dims = getElementDimension(this.inputContainer.innerHTML)
    this.foreignObject.width.baseVal.value = dims.width
    this.foreignObject.height.baseVal.value = dims.height
  }

  onTextInput() {
    // テキストが変化した
    this.textChanged = true
    this.updateInputSize()
    
    // foreignObjectのサイズも変える
    this.updateOuterSize()
  }
  
  onTextChange(value) {
    if(!this.shown) {
      // hide()した後に呼ばれる場合があるのでその場合をskip
      return
    }
    
    // テキスト入力が完了した
    this.data.setText(value)
    const textChanged = this.textOnShown != value
    this.noteManager.onTextDecided(this.data, textChanged)
    this.hide()
  }

  removePreview() {
    if( this.mathPreviewElement != null ) {
      this.mathPreviewElement.remove()
      this.mathPreviewElement = null
    }
  }

  onCaretMove(event) {
    const caretPos = this.input.selectionStart
    //console.log("caretPos=" + caretPos + " event=" + event) //..
    
    // TODO: 毎回renderしなくても、text変更時以外はrenderしない様に軽量化が可能
    const mathElement = renderMathOnPos(this.input.value, caretPos)
    //console.log("mathElement=" + mathElement) //..

    if( mathElement != null ) {
      this.removePreview()
      this.inputContainer.appendChild(mathElement)
      const dims = getElementDimension(this.inputContainer.innerHTML)
      this.foreignObject.width.baseVal.value = dims.width
      this.foreignObject.height.baseVal.value = dims.height
      this.mathPreviewElement = mathElement
    } else {
      this.removePreview()
    }
  }

  isShown() {
    return this.shown
  }

  processShortCut(shortCut) {
    const caretPos = this.input.selectionStart
    
    const insertingText = shortCut.text
    const insertCaretPos = shortCut.pos
      
    const text = this.input.value
    const textPre = text.slice(0, caretPos)
    const textPost = text.slice(caretPos)
      
    this.input.value = textPre + insertingText + textPost
    this.input.setSelectionRange(caretPos+insertCaretPos, caretPos+insertCaretPos)
      
    this.onTextInput()
  }
}

module.exports = {
  TextInput,
}
