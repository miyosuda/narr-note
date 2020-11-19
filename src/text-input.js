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

const getStringLengthWithMin = (str, minSize=5) => {
  let stringSize = getStringLength(str)
  if( stringSize < minSize ) {
    stringSize = minSize
  }
  return stringSize
}


class TextInput {
  constructor(noteManager) {
    this.noteManager = noteManager
    this.foreignObject = document.getElementById('textInputObj')
    
    let input = document.getElementById('textInput')
    this.textChanged = false

    input.addEventListener('input', () => {
      this.onTextInput(input.value)
    })

    input.addEventListener('change', () => {
      this.onTextChange(input.value)
    })

    input.addEventListener('blur', (event) => {
      this.onTextChange(input.value)
    })

    input.addEventListener('keydown', (event) => {
      const key = event.keyCode || event.charCode || 0;
      if(key == 13) {
        // enterキーが押されたが入力が変更されていなかった or 入力が空だった場合
        if(!this.textChanged || this.input.value.length==0) {
          this.onTextChange(input.value)
        }
      }
    })

    this.input = input
    
    this.hide()
  }

  show(data) {
    this.data = clone(data)
    let stringSize = getStringLengthWithMin(this.data.text)
    this.input.setAttribute("size", stringSize)
    this.input.value = this.data.text

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

  onTextInput(value) {
    this.textChanged = true
    
    // テキストが変化した
    let stringSize = getStringLengthWithMin(value)
    this.input.setAttribute("size", stringSize)
    
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
}


module.exports = {
  TextInput,
}
