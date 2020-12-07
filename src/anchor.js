const ANCHOR_WIDTH = 5


const calcPerpendicularPoint = (sx, sy, ex, ey, px, py) => {
  // 垂線の足を求める
  let rx = null
  let ry = null
  
  if(sx == ex) {
    // 線分が垂直の場合
    rx = sx
    ry = py
  } else if(sy == ey) {
    // 線分が水平の場合
    rx = px
    ry = sy
  } else{
    // それ以外
    // 線分の傾き
    const m1 = (ey - sy) / (ex - sx)
    // 線分のY切片
    const b1 = sy - (m1 * sx)
    
    // 点ptを通り、線分lineに垂直な線の傾き
    const m2 = -1.0 / m1
    // 点ptを通り、線分lineに垂直な線のY切片
    const b2 = py - (m2 * px)

    // 交点算出
    rx = (b2 - b1) / (m1 - m2)
    ry = (b2 * m1 - b1 * m2) / (m1 - m2)
  }
  
  const pos = {}
  pos.x = rx
  pos.y = ry
  return pos
}


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

  isDiagonal() {
    if( (this.data.left && this.data.top) ||
        (this.data.right && this.data.top) ||
        (this.data.right && this.data.bottom) ||
        (this.data.left && this.data.bottom) ) {
      return true
    } else {
      return false
    }
  }
  
  onDrag(dx, dy, shiftDown) {
    if( shiftDown && this.isDiagonal() ) {
      this.processDragDiagonal(dx, dy)
    } else {
      this.processDragNormal(dx, dy)
    }
  }

  processDragDiagonal(dx, dy) {
    if(this.data.left && this.data.top ) {
      const px = this.startLeft + dx
      const py = this.startTop + dy
      const sx = this.node.right
      const sy = this.node.bottom
      const ex = this.startLeft
      const ey = this.startTop
      const r = calcPerpendicularPoint(sx, sy, ex, ey, px, py)

      const left = r.x
      this.setNodeLeft(left)
      const top = r.y
      this.setNodeTop(top)      

    } else if(this.data.right && this.data.top ) {
      const px = this.startRight + dx
      const py = this.startTop + dy
      const sx = this.node.left
      const sy = this.node.bottom
      const ex = this.startRight
      const ey = this.startTop
      const r = calcPerpendicularPoint(sx, sy, ex, ey, px, py)

      const right = r.x
      this.setNodeRight(right)
      const top = r.y
      this.setNodeTop(top)
      
    } else if(this.data.right && this.data.bottom ) {
      const px = this.startRight + dx
      const py = this.startBottom + dy
      const sx = this.node.left
      const sy = this.node.top
      const ex = this.startRight
      const ey = this.startBottom
      const r = calcPerpendicularPoint(sx, sy, ex, ey, px, py)
      
      const right = r.x
      this.setNodeRight(right)
      const bottom = r.y
      this.setNodeBottom(bottom)
      
    } else if(this.data.left && this.data.bottom ) {
      const px = this.startLeft + dx
      const py = this.startBottom + dy
      const sx = this.node.right
      const sy = this.node.top
      const ex = this.startLeft
      const ey = this.startBottom
      const r = calcPerpendicularPoint(sx, sy, ex, ey, px, py)

      const left = r.x
      this.setNodeLeft(left)
      const bottom = r.y
      this.setNodeBottom(bottom)
      
    }

    this.node.applyPos()
    this.node.applyWH()
  }
  
  processDragNormal(dx, dy) {
    if(this.data.left) {
      let left = this.startLeft + dx
      this.setNodeLeft(left)
    }
    if(this.data.right) {
      let right = this.startRight + dx
      this.setNodeRight(right)
    }
    if(this.data.top) {
      let top = this.startTop + dy
      this.setNodeTop(top)
    }
    if(this.data.bottom) {
      let bottom = this.startBottom + dy
      this.setNodeBottom(bottom)
    }
    this.node.applyPos()
    this.node.applyWH()
  }

  setNodeLeft(left) {
    if(!this.data.allowMinusWH) {
      if(left > this.node.right) {
        left = this.node.right
      }
    }
    this.node.setLeft(left)
  }

  setNodeRight(right) {
    if(!this.data.allowMinusWH) {
      if(right < this.node.left) {
        right = this.node.left
      }
    }
    this.node.setRight(right)
  }

  setNodeTop(top) {
    if(!this.data.allowMinusWH) {
      if(top > this.node.bottom) {
        top = this.node.bottom
      }
    }
    this.node.setTop(top)
  }

  setNodeBottom(bottom) {
    if(!this.data.allowMinusWH) {
      if(bottom < this.node.top) {
        bottom = this.node.top
      }
    }
    this.node.setBottom(bottom)
  }
}



module.exports = {
  Anchor,
}
