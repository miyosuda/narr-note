const katex = require('katex')

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
  // 上下左右2px幅を広げている
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

  for(let i=0; i<startData.length; i++) {
    if (startData[i].type === "text") {
      // テキストであれば分割を調べていく
      const text = startData[i].data // 分割対象のtext

      let lookingForLeft = true
      let currIndex = 0
      let nextIndex

      nextIndex = text.indexOf(leftDelim)
      if (nextIndex !== -1) {
        currIndex = nextIndex
        finalData.push({
          type: "text",
          data: text.slice(0, currIndex),
          pos: startData[i].pos
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
            pos: startData[i].pos + currIndex
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
            data: text.slice(currIndex + leftDelim.length,
                             nextIndex),
            rawData: text.slice(currIndex,
                                nextIndex + rightDelim.length),
            display: display,
            pos: startData[i].pos + currIndex + leftDelim.length
          })

          currIndex = nextIndex + rightDelim.length
        }

        lookingForLeft = !lookingForLeft
      }

      finalData.push({
        type: "text",
        data: text.slice(currIndex),
        pos: startData[i].pos + currIndex
      })
    } else {
      // math typeのdataの場合
      finalData.push(startData[i])
    }
  }

  return finalData
}


const splitWithDelimiters = (text, delimiters) => {
  let data = [
    {
      type: "text",
      data: text,
      pos: 0
    }
  ]
  // $, $$両方で分割を調べていく
  for(let i=0; i<delimiters.length; i++) {
    const delimiter = delimiters[i]
    data = splitAtDelimiters(data,
                             delimiter.left,
                             delimiter.right,
                             delimiter.display)
  }
  return data
}


const mathDelimiters = [
  {left: "$$", right: "$$", display: true},
  {left: "$",  right: "$",  display: false}
]


const render = (text, element) => {
  const data = splitWithDelimiters(text, mathDelimiters)
  
  for(let i=0; i<data.length; ++i) {
    if( data[i].type === "text" && data[i].data != '' ) {
      // テキストを改行で分割
      const localTexts = data[i].data.split('\n')
      
      for(let j=0; j<localTexts.length; j++) {
        const localText = localTexts[j]
        let span = document.createElement('span')
        // テキスト選択無効のクラスを指定
        span.className = 'disable-select';
        span.textContent = localText
        element.appendChild(span)

        if( localTexts.length > 1 ) {
          let br = document.createElement('br')
          element.appendChild(br)
        }
      }

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


const renderMathOnPos = (text, pos) => {
  const data = splitWithDelimiters(text, mathDelimiters)
  
  for(let i=0; i<data.length; ++i) {
    if( data[i].type === "math" &&
        pos >= data[i].pos &&
        pos <= (data[i].pos + data[i].data.length) ) {
      let mathElement = null
      
      if(data[i].display) {
        mathElement = document.createElement('div')
      } else {
        mathElement = document.createElement('span')
      }
      mathElement.className = 'math-preview';
      
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
        return errorSpan
      }
      
      return mathElement
    }
  }

  return null
}


module.exports = {
  getElementDimension,
  render,
  renderMathOnPos,
}
