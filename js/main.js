
const NODE_TYPE_NONE = 0
const NODE_TYPE_TEXT = 1
const NODE_TYPE_RECT = 2
const NODE_TYPE_LINE = 3


class NodeData {
  constructor(x, y, text) {
    this.type = NODE_TYPE_NONE
    this.x = x
    this.y = y
    this.text = text
  }

  setText(text) {
    this.text = text

    const rectPattern = /^\[(\d+)\]$/
    const rectMatchResult = text.match(rectPattern)
    if( rectMatchResult != null ) {
      // TODO: カラーの対応
      const rectColorId = rectMatchResult[1]
      if( rectColorId == 0 ) {
        this.color = "#FF0000"
      } else if( rectColorId == 1 ) {
        this.color = "#00FF00"
      } else {
        this.color = "#0000FF"
      }
      
      if( this.type != NODE_TYPE_RECT ) {
        this.width = 50
        this.height = 50
      }
      this.type = NODE_TYPE_RECT
      return
    }

    // TODO: lineのpattern matching
    if( text == "---" ) {
      if( this.type != NODE_TYPE_LINE ) {
        this.width = 100
        this.height = 0
      }
      this.type = NODE_TYPE_LINE
      return
    }
    
    this.type = NODE_TYPE_TEXT
  }
}


const calcDistanceToLineSegment = (x, y, x0, y0, x1, y1) => {
  const a = x1 - x0
  const b = y1 - y0
  const a2 = a * a
  const b2 = b * b
  const r2 = a2 + b2
  const t = -(a * (x0 - x) + b * (y0 - y))

  if( t < 0 ) {
    const dx = x0 - x
    const dy = y0 - y
    return Math.sqrt(dx*dx + dy*dy)
  } else if( t > r2 ) {
    const dx = x1 - x
    const dy = y1 - y
    return Math.sqrt(dx*dx + dy*dy)
  }
  const f = a * (y0 - y) - b * (x0 - x)
  return Math.sqrt((f * f) / r2)
}


const checkLineSegmentLineSegmentCollision = (x0, y0, x1, y1, x2, y2, x3, y3) => {
  const ua = ((x3-x2)*(y0-y2) - (y3-y2)*(x0-x2)) / ((y3-y2)*(x1-x0) - (x3-x2)*(y1-y0))
  const ub = ((x1-x0)*(y0-y2) - (y1-y0)*(x0-x2)) / ((y3-y2)*(x1-x0) - (x3-x2)*(y1-y0))
  return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1)
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


class AreaSelection {
  constructor(noteManager) {
    this.noteManager = noteManager
    this.element = document.getElementById('areaSelection')

    this.hide()
  }

  show() {
    this.shown = true
    this.element.setAttribute('visibility', 'visible')
  }

  hide() {
    this.shown = false
    this.element.setAttribute('visibility', 'hidden')
  }

  onDragStart(x, y) {
    this.startX = x
    this.startY = y

    this.element.setAttribute('x', x)
    this.element.setAttribute('y', y)
    this.element.setAttribute('width',  0)
    this.element.setAttribute('height', 0)
    
    this.show()
  }

  onDrag(x, y) {
    const minX = this.startX < x ? this.startX : x
    const maxX = this.startX < x ? x           : this.startX
    const minY = this.startY < y ? this.startY : y
    const maxY = this.startY < y ? y           : this.startY
    const width  = maxX - minX
    const height = maxY - minY

    this.element.setAttribute('x', minX)
    this.element.setAttribute('y', minY)
    this.element.setAttribute('width',  width)
    this.element.setAttribute('height', height)

    return new Area(minX, minY, width, height)
  }

  onDragEnd() {
    this.hide()
  }

  isShown() {
    return this.shown
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
    return (x >= this.left) && (x <= this.right) && (y >= this.top) && (y <= this.bottom)
  }

  containsPosOnAnchor(x, y) {
    return null
  }

