const NODE_TYPE_TEXT = 1

class TextNodeData {
  constructor(x, y, text) {
    this.type = NODE_TYPE_TEXT
    this.x = x
    this.y = y
    this.text = text
  }

  setText(text) {
    // TODO: テキストの内容によってtypeが変わる場合があるのでそれの対応が必要
    this.text = text
  }
}


function clone(instance) {
  return Object.assign(
    Object.create(
      // Set the prototype of the new object to the prototype of the instance.
      // Used to allow new object behave like class instance.
      Object.getPrototypeOf(instance),
    ),
    // Prevent shallow copies of nested structures like arrays, etc
    JSON.parse(JSON.stringify(instance)),
  );
}


// textノードのサイズを取得
const getElementDimension = (html) => {
  const element = document.createElement('span')
  
  // elementのsizeは子に依存
  element.style.display = 'inline-block'
  element.style.visibility = 'hidden'
  element.innerHTML = html
  
  document.body.append(element)
  
  const dimensions = {}
  dimensions.width = element.getBoundingClientRect().width
  dimensions.height = element.getBoundingClientRect().height

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
      // テキスト選択無効のクラスを指定
      span.className = 'disable-select';
      span.textContent = data[i].data
      element.appendChild(span)
    } else if( data[i].type === "math" ) {
      let mathElement = null
      
      if(data[i].display) {
        mathElement = document.createElement('div')
      } else {
        mathElement = document.createElement('span')
      }
      mathElement.className = 'disable-select';
      
      try {
        katex.render(data[i].data, mathElement, {
          displayMode : data[i].display,
          throwOnError : true
        })
	  } catch (e) {
        if (!(e instanceof katex.ParseError)) {
          throw e;
        }
        const errorStr = "KaTeX : Failed to parse `" + data[i].data + "` with " + e
        console.log(errorStr)
        let errorSpan = document.createElement('span')
        errorSpan.textContent = "error"
        element.appendChild(errorSpan)
        continue
      }
      element.appendChild(mathElement)
    }
  }
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
        // enterキーが押されたが入力が変更されていなかった場合
        if(!this.textChanged) {
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
    noteManager.onTextDecided(this.data)
    this.hide()
  }
}


class Node {
  constructor(data) {
    this.data = data
    
    let ns = 'http://www.w3.org/2000/svg'
    let foreignObject = document.createElementNS(ns, 'foreignObject')
    foreignObject.x.baseVal.value = this.data.x
    foreignObject.y.baseVal.value = this.data.y
    
    let g = document.getElementById('nodes')
    g.appendChild(foreignObject)
    
    this.foreignObject = foreignObject
    
    this.prepare()
  }

  containsPos(x, y) {
    const left   = this.foreignObject.x.baseVal.value
    const top    = this.foreignObject.y.baseVal.value
    const width  = this.foreignObject.width.baseVal.value
    const height = this.foreignObject.height.baseVal.value

    return (x >= left) && (x <= left+width) && (y >= top) && (y <= top+height)
  }

  prepare() {
    render(this.data.text, this.foreignObject)

    const dims = getElementDimension(this.foreignObject.innerHTML)
    this.foreignObject.width.baseVal.value = dims.width
    this.foreignObject.height.baseVal.value = dims.height
  }

  onDragStart() {
    this.startElementX = this.data.x
    this.startElementY = this.data.y
  }

  onDrag(dx, dy) {
    this.data.x = this.startElementX + dx
    this.data.y = this.startElementY + dy
    this.foreignObject.x.baseVal.value = this.data.x
    this.foreignObject.y.baseVal.value = this.data.y
  }
  
  x() {
    return this.data.x
  }

  y() {
    return this.data.y
  }

  remove() {
    this.foreignObject.remove()
  }
}


class NoteManager {
  constructor() {
    this.isMouseDown = false
    this.dragStartX = 0
    this.dragStartY = 0
    this.selctedNodes = []
    this.nodes = []
  }

  prepare() {
    document.onmousedown = event => this.onMouseDown(event)
    document.onmouseup   = event => this.onMouseUp(event)
    document.onmousemove = event => this.onMouseMove(event)
    document.body.addEventListener('keydown',  event => this.onKeyDown(event))
    document.body.addEventListener('dblclick', evenet => this.onDoubleClick(event))

    this.lastNode = null
    this.currentNode = null

    this.textInput = new TextInput()
  }

  showInput(asSibling) {
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

    const data = new TextNodeData(x, y, "")
    this.textInput.show(data)
  }

  deleteCurrentNode() {
    this.selectedNodes.forEach(node => {
      const nodeIndex = this.nodes.indexOf(this.currentNode)
      if(nodeIndex >= 0) {
        this.nodes.splice(nodeIndex, 1)
      }
      node.remove()
    })
    this.seletedNodes = []
  }

  getLocalPos(e) {
    const rect = document.getElementById('svg').getBoundingClientRect()
    
    const x = e.clientX
    const y = e.clientY

    const pos = {}
    pos.x = x - rect.left
    pos.y = y - rect.top
    return pos
  }

  onKeyDown(e) {
    if( e.target != document.body ) {
      // input入力時のkey押下は無視する
      return
    }

    if(e.key === 'Tab' ) {
      this.showInput(true)
      e.preventDefault()
    } else if(e.key === 'Enter' ) {
      this.showInput(false)
    } else if(e.key === 'Backspace' ) {
      this.deleteCurrentNode()
    }
  }

  onMouseDown(e) {
    const pos = this.getLocalPos(e)
    const x = pos.x
    const y = pos.y

    this.selectedNodes = []

    this.nodes.forEach(node => {
      if( node.containsPos(x, y) ) {
        this.selectedNodes.push(node)
        this.isMouseDown = true
        this.dragStartX = x
        this.dragStartY = y
        
        node.onDragStart()
      }
    })
  }

  onMouseUp(e) {
    this.isMouseDown = false
    //..this.selectedNodes = []
  }

  onMouseMove(e) {
    if(this.isMouseDown == true) {
      const pos = this.getLocalPos(e)
      const x = pos.x
      const y = pos.y
      
      const dx = x - this.dragStartX
      const dy = y - this.dragStartY
      this.selectedNodes.forEach(node => {
        node.onDrag(dx, dy)
      })
    }
  }

  onDoubleClick(e) {
    const pos = this.getLocalPos(e)
    const x = pos.x
    const y = pos.y

    for(let i=0; i<this.nodes.length; i++) {
      // 最初に見つけたらそこでloopを抜ける
      let node = this.nodes[i]
      if( node.containsPos(x, y) ) {
        this.textInput.show(node.data)
        this.nodes.splice(i, 1)
        node.remove()
        break
      }
    }
  }

  onTextDecided(data) {
    let node = new Node(data)
    this.lastNode = node
    this.nodes.push(node)
  }
}

let noteManager = new NoteManager()

window.onload = () => {
  noteManager.prepare()
}
