import {Anchor} from '../anchor'
import {Area} from '../area'


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


export class RectNode {
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
