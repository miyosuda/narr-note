
const checkLineSegmentLineSegmentCollision = (x0, y0, x1, y1, x2, y2, x3, y3) => {
  const ua = ((x3-x2)*(y0-y2) - (y3-y2)*(x0-x2)) / ((y3-y2)*(x1-x0) - (x3-x2)*(y1-y0))
  const ub = ((x1-x0)*(y0-y2) - (y1-y0)*(x0-x2)) / ((y3-y2)*(x1-x0) - (x3-x2)*(y1-y0))
  return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1)
}


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


module.exports = {
  Area,
  AreaSelection
}