  overlaps(area) {
    return area.overlapsWithArea(this.area)
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

  get left() {
    return this.data.x
  }

  get right() {
    return this.left + this.width
  }

  get top() {
    return this.data.y
  }

  get bottom() {
    return this.top + this.height
  }

  get width() {
    return this.foreignObject.width.baseVal.value
  }

  get height() {
    return this.foreignObject.height.baseVal.value
  }

  get area() {
    return new Area(this.left, this.top, this.width, this.height)
  }

  remove() {
    this.foreignObject.remove()
  }

  isSelected() {
    return this.selected
  }

  areaSize() {
    // 面積を返す
    return this.width * this.height
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
    allowMinusWH : false,
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
    allowMinusWH : false,
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
    allowMinusWH : false,
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
    allowMinusWH : false,
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
    allowMinusWH : false,
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
    allowMinusWH : false,
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
    allowMinusWH : false,
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
    allowMinusWH : false,
  },
]


const lineAnchorData = [
  // x1,y1
  {
    relativeX : 0.0,
    relativeY : 0.0,
    left   : true,
    top    : true,
    right  : false,
    bottom : false,
    cursor : 'nw-resize',
    allowMinusWH : true,
  },
  // x2,y2
  {
    relativeX : 1.0,
    relativeY : 1.0,
    left   : false,
    top    : false,
    right  : true,
    bottom : true,
    cursor : 'se-resize',
    allowMinusWH : true,
  },
]


class Area {
  constructor(left, top, width, height) {
    this.left = left
    this.top = top
    this.width = width
    this.height = height
  }

  get right() {
    return this.left + this.width
  }

  get bottom() {
    return this.top + this.height
  }

  overlapsWithArea(area) {
    return !(this.right  < area.left   ||
             this.left   > area.right  ||
             this.top    > area.bottom ||
             this.bottom < area.top)
  }

  overlapsWithLine(x0, y0, x1, y1) {
    const hitTop = checkLineSegmentLineSegmentCollision(this.left, this.top, this.right, this.top,
                                                        x0, y0, x1, y1)
    if(hitTop) { return true }
    
    const hitBottom = checkLineSegmentLineSegmentCollision(this.left, this.bottom, this.right, this.bottom,
                                                           x0, y0, x1, y1)
    if(hitBottom) { return true }

    const hitLeft = checkLineSegmentLineSegmentCollision(this.left, this.top, this.left, this.bottom,
                                                         x0, y0, x1, y1)
    if(hitLeft) { return true }

    const hitRight = checkLineSegmentLineSegmentCollision(this.right, this.top, this.right, this.bottom,
                                                          x0, y0, x1, y1)
    if(hitRight) { return true }
    return false
  }

  containsPos(x, y) {
    return (x >= this.left) && (x <= this.right) && (y >= this.top) && (y <= this.bottom)
  }
}


const ANCHOR_WIDTH = 5


class Anchor {
  constructor(node, data) {
    this.data = data
    this.node = node // ターゲットとなるNode
    
    let ns = 'http://www.w3.org/2000/svg'
    let element = document.createElementNS(ns, 'rect')
    this.element = element
    
    const cursor = this.data.cursor
    
    this.applyPos()
    
    element.setAttribute('width', ANCHOR_WIDTH)
    element.setAttribute('height', ANCHOR_WIDTH)
    element.setAttribute('fill', 'white')
    element.setAttribute('stroke', 'black')
    element.setAttribute('stroke-width', 0.5)
    element.setAttribute('visibility', 'hidden')
    element.setAttribute('visibility', 'hidden')
    element.style.cursor = cursor

    node.element.appendChild(element)
  }

  applyPos() {
    // Node座標系での位置
    const localX = this.data.relativeX * this.node.width
    const localY = this.data.relativeY * this.node.height
    
    this.element.setAttribute('x', localX - ANCHOR_WIDTH/2)
    this.element.setAttribute('y', localY - ANCHOR_WIDTH/2)
  }

  show() {
    this.element.setAttribute('visibility', 'visible')
  }

  hide() {
    this.element.setAttribute('visibility', 'hidden')
  }

  // global座標系での中心位置
  get x() {
    const localX = this.data.relativeX * this.node.width
    return this.node.left + localX
  }

  get y() {
    const localY = this.data.relativeY * this.node.height
    return this.node.top + localY
  }

  containsPos(x, y) {
    // 範囲判定に少し余裕を持たせた
    const hitWidth = ANCHOR_WIDTH + 2
    
    const left = this.x - hitWidth/2
    const top  = this.y - hitWidth/2
    return (x >= left) && (x <= left + hitWidth) && (y >= top) && (y <= top + hitWidth)
  }

