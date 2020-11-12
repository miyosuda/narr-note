const ANCHOR_WIDTH = 5


export class Anchor {
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
