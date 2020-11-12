import {Anchor} from '../anchor'


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


const LINE_HIT_DISTANCE = 5.0

export class LineNode {
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