  onDragStart() {
    if(this.data.left) {
      this.startLeft = this.node.left
    }
    if(this.data.right) {
      this.startRight = this.node.right
    }
    if(this.data.top) {
      this.startTop = this.node.top
    }
    if(this.data.bottom) {
      this.startBottom = this.node.bottom
    }
  }

  onDrag(dx, dy) {
    if(this.data.left) {
      let left = this.startLeft + dx
      if(!this.data.allowMinusWH) {
        if(left > this.node.right) {
          left = this.node.right
        }
      }
      this.node.setLeft(left)
    }
    if(this.data.right) {
      let right = this.startRight + dx
      if(!this.data.allowMinusWH) {
        if(right < this.node.left) {
          right = this.node.left
        }
      }
      this.node.setRight(right)
    }
    if(this.data.top) {
      let top = this.startTop + dy
      if(!this.data.allowMinusWH) {
        if(top > this.node.bottom) {
          top = this.node.bottom
        }
      }
      this.node.setTop(top)
    }
    if(this.data.bottom) {
      let bottom = this.startBottom + dy
      if(!this.data.allowMinusWH) {
        if(bottom < this.node.top) {
          bottom = this.node.top
        }
      }
      this.node.setBottom(bottom)
    }
    this.node.applyPos()
    this.node.applyWH()
  }
}


class RectNode {
  constructor(data) {
    this.data = data
    
    let ns = 'http://www.w3.org/2000/svg'
    let element = document.createElementNS(ns, 'g')
    this.element = element

    this.applyPos()
    
    let innerElement = document.createElementNS(ns, 'rect')
    this.innerElement = innerElement   
    
    innerElement.setAttribute('x', 0)
    innerElement.setAttribute('y', 0)
    innerElement.setAttribute('rx', 10)
    innerElement.setAttribute('ry', 10)
    innerElement.setAttribute('fill', data.color)
    innerElement.setAttribute('fill-opacity', 0.2)
    element.appendChild(innerElement)

    this.anchors = []
    for(let i=0; i<rectAnchorData.length; i++) {
      const anchor = new Anchor(this, rectAnchorData[i])
      this.anchors.push(anchor)
    }

    this.applyWH()
    
    let g = document.getElementById('nodes')
    g.appendChild(element)
    
    this.selected = false
  }

  containsPos(x, y) {
    const left   = this.data.x
    const top    = this.data.y
    const width  = this.data.width
    const height = this.data.height
    
    return (x >= left) && (x <= left+width) && (y >= top) && (y <= top+height)
  }

  containsPosOnAnchor(x, y) {
    if(!this.selected) {
      return null
    }
    
    for(let i=0; i<this.anchors.length; i++) {
      const anchor = this.anchors[i]
      if(anchor.containsPos(x, y)) {
        return anchor
      }
    }
    return null
  }

