const katex = require('katex')
const {Anchor} = require('../anchor')
const {Area} = require('../area')


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


module.exports = {
  TextNode,
}
