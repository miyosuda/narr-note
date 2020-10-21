// textノードのサイズを取得
const getElementDimension = (text) => {
  const element = document.createElement('span')
  
  // elementのsizeは子に依存
  element.style.display = 'inline-block'
  
  element.style.visibility = 'hidden'
  
  element.textContent = text
  
  document.body.append(element)
  
  const dimensions = {}
  dimensions.width = element.offsetWidth
  dimensions.height = element.offsetHeight

  element.remove()
  return dimensions
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

const getStringLengthWithMin = (str, minSize=5) => {
  let stringSize = getStringLength(str)
  if( stringSize < minSize ) {
    stringSize = minSize
  }
  return stringSize
}


const findEndOfMath = (delimiter, text, startIndex) => {
  let index = startIndex
  let braceLevel = 0

  const delimLength = delimiter.length

  while (index < text.length) {
    const character = text[index]

    if (braceLevel <= 0 &&
        text.slice(index, index + delimLength) === delimiter) {
      return index
    } else if (character === "\\") {
      index++
    } else if (character === "{") {
      braceLevel++
    } else if (character === "}") {
      braceLevel--
    }

    index++
  }

  return -1
}


const splitAtDelimiters = (startData, leftDelim, rightDelim, display) => {
  const finalData = []

  for(let i = 0; i < startData.length; i++) {
    if (startData[i].type === "text") {
      const text = startData[i].data

      let lookingForLeft = true
      let currIndex = 0
      let nextIndex

      nextIndex = text.indexOf(leftDelim)
      if (nextIndex !== -1) {
        currIndex = nextIndex
        finalData.push({
          type: "text",
          data: text.slice(0, currIndex),
        })
        lookingForLeft = false
      }

      while (true) {
        if (lookingForLeft) {
          nextIndex = text.indexOf(leftDelim, currIndex)
          if (nextIndex === -1) {
            break
          }

          finalData.push({
            type: "text",
            data: text.slice(currIndex, nextIndex),
          })

          currIndex = nextIndex
        } else {
          nextIndex = findEndOfMath(
            rightDelim,
            text,
            currIndex + leftDelim.length)
          if (nextIndex === -1) {
            break
          }

          finalData.push({
            type: "math",
            data: text.slice(
              currIndex + leftDelim.length,
              nextIndex),
            rawData: text.slice(
              currIndex,
              nextIndex + rightDelim.length),
            display: display,
          })

          currIndex = nextIndex + rightDelim.length
        }

        lookingForLeft = !lookingForLeft
      }

      finalData.push({
        type: "text",
        data: text.slice(currIndex),
      })
    } else {
      finalData.push(startData[i])
    }
  }

  return finalData
}


const splitWithDelimiters = (text, delimiters) => {
  let data = [{type: "text", data: text}]
  for(let i = 0; i < delimiters.length; i++) {
    const delimiter = delimiters[i]
    data = splitAtDelimiters(
      data, delimiter.left, delimiter.right,
      delimiter.display || false)
  }
  return data
}


const render = (text, element) => {
  const options = {
    throwOnError: true,
    delimiters: [
	  {left: "$$", right: "$$", display: true},
      {left: "$", right: "$", display: false}
	]
  }
  
  const data = splitWithDelimiters(text, options.delimiters)
  
  for(let i=0; i<data.length; ++i) {
    if( data[i].type === "text" && data[i].data != '' ) {
      let span = document.createElement('span')
      span.textContent = data[i].data
      element.appendChild(span)
    } else if( data[i].type === "math" ) {
      let span = document.createElement('span')

      try {
        katex.render(data[i].data, span, {
          throwOnError:true
        })
	  } catch (e) {
        if (!(e instanceof katex.ParseError)) {
          throw e;
        }
        const errorStr = "KaTeX : Failed to parse `" + data[i].data + "` with " + e
        console.log(errorStr)
        continue
      }
      element.appendChild(span)
    }
  }
}


class Node {
  constructor(mindMap, id, x, y, text) {
    this.editing = false
    
    this.text = text
    let ns = 'http://www.w3.org/2000/svg'
    let foreignObject = document.createElementNS(ns, 'foreignObject')
    foreignObject.id = 'node' + id
    
    foreignObject.x.baseVal.value = x
    foreignObject.y.baseVal.value = y
    
    /*
    //const dims = getElementDimension(text)
    foreignObject.width.baseVal.value = dims.width
    foreignObject.height.baseVal.value = dims.height
    */
    
    foreignObject.width.baseVal.value = 100
    foreignObject.height.baseVal.value = 100
    
    let g = document.getElementById('nodes')
    g.appendChild(foreignObject)
    
    this.foreignObject = foreignObject
    
    let self = this
    
    this.foreignObject.addEventListener('mousedown', function(e) {
      if( !self.isEditing() ) {
        // イベント伝搬の停止 (これがあれば、cavasの方にmousedownが伝わらないので、
        // backgroundのdragなどを別途区別できる)
        e.stopPropagation()
        // イベントキャンセル
        e.preventDefault()
        
        self.startClientX = e.clientX
        self.startClientY = e.clientY
        self.startElementX = self.foreignObject.x.baseVal.value
        self.startElementY = self.foreignObject.y.baseVal.value
        
        noteManager.onNodeDragStart(self)
      }
    })
    
    this.foreignObject.addEventListener('dblclick', function(e) {
      self.onDoubleClicked()
    })
    
    render(this.text, this.foreignObject)
  }

  onDrag(e) {
    const dx = e.clientX - this.startClientX
    const dy = e.clientY - this.startClientY
    this.foreignObject.x.baseVal.value = this.startElementX + dx
    this.foreignObject.y.baseVal.value = this.startElementY + dy
  }

  onDoubleClicked() {
    // 子を全て削除
    while(this.foreignObject.firstChild) {
      this.foreignObject.removeChild(this.foreignObject.firstChild)
    }

    let textInput = document.createElement('input')
    
    textInput.setAttribute("type", "text")
    let stringSize = getStringLengthWithMin(this.text)
    textInput.setAttribute("size", stringSize)
    textInput.setAttribute("value", this.text)
    
    textInput.addEventListener('input', () => {
      this.onTextInput(textInput.value)
    })

    textInput.addEventListener('change', () => {
      this.onTextChange(textInput.value)
    })

    textInput.addEventListener('blur', (event) => {
      this.onTextChange(textInput.value)
    })
    
    this.foreignObject.appendChild(textInput)
    
    this.textInput = textInput
    
    this.textInput.focus()
    
    this.foreignObject.width.baseVal.value = this.textInput.offsetWidth + 3
    this.foreignObject.height.baseVal.value = this.textInput.offsetHeight + 10
    
    this.editing = true
  }

  onTextInput(value) {
    // テキストが変化した
    let stringSize = getStringLengthWithMin(value)
    this.textInput.setAttribute("size", stringSize)
    
    // foreignObjectのサイズも変える
    this.foreignObject.width.baseVal.value = this.textInput.offsetWidth + 3
    this.foreignObject.height.baseVal.value = this.textInput.offsetHeight + 10
  }
  
  onTextChange(value) {
    // テキスト入力が完了した
    this.text = value
    this.editing = false

    if( this.textInput != null ) {
      const tmpTextInput = this.textInput
      this.textInput = null
      tmpTextInput.remove() // ここで再度onTextChangeが呼ばれる

      render(this.text, this.foreignObject)
    }
  }

  isEditing() {
    return this.editing
  }

  x() {
    return this.foreignObject.x.baseVal.value
  }

  y() {
    return this.foreignObject.y.baseVal.value
  }
}


class NoteManager {
  constructor() {
    this.isMouseDown = false
    this.target = null
    this.nextNodeId = 0
  }

  prepare() {
    document.onmouseup = event => this.onMouseUp(event)
    document.onmousemove = event => this.onMouseMove(event)

    document.body.addEventListener('keydown', event => this.onKeyDown(event))

    this.lastNode = null
  }

  addNode(asSibling) {
    let x = 10
    let y = 10

    if(this.lastNode != null) {
      if(asSibling) {
        x = this.lastNode.x() + 100
        y = this.lastNode.y()
      } else {
        x = this.lastNode.x()
        y = this.lastNode.y() + 50
      }
    }
    
    const text = "今日は$c = \\frac{a}{b}$である"
    let node = new Node(this, this.nextNodeId, x, y, text)
    this.nextNodeId += 1

    this.lastNode = node
  }

  onKeyDown(e) {
    if( e.target != document.body ) {
      // input入力時のkey押下は無視する
      return
    }

    if(e.key === 'Tab' ) {
      this.onTabKeyDown()
      e.preventDefault()
    } else if(e.key === 'Enter' ) {
      this.onEnterKeyDown()
    }
  }

  onMouseUp(e) {
    this.isMouseDown = false
    this.target = null
  }

  onMouseMove(e) {
    if(this.isMouseDown == true) {
      if(this.target != null) {
        this.target.onDrag(e)
      }
    }
  }

  onTabKeyDown() {
    this.addNode(true)
  }

  onEnterKeyDown() {
    this.addNode(false)
  }

  onNodeDragStart(node) {
    this.target = node
    this.isMouseDown = true
  }
}

let noteManager = new NoteManager()

window.onload = () => {
  noteManager.prepare()
}
