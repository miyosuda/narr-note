const {Anchor} = require('../anchor')
const {Area} = require('../area')
const {getElementDimension, render} = require('../text-utils')


class TextNode {
  constructor(data) {
    this.data = data
    
    let ns = 'http://www.w3.org/2000/svg'
    let foreignObject = document.createElementNS(ns, 'foreignObject')
    foreignObject.x.baseVal.value = this.data.x
    foreignObject.y.baseVal.value = this.data.y

    // TODO: class指定
    //foreignObject.classList.add("text_h1") //..

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
    const headerLevel = render(this.data.text, this.foreignObject)
    const className = "text_h" + headerLevel
    this.foreignObject.classList.add(className) //..

    const dims = getElementDimension(this.foreignObject.innerHTML, className)
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


module.exports = {
  TextNode,
}