  overlaps(area) {
    return area.overlapsWithArea(this.area)
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

  applyPos() {
    this.element.setAttribute('transform',
                              'translate(' + this.data.x + ',' + this.data.y + ')')
  }

  applyWH() {
    this.innerElement.setAttribute('width', this.data.width)
    this.innerElement.setAttribute('height', this.data.height)

    this.anchors.forEach(anchor => {
      anchor.applyPos()
    })    
  }

  onDragStart() {
    this.startElementX = this.data.x
    this.startElementY = this.data.y
  }

  onDrag(dx, dy) {
    this.data.x = this.startElementX + dx
    this.data.y = this.startElementY + dy
    this.applyPos()
  }

  get width() {
    return this.data.width
  }

  get height() {
    return this.data.height
  }  

  get left() {
    return this.data.x
  }

  get right() {
    return this.left + this.width
  }

  get top() {
    return this.data.y
  }

  get bottom() {
    return this.top + this.height
  }

  get area() {
    return new Area(this.left, this.top, this.width, this.height)
  }

  setLeft(left) {
    const dx = left - this.data.x
    this.data.x = left
    this.data.width -= dx
  }

  setRight(right) {
    const dx = right - this.right
    this.data.width += dx
  }

  setTop(top) {
    const dy = top - this.data.y
    this.data.y = top
    this.data.height -= dy
  }

  setBottom(bottom) {
    const dy = bottom - this.bottom
    this.data.height += dy
  }

  remove() {
    this.element.remove()
  }

  isSelected() {
    return this.selected
  }

  areaSize() {
    // 面積を返す
    return this.width * this.height
  }
}


const LINE_HIT_DISTANCE = 5.0

class LineNode {
  constructor(data) {
    this.data = data
    
    let ns = 'http://www.w3.org/2000/svg'
    let element = document.createElementNS(ns, 'g')    
    this.element = element

    this.applyPos()
    
    let innerElement = document.createElementNS(ns, 'line')
    this.innerElement = innerElement
    
    innerElement.setAttribute('x1', 0)
    innerElement.setAttribute('y1', 0)
    innerElement.setAttribute('stroke', 'black')
    innerElement.setAttribute('stroke-width', 1.5)
    //innerElement.setAttribute('stroke-dasharray', "4,4") //..
    //innerElement.setAttribute('marker-start', "url(#arrow-start-black)")
    //innerElement.setAttribute('marker-end',   "url(#arrow-end-black)")
    element.appendChild(innerElement)

    this.anchors = []
    for(let i=0; i<lineAnchorData.length; i++) {
      const anchor = new Anchor(this, lineAnchorData[i])
      this.anchors.push(anchor)
    }
    
    this.applyWH()
    
    let g = document.getElementById('nodes')
    g.appendChild(element)
    
    this.selected = false
  }

  containsPos(x, y) {
    const d = calcDistanceToLineSegment(x, y,
                                        this.left, this.top,
                                        this.right, this.bottom)
    return( d <= LINE_HIT_DISTANCE && d >= -LINE_HIT_DISTANCE )
  }

  containsPosOnAnchor(x, y) {
    if(!this.selected) {
      return null
    }
    
    for(let i=0; i<this.anchors.length; i++) {
      const anchor = this.anchors[i]
      if(anchor.containsPos(x, y)) {
        return anchor
      }
    }
    return null
  }

  overlaps(area) {
    if( area.overlapsWithLine(this.left, this.top, this.right, this.bottom) ) {
      // 4辺とlineが交差している場合
      return true
    }
    if( area.containsPos(this.left, this.top) &&
        area.containsPos(this.right, this.bottom) ) {
      // 起点と終点が共にarea内の場合
      return true
    }
    return false
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

  applyPos() {
    this.element.setAttribute('transform',
                              'translate(' + this.data.x + ',' + this.data.y + ')')
  }

  applyWH() {
    this.innerElement.setAttribute('x2', this.data.width)
    this.innerElement.setAttribute('y2', this.data.height)
    
    this.anchors.forEach(anchor => {
      anchor.applyPos()
    })
  }

  onDragStart() {
    this.startElementX = this.data.x
    this.startElementY = this.data.y
  }

  onDrag(dx, dy) {
    this.data.x = this.startElementX + dx
    this.data.y = this.startElementY + dy
    this.applyPos()
  }

  get width() {
    return this.data.width
  }

  get height() {
    return this.data.height
  } 

  // 起点のx
  get left() {
    return this.data.x
  }

  // 終点のx
  get right() {
    return this.left + this.width
  }

  // 起点のy
  get top() {
    return this.data.y
  }

  // 終点のy
  get bottom() {
    return this.top + this.height
  }

  /*
  get area() {
    return new Area(this.left, this.top, this.width, this.height)
  }
  */

  setLeft(left) {
    const dx = left - this.data.x
    this.data.x = left
    this.data.width -= dx
  }

  setRight(right) {
    const dx = right - this.right
    this.data.width += dx
  }

  setTop(top) {
    const dy = top - this.data.y
    this.data.y = top
    this.data.height -= dy
  }

  setBottom(bottom) {
    const dy = bottom - this.bottom
    this.data.height += dy
  }

  remove() {
    this.element.remove()
  }

  isSelected() {
    return this.selected
  }

  areaSize() {
    const dx = this.right - this.left
    const dy = this.bottom - this.top
    const length = Math.sqrt(dx * dx + dy * dy)
    // コリジョン距離を元に面積としている
    return length * LINE_HIT_DISTANCE * 2.0
  }
}



const createNode = (data) => {
  if( data.type == NODE_TYPE_TEXT ) {
    return new TextNode(data)
  } else if( data.type == NODE_TYPE_RECT ) {
    return new RectNode(data)
  } else if( data.type == NODE_TYPE_LINE ) {
    return new LineNode(data)
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
    this.selectedAnchor = null
    this.nodes = []
    this.nodeEditied = false
  }

  prepare() {
    document.onmousedown = event => this.onMouseDown(event)
    document.onmouseup   = event => this.onMouseUp(event)
    document.onmousemove = event => this.onMouseMove(event)
    document.body.addEventListener('keydown',  event => this.onKeyDown(event))
    document.body.addEventListener('dblclick', evenet => this.onDoubleClick(event))

    this.lastNode = null
    this.textInput = new TextInput()
    this.areaSelection = new AreaSelection()
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
        x = this.lastNode.right + 30
        y = this.lastNode.top
      } else {
        x = this.lastNode.left
        y = this.lastNode.bottom + 10
      }
    }

