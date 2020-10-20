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


class Node {
  constructor(mindMap, id, x, y, text) {
    const dims = getElementDimension(text)

    let span = document.createElement('span')
    span.textContent = text

    this.span = span

    let ns = 'http://www.w3.org/2000/svg'
    let foreignObject = document.createElementNS(ns, 'foreignObject')
    foreignObject.id = 'node' + id

    foreignObject.x.baseVal.value = x
    foreignObject.y.baseVal.value = y

    foreignObject.width.baseVal.value = dims.width
    foreignObject.height.baseVal.value = dims.height

    let g = document.getElementById('nodes')
    g.appendChild(foreignObject)
    foreignObject.appendChild(span)
    
    this.foreignObject = foreignObject

    let self = this    

    foreignObject.addEventListener('mousedown', function(e) {
      if( !self.isEditing() ) {
        // イベント伝搬の停止 (これがあれば、cavasの方にmousedownが伝わらないので、
        // backgroundのdragを別途区別できる)
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
    
    foreignObject.addEventListener('dblclick', function(e) {
      self.onDoubleClicked()
    })
  }

  onDrag(e) {
    const dx = e.clientX - this.startClientX
    const dy = e.clientY - this.startClientY
    this.foreignObject.x.baseVal.value = this.startElementX + dx
    this.foreignObject.y.baseVal.value = this.startElementY + dy
  }

  onDoubleClicked() {
    const text = this.span.textContent
    
    this.span.remove()
    this.span = null

    let textInput = document.createElement('input')
    
    textInput.setAttribute("type", "text")
    let stringSize = getStringLengthWithMin(text)
    textInput.setAttribute("size", stringSize)
    textInput.setAttribute("value", text)
    
    textInput.addEventListener('input', () => {
      this.onTextInput(textInput.value)
    })
    
    textInput.addEventListener('change', () => {
      this.onTextChange(textInput.value)
    })

    this.foreignObject.appendChild(textInput)

    this.textInput = textInput

    this.foreignObject.width.baseVal.value = this.textInput.offsetWidth + 3
    this.foreignObject.height.baseVal.value = this.textInput.offsetHeight + 10
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
    let span = document.createElement('span')
    span.textContent = value
    this.span = span
    
    this.foreignObject.appendChild(span)

    this.textInput.remove()
  }

  isEditing() {
    return this.span == null
  }
}


class NoteManager {
  constructor() {
    this.isMouseDown = false
    this.target = null
    this.startClientX = 0
    this.startClientY = 0
    this.startElementX = 0
    this.startElementY = 0
    this.canvasX = 0
    this.canvasY = 0
    this.nextNodeId = 0
  }

  prepare() {
    document.onmouseup = event => this.onMouseUp(event)
    document.onmousemove = event => this.onMouseMove(event)

    let svg = document.getElementById('svg')
    svg.addEventListener('mousedown', event => this.onSVGMouseDown(event))
    
    document.body.addEventListener('keydown', event => this.onKeyDown(event))
  }

  addNode(x, y) {
    const text = 'node'
    let node = new Node(this, this.nextNodeId, x, y, text)
    this.nextNodeId += 1
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
      } else {
        let canvas = document.getElementById('canvas')
        
        const dx = e.clientX - this.startClientX
        const dy = e.clientY - this.startClientY
        this.canvasX = this.startElementX + dx
        this.canvasY = this.startElementY + dy

        canvas.setAttribute('transform',
                            'translate(' + this.canvasX + ',' + this.canvasY + ')')
      }
    }
  }

  onSVGMouseDown(e) {
    this.isMouseDown = true
    this.startClientX = e.clientX
    this.startClientY = e.clientY
    this.startElementX = this.canvasX
    this.startElementY = this.canvasY
  }

  onTabKeyDown() {
    this.addNode(10, 10)
  }

  onEnterKeyDown() {
    this.addNode(100, 100)
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
