const {clone} = require('./utils')

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
    
    let input = document.getElementById('textInput')
    this.textChanged = false
    this.shiftOn = false

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
      
      if(key == 13) {
        if(!this.shiftOn) {
          // シフトキーが押されていなかった場合、入力決定とする
          this.onTextChange(input.value)
        }
      } else if(key == 16) {
        // shiftキー押下
        this.shiftOn = true
      }
    })

    input.addEventListener('keyup', (event) => {
      const key = event.keyCode || event.charCode || 0
      
      if(key == 16) {
        // shiftキー離した
        this.shiftOn = false
      }
    })
    
    this.input = input
    
    this.hide()
  }

  show(data) {
    this.data = clone(data)
    this.input.value = this.data.text
    
    this.updateSize()
    
    this.foreignObject.x.baseVal.value = this.data.x
    this.foreignObject.y.baseVal.value = this.data.y
    this.foreignObject.width.baseVal.value = this.input.offsetWidth + 3
    this.foreignObject.height.baseVal.value = this.input.offsetHeight + 10
    this.foreignObject.style.display = 'block' // TODO: blockで良いかどうか確認
    
    this.input.focus()
    
    this.textChanged = false
    this.shown = true
  }

  hide() {
    this.foreignObject.style.display = 'none'
    this.shown = false
  }

  updateSize() {
    // テキストが変化した
    let [stringLength, rows] = getStringLengthAndRow(this.input.value)
    this.input.style.width = (stringLength * 10) + "px"
    this.input.setAttribute('rows', rows)
  }

  onTextInput() {
    // テキストが変化した
    this.textChanged = true
    this.updateSize()
    
    // foreignObjectのサイズも変える
    this.foreignObject.width.baseVal.value = this.input.offsetWidth + 3
    this.foreignObject.height.baseVal.value = this.input.offsetHeight + 10
  }
  
  onTextChange(value) {
    if(!this.shown) {
      // hide()した後に呼ばれる場合があるのでその場合をskip
      return
    }
    
    // テキスト入力が完了した
    this.data.setText(value)
    this.noteManager.onTextDecided(this.data)
    this.hide()
  }

  isShown() {
    return this.shown
  }
}


module.exports = {
  TextInput,
}