    const data = new NodeData(x, y, "")
    this.textInput.show(data)
  }

  deleteSelectedNodes() {
    let deleted = false
    
    this.selectedNodes.forEach(node => {
      // ノードを削除
      this.removeNode(node)
      deleted = true
    })
    this.seletedNodes = []

    if( deleted ) {
      // undoバッファ対応
      this.storeState()
    }
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
    } else if(e.key === 'd' && e.ctrlKey) {
      this.duplicateSelectedNodes()
    } else if(e.key === 'z' && e.ctrlKey) {
      this.undo()
    } else if(e.key === 'Z' && e.ctrlKey) {
      this.redo()
    }
  }

  onMouseDown(e) {
    this.nodeEditied = false
    
    const pos = this.getLocalPos(e)
    const x = pos.x
    const y = pos.y

    // Anchorの上のクリックかどうか
    for(let i=0; i<this.nodes.length; i++) {
      let node = this.nodes[i]
      const anchor = node.containsPosOnAnchor(x, y)
      if(anchor != null) {
        this.selectedAnchor = anchor
        break
      }
    }

    if( this.selectedAnchor != null ) {
      this.isMouseDown = true
      this.dragStartX = x
      this.dragStartY = y

      // 選択Nodeを一時的にnon selected表示に
      this.selectedNodes.forEach(node => {
        node.setSelected(false)
      })

      this.selectedAnchor.show()
      this.selectedAnchor.onDragStart()
      return
    }

    // マウスが乗った物のなから一番小さい物をまずpick対象として選ぶ
    const pickNodeCandidates = []
    let pickNode = null    
    
    for(let i=0; i<this.nodes.length; i++) {
      const node = this.nodes[i]
      if( node.containsPos(x, y) ) {
        pickNodeCandidates.push(node)
      }
    }

    if( pickNodeCandidates.length > 0 ) {
      pickNodeCandidates.sort((node0, node1) => {
        // 面積が小さい方を優先
        return node0.areaSize() - node1.areaSize()
      })
      pickNode = pickNodeCandidates[0]
    }
    
    // 今回既に選択済のNode上のクリックだったかどうか
    let hitOnSelectedNode = false
    
    if( pickNode != null && pickNode.isSelected() ) {
      hitOnSelectedNode = true
    }

    // TODO: shift押下時にselectedを外す対応
    
    const addingSelection = e.shiftKey || hitOnSelectedNode
    this.selectedNodes = []
    
    for(let i=0; i<this.nodes.length; i++) {
      const node = this.nodes[i]
      if( addingSelection ) {
        if( node.isSelected() && node != pickNode ) {
          // 選択済みのものであれば
          // Nodeがマウスの上になろうがなかろうが、drag start処理を行う.
          node.onDragStart()
          this.selectedNodes.push(node)
        }
      } else {
        if( node != pickNode ) {
          // 選択済みだった場合に選択状態をクリア
          node.setSelected(false)
        }
      }
    }

    if( pickNode != null ) {
      pickNode.setSelected(true)
      pickNode.onDragStart()
      this.selectedNodes.push(pickNode)

      this.isMouseDown = true
      this.dragStartX = x
      this.dragStartY = y      
    } else {
      this.isMouseDown = true
      this.dragStartX = x
      this.dragStartY = y
      this.areaSelection.onDragStart(x, y)
    }
  }

