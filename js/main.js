
const NODE_TYPE_TEXT = 1
const NODE_TYPE_RECT = 2


class NodeData {
  constructor(x, y, text) {
    this.type = NODE_TYPE_TEXT
    this.x = x
    this.y = y
    this.text = text
  }

  setText(text) {
    this.text = text

    const rectPattern = /^\[(\d+)\]$/
    const rectMatchResult = text.match(rectPattern)
    if( rectMatchResult != null ) {
      this.type = NODE_TYPE_RECT
      // TODO: カラーの対応
      const rectColorId = rectMatchResult[1]
      if( rectColorId == 0 ) {
        this.color = "#FF0000"
      } else if( rectColorId == 1 ) {
        this.color = "#00FF00"
      } else {
        this.color = "#0000FF"
      }
      // TODO: width, heightが元々設定されていた場合の対応
      this.width = 50
      this.height = 50
    } else {
      this.type = NODE_TYPE_TEXT
    }
  }
}


const clone = (instance) => {
  return Object.assign(
    Object.create(
      // Set the prototype of the new object to the prototype of the instance.
      // Used to allow new object behave like class instance.
      Object.getPrototypeOf(instance),
    ),
    // Prevent shallow copies of nested structures like arrays, etc
    JSON.parse(JSON.stringify(instance)),
  )
}


