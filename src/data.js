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

    // Lineで利用するプロパティの削除
    this.clearLineProperties()
    this.type = NODE_TYPE_TEXT
  }

  setCheckRect(text) {
    const rectPattern = /^\[(\d+)\]$/
    const rectMatchResult = text.match(rectPattern)
    if( rectMatchResult != null ) {
      // TODO: カラーの対応
      const rectColorId = rectMatchResult[1]
      if( rectColorId == 0 ) {
        this.color = "#FF0000"
      } else if( rectColorId == 1 ) {
        this.color = "#00FF00"
      } else {
        this.color = "#0000FF"
      }
      
      if( this.type != NODE_TYPE_RECT ) {
        this.width = 50
        this.height = 50
      }
      this.type = NODE_TYPE_RECT

      // Lineで利用するプロパティの削除
      this.clearLineProperties()
      return true
    } else {
      return false
    }
  }

  setCheckLine(text) {
    // TODO: カラーの対応
    const linePattern = /^(<?)(-[- ]*)(>?)$/
    const lineMatchResult = text.match(linePattern)
    
    let dashed = false
    let startArrow = false
    let endArrow = false
    let isLine = false

    if(lineMatchResult != null) {
      let singleHyfen = false
      
      for(let i=0; i<lineMatchResult.length; i++) {
        console.log("" + i + "=" + lineMatchResult[i])
      }
      
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
      this.type = NODE_TYPE_LINE
      this.startArrow = startArrow
      this.endArrow = endArrow
      this.dashed = dashed
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
  }
}

module.exports = {
  NODE_TYPE_NONE,
  NODE_TYPE_TEXT,
  NODE_TYPE_RECT,
  NODE_TYPE_LINE,
  NodeData,
}
