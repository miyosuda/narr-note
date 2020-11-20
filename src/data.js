const NODE_TYPE_NONE = 0
const NODE_TYPE_TEXT = 1
const NODE_TYPE_RECT = 2
const NODE_TYPE_LINE = 3


class NodeData {
  constructor(x, y, text) {
    this.type = NODE_TYPE_NONE
    this.x = x
    this.y = y
    this.text = text
  }

  setText(text) {
    this.text = text
    
    if( this.setCheckRect(text) ) {
      return
    }
    if( this.setCheckLine(text) ) {
      return
    }

    // Rect,Lineで利用するプロパティの削除
    this.clearLineProperties()
    this.clearRectProperties()
    this.type = NODE_TYPE_TEXT
  }

  setCheckRect(text) {
    const rectPattern = /^([{\[])([rgbcmyk]?)([}\]])$/
    const rectMatchResult = text.match(rectPattern)
    
    if(rectMatchResult != null) {
      let rounded = false
      if( rectMatchResult[1] == '{' &&
          rectMatchResult[3] == '}' ) {
        rounded = true
      } else if ( rectMatchResult[1] == '[' &&
                  rectMatchResult[3] == ']' ) {
        rounded = false
      } else {
        return false
      }
      
      if( this.type != NODE_TYPE_RECT ) {
        this.width = 50
        this.height = 50
      }

      this.clearLineProperties()

      this.rounded = rounded
      this.color = this.getColor(rectMatchResult[2], '#FF0000')
      this.type = NODE_TYPE_RECT
      
      return true
    } else {
      return false
    }
  }

  setCheckLine(text) {
    const linePattern = /^(<?)(-[- ]*)(>?)([rgbcmyk]?)$/
    const lineMatchResult = text.match(linePattern)
    
    let dashed = false
    let startArrow = false
    let endArrow = false
    let isLine = false
    let color = null

    if(lineMatchResult != null) {
      let singleHyfen = false
      
      if( lineMatchResult[1] === '<' ) {
        startArrow = true
      }
      
      if( lineMatchResult[2] === '-' ||
          lineMatchResult[2] === '- ' ||
          lineMatchResult[2] === ' -' ) {
        singleHyfen = true
      } else {
        if( lineMatchResult[2].indexOf(' ') != -1 ) {
          dashed = true
        } else {
          
        }
      }
      
      if( lineMatchResult[3] === '>' ) {
        endArrow = true
      }

      color = this.getColor(lineMatchResult[4], '#000000')
      
      if( singleHyfen && !startArrow && !endArrow ) {
        isLine = false
      } else {
        isLine = true
      }
    }
    
    if( isLine ) {
      if( this.type != NODE_TYPE_LINE ) {
        // 初期化
        this.width = 100
        this.height = 0
      }
      this.clearRectProperties()
      
      this.type = NODE_TYPE_LINE
      this.startArrow = startArrow
      this.endArrow = endArrow
      this.dashed = dashed
      this.color = color
      return true
    } else {
      return false
    }
  }

  clearLineProperties() {
    // Lineで利用するプロパティの削除
    delete this.startArrow
    delete this.endArrow
    delete this.dashed
    delete this.color
  }
  
  clearRectProperties() {
    // Rectで利用するプロパティの削除
    delete this.rounded
    delete this.color
  }

  getColor(colorCode, defaultColor) {
    if( colorCode == 'r' ) {
      return "#FF0000"
    } else if( colorCode == 'g' ) {
      return "#00FF00"
    } else if( colorCode == 'b' ) {
      return "#0000FF"
    } else if( colorCode == 'c' ) {
      return "#00FFFF"
    } else if( colorCode == 'm' ) {
      return "#FF00FF"
    } else if( colorCode == 'y' ) {
      return "#FD9E00" // オレンジ色に近くしている
    } else if( colorCode == 'k' ) {
      return "#000000"
    } else {
      return defaultColor
    }
  }
}

module.exports = {
  NODE_TYPE_NONE,
  NODE_TYPE_TEXT,
  NODE_TYPE_RECT,
  NODE_TYPE_LINE,
  NodeData,
}
