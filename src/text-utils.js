import katex from 'katex'
import {parse} from './parse'

// textノードのサイズを取得
export const getElementDimension = (html, className=null) => {
  const element = document.createElement('span')
  
  // elementのsizeは子に依存
  element.style.display = 'inline-block'
  element.style.visibility = 'hidden'
  element.innerHTML = html

  if( className != null ) {
    element.className = className
  }
  
  document.body.append(element)
  
  const dims = {}
  // 上下左右2px幅を広げている
  dims.width = element.getBoundingClientRect().width + 2
  dims.height = element.getBoundingClientRect().height + 2

  element.remove()
  return dims
}


export const render = (text, element) => {
  const parseResult = parse(text)
  const tokens = parseResult.tokens
  
  for(let i=0; i<tokens.length; ++i) {
    if( tokens[i].type === "text" && tokens[i].data != '' ) {
      // テキストを改行で分割
      const localTexts = tokens[i].data.split('\n')
      
      for(let j=0; j<localTexts.length; j++) {
        const localText = localTexts[j]
        let span = document.createElement('span')
        // テキスト選択無効のクラスを指定
        span.className = 'disable-select';
        span.textContent = localText
        element.appendChild(span)

        if( localTexts.length > 1 && j != localTexts.length-1 ) {
          let br = document.createElement('br')
          element.appendChild(br)
        }
      }

    } else if( tokens[i].type === "math" ) {
      let mathElement = null
      
      if(tokens[i].display) {
        mathElement = document.createElement('div')
      } else {
        mathElement = document.createElement('span')
      }
      mathElement.className = 'disable-select';
      
      try {
        katex.render(tokens[i].data, mathElement, {
          displayMode : tokens[i].display,
          throwOnError : true
        })
	  } catch (e) {
        if (!(e instanceof katex.ParseError)) {
          throw e;
        }
        const errorStr = "KaTeX : Failed to parse `" + tokens[i].data + "` with " + e
        console.log(errorStr)
        let errorSpan = document.createElement('span')
        errorSpan.textContent = "error"
        element.appendChild(errorSpan)
        continue
      }
      element.appendChild(mathElement)
    }
  }

  return parseResult.headerLevel
}


export const renderMathOnPos = (text, pos) => {
  const parseResult = parse(text)
  const tokens = parseResult.tokens
  
  for(let i=0; i<tokens.length; ++i) {
    if( tokens[i].type === "math" &&
        pos >= tokens[i].pos &&
        pos <= (tokens[i].pos + tokens[i].data.length) ) {
      let mathElement = null
      
      if(tokens[i].display) {
        mathElement = document.createElement('div')
      } else {
        mathElement = document.createElement('span')
      }
      mathElement.className = 'math-preview';
      
      try {
        katex.render(tokens[i].data, mathElement, {
          displayMode : tokens[i].display,
          throwOnError : true
        })
	  } catch (e) {
        if (!(e instanceof katex.ParseError)) {
          throw e;
        }
        const errorStr = "KaTeX : Failed to parse `" + tokens[i].data + "` with " + e
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