  onMouseUp(e) {
    this.isMouseDown = false

    if( this.areaSelection.isShown() ) {
      this.areaSelection.onDragEnd()
    }

    if( this.selectedAnchor != null ) {
      this.selectedAnchor.hide()
      this.selectedAnchor = null
      
      // 選択Nodeを一時的にselected表示戻す
      this.selectedNodes.forEach(node => {
        node.setSelected(true)
      })
    }

    if( this.nodeEditied ) {
      // undoバッファ対応
      this.storeState()
      this.nodeEditied = false
    }
  }

  onMouseMove(e) {
    if(this.isMouseDown == true) {
      const pos = this.getLocalPos(e)
      const x = pos.x
      const y = pos.y
      const dx = x - this.dragStartX
      const dy = y - this.dragStartY

      if( this.areaSelection.isShown() ) {
        const area = this.areaSelection.onDrag(x, y)
        const adding = e.shiftKey
        
        for(let i=0; i<this.nodes.length; i++) {
          const node = this.nodes[i]

          // shift押下時のoverlapは単に追加していくやりかた
          // TODO: toggle版の対応
          if( node.overlaps(area) ) {
            // 選択済に追加
            if( !node.isSelected() ) {
              this.selectedNodes.push(node)
              node.setSelected(true)
            }
          } else if(!adding) {
            if( node.isSelected() ) {
              // 選択済から削除
              const nodeIndex = this.selectedNodes.indexOf(node)
              if(nodeIndex >= 0) {
                this.selectedNodes.splice(nodeIndex, 1)
              }
              node.setSelected(false)
            }
          }
        }
      } else {
        if( this.selectedAnchor != null ) {
          // アンカーを移動
          this.selectedAnchor.onDrag(dx, dy)
          // mouseUp時にundoバッファ対応
          this.nodeEditied = true
        } else {
          this.selectedNodes.forEach(node => {
            // ノードを移動
            node.onDrag(dx, dy)
            // mouseUp時にundoバッファ対応
            this.nodeEditied = true
          })
        }
      }
    }
  }

  onDoubleClick(e) {
    const pos = this.getLocalPos(e)
    const x = pos.x
    const y = pos.y

    for(let i=this.nodes.length-1; i>=0; i--) {
      // 最初に見つけたらそこでloopを抜ける
      let node = this.nodes[i]
      if( node.containsPos(x, y) ) {
        this.textInput.show(node.data)        
        this.removeNode(node)
        // undoバッファ対応
        this.storeState()
        break
      }
    }
  }

  addNode(nodeData) {
    const node = createNode(nodeData)
    this.nodes.push(node)
    this.lastNode = node    
    return node
  }

  removeNode(node) {
      const nodeIndex = this.nodes.indexOf(node)
      if(nodeIndex >= 0) {
        this.nodes.splice(nodeIndex, 1)
      }
      node.remove()
  }

  onTextDecided(data) {
    // TODO: テキストが空文字ならばノードを追加しない
    // 新規にノードを追加
    this.addNode(data)
    // undoバッファ対応
    this.storeState()
  }

  duplicateSelectedNodes() {
    const duplicatedNodes = []

    let duplicated = false
    
    this.selectedNodes.forEach(node => {
      const newData = clone(node.data)
      newData.x += 10
      newData.y += 10

      // 新規にノードを追加
      const newNode = this.addNode(newData)
      duplicatedNodes.push(newNode)
      duplicated = true
    })
    
    if( duplicated ) {
      // undoバッファ対応
      this.storeState()
    }

    // 選択状態をクリア
    this.clearSelection()

    // 複製ノードを選択状態にしておく
    this.selectedNodes = duplicatedNodes
    this.selectedNodes.forEach(node => {
      node.setSelected(true)
    })
  }

  undo() {
    // TODO: 未実装
    console.log('undo')
  }

  redo() {
    // TODO: 未実装
    console.log('redo')
  }

  storeState() {
    // TODO: 未実装
  }
}

let noteManager = new NoteManager()

window.onload = () => {
  noteManager.prepare()
}