// textノードのサイズを取得
const getElementDimension = (html) => {
  const element = document.createElement('span')
  
  // elementのsizeは子に依存
  element.style.display = 'inline-block'
  element.style.visibility = 'hidden'
  element.innerHTML = html

  //element.className = "node-text_selected" //..
  
  document.body.append(element)
  
  const dimensions = {}
  // selected時のborderの為に幅を広げておく
  dimensions.width = element.getBoundingClientRect().width + 2
  dimensions.height = element.getBoundingClientRect().height + 2

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


class TextNode {
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
    this.selected = false
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

  setSelected(selected) {
    if(selected) {
      this.foreignObject.classList.add("node-text_selected")
    } else {
      this.foreignObject.classList.remove("node-text_selected")
    }
    this.selected = selected
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

  isSelected() {
    return this.selected
  }
}

const rectAnchorData = [
  // 左上
  {
    relativeX : 0.0,
    relativeY : 0.0,
    left   : true,
    top    : true,
    right  : false,
    bottom : false,
    cursor : 'nw-resize',
  },
  // 上
  {
    relativeX : 0.5,
    relativeY : 0.0,
    left   : false,
    top    : true,
    right  : false,
    bottom : false,
    cursor : 'n-resize',
  },
  // 右上
  {
    relativeX : 1.0,
    relativeY : 0.0,
    left   : false,
    top    : true,
    right  : true,
    bottom : false,
    cursor : 'ne-resize',
  },
  // 右
  {
    relativeX : 1.0,
    relativeY : 0.5,
    left   : false,
    top    : false,
    right  : true,
    bottom : false,
    cursor : 'e-resize',
  },
  // 右下
  {
    relativeX : 1.0,
    relativeY : 1.0,
    left   : false,
    top    : false,
    right  : true,
    bottom : true,
    cursor : 'se-resize',
  },
  // 下
  {
    relativeX : 0.5,
    relativeY : 1.0,
    left   : false,
    top    : false,
    right  : false,
    bottom : true,
    cursor : 's-resize',
  },
  // 左下
  {
    relativeX : 0.0,
    relativeY : 1.0,
    left   : true,
    top    : false,
    right  : false,
    bottom : true,
    cursor : 'sw-resize',
  },
  // 左  
  {
    relativeX : 0.0,
    relativeY : 0.5,
    left   : true,
    top    : false,
    right  : false,
    bottom : false,
    cursor : 'w-resize',
  },
]


class Anchor {
  constructor(node, data) {
    let ns = 'http://www.w3.org/2000/svg'
    let element = document.createElementNS(ns, 'rect')
    const anchorWidth = 5
    const x = data.relativeX * node.data.width
    const y = data.relativeY * node.data.height
    const cursor = data.cursor
    
    element.setAttribute('x', x - anchorWidth/2)
    element.setAttribute('y', y - anchorWidth/2)
    element.setAttribute('width',  anchorWidth)
    element.setAttribute('height', anchorWidth)
    element.setAttribute('fill', 'white')
    element.setAttribute('stroke', 'black')
    element.setAttribute('stroke-width', 0.5)
    element.setAttribute('visibility', 'hidden')
    element.setAttribute('visibility', 'hidden')
    element.style.cursor = cursor

    node.element.appendChild(element)

    this.node = node // ターゲットとなるNode    
    this.element = element
  }

  show() {
    this.element.setAttribute('visibility', 'visible')
  }

  hide() {
    this.element.setAttribute('visibility', 'hidden')
  }
}


class RectNode {
  constructor(data) {
    this.data = data
    
    let ns = 'http://www.w3.org/2000/svg'
    let element = document.createElementNS(ns, 'g')
    element.setAttribute('transform',
                         'translate(' + data.x + ',' + data.y + ')')

    let innerElement = document.createElementNS(ns, 'rect')
    innerElement.setAttribute('x', 0)
    innerElement.setAttribute('y', 0)
    innerElement.setAttribute('width', data.width)
    innerElement.setAttribute('height', data.height)
    innerElement.setAttribute('rx', 10)
    innerElement.setAttribute('ry', 10)
    innerElement.setAttribute('fill', data.color)
    innerElement.setAttribute('fill-opacity', 0.2)
    element.appendChild(innerElement)

    this.element = element

    this.anchors = []
    for(let i=0; i<rectAnchorData.length; i++) {
      const anchor = new Anchor(this, rectAnchorData[i])
      this.anchors.push(anchor)
    }
    
    let g = document.getElementById('nodes')
    g.appendChild(element)
    
    this.innerElement = innerElement
    this.selected = false
  }

  containsPos(x, y) {
    const left   = this.data.x
    const top    = this.data.y
    const width  = this.data.width
    const height = this.data.height
    
    return (x >= left) && (x <= left+width) && (y >= top) && (y <= top+height)
  }

  setSelected(selected) {
    this.selected = selected
    this.anchors.forEach(anchor => {
      if(selected) {
        anchor.show()
      } else {
        anchor.hide()
      }
    })
  }

  onDragStart() {
    this.startElementX = this.data.x
    this.startElementY = this.data.y
  }

  onDrag(dx, dy) {
    this.data.x = this.startElementX + dx
    this.data.y = this.startElementY + dy
    this.element.setAttribute('transform',
                              'translate(' + this.data.x + ',' + this.data.y + ')')
  }
  
  x() {
    return this.data.x
  }

  y() {
    return this.data.y
  }

  remove() {
    this.element.remove()
  }

  isSelected() {
    return this.selected
  }
}


const createNode = (data) => {
  if( data.type == NODE_TYPE_TEXT ) {
    return new TextNode(data)
  } else if( data.type == NODE_TYPE_RECT ) {
    return new RectNode(data)
  } else {
    return null
  }
}


class NoteManager {
  constructor() {
    this.isMouseDown = false
    this.dragStartX = 0
    this.dragStartY = 0
    this.selectedNodes = []
    this.nodes = []
  }

  prepare() {
    document.onmousedown = event => this.onMouseDown(event)
    document.onmouseup   = event => this.onMouseUp(event)
    document.onmousemove = event => this.onMouseMove(event)
    document.body.addEventListener('keydown',  event => this.onKeyDown(event))
    document.body.addEventListener('dblclick', evenet => this.onDoubleClick(event))

    this.lastNode = null
    this.textInput = new TextInput()
  }

  clearSelection() {
    this.selectedNodes.forEach(node => {
      node.setSelected(false)
    })
    this.selectedNodes = []
  }

  showInput(asSibling) {
    this.clearSelection()
    
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

    const data = new NodeData(x, y, "")
    this.textInput.show(data)
  }

  deleteSelectedNodes() {
    this.selectedNodes.forEach(node => {
      const nodeIndex = this.nodes.indexOf(node)
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
      this.deleteSelectedNodes()
    }
  }

  onMouseDown(e) {
    const pos = this.getLocalPos(e)
    const x = pos.x
    const y = pos.y

    // 今回既に選択済のNode上のクリックだったかどうか
    let hitOnSelectedNode = false
    for(let i=0; i<this.nodes.length; i++) {
      let node = this.nodes[i]
      if( node.containsPos(x, y) && node.isSelected() ) {
        hitOnSelectedNode = true
        break
      }
    }
    
    const addingSelection = e.shiftKey || hitOnSelectedNode
    this.selectedNodes = []
    
    this.nodes.forEach(node => {
      if( node.containsPos(x, y) ) {
        this.isMouseDown = true
        this.dragStartX = x
        this.dragStartY = y
        node.setSelected(true)
        node.onDragStart()
        this.selectedNodes.push(node)
      } else {
        if( addingSelection ) {
          if( node.isSelected() ) {
            // 選択済みのものであれば
            node.onDragStart()
            this.selectedNodes.push(node)
          }
        } else {
          node.setSelected(false)
        }
      }
    })
  }

  onMouseUp(e) {
    this.isMouseDown = false
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
    const node = createNode(data)
    this.lastNode = node
    this.nodes.push(node)
  }
}

let noteManager = new NoteManager()

window.onload = () => {
  noteManager.prepare()
}
