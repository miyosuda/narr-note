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


const splitAtDelimiters = (startTokens, leftDelim, rightDelim, display) => {
  const finalTokens = []

  for(let i=0; i<startTokens.length; i++) {
    if (startTokens[i].type === "text") {
      // テキストであれば分割を調べていく
      const text = startTokens[i].data // 分割対象のtext

      let lookingForLeft = true
      let currIndex = 0
      let nextIndex

      nextIndex = text.indexOf(leftDelim)
      if (nextIndex !== -1) {
        currIndex = nextIndex
        finalTokens.push({
          type: "text",
          data: text.slice(0, currIndex),
          pos: startTokens[i].pos
        })
        lookingForLeft = false
      }

      while (true) {
        if (lookingForLeft) {
          nextIndex = text.indexOf(leftDelim, currIndex)
          if (nextIndex === -1) {
            break
          }

          finalTokens.push({
            type: "text",
            data: text.slice(currIndex, nextIndex),
            pos: startTokens[i].pos + currIndex
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

          finalTokens.push({
            type: "math",
            data: text.slice(currIndex + leftDelim.length,
                             nextIndex),
            rawData: text.slice(currIndex,
                                nextIndex + rightDelim.length),
            display: display,
            pos: startTokens[i].pos + currIndex + leftDelim.length
          })

          currIndex = nextIndex + rightDelim.length
        }

        lookingForLeft = !lookingForLeft
      }

      finalTokens.push({
        type: "text",
        data: text.slice(currIndex),
        pos: startTokens[i].pos + currIndex
      })
    } else {
      // math typeのtokenの場合
      finalTokens.push(startTokens[i])
    }
  }

  return finalTokens
}


const splitWithDelimiters = (text, delimiters, startPos) => {
  let tokens = [
    {
      type: "text",
      data: text,
      pos: startPos
    }
  ]
  // $, $$両方で分割を調べていく
  for(let i=0; i<delimiters.length; i++) {
    const delimiter = delimiters[i]
    tokens = splitAtDelimiters(tokens,
                               delimiter.left,
                               delimiter.right,
                               delimiter.display)
  }
  return tokens
}


const mathDelimiters = [
  {left: "$$", right: "$$", display: true},
  {left: "$",  right: "$",  display: false}
]


const parse = (text) => {
  const headerPattern = /^(#{1,5})([^]+)$/
  const headerMatchResult = text.match(headerPattern)

  let headerLevel = 0
  let startPos = 0
  
  if( headerMatchResult != null ) {
    const header = headerMatchResult[1]
    headerLevel = header.length
    text = headerMatchResult[2]
    startPos = header.length
  }
  
  const tokens = splitWithDelimiters(text, mathDelimiters, startPos)
  const parseResult = {
    headerLevel: headerLevel,
    tokens: tokens,
  }
  return parseResult
}


module.exports = {
  parse,
}
