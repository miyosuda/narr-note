export const NODE_TYPE_NONE = 0
export const NODE_TYPE_TEXT = 1
export const NODE_TYPE_RECT = 2
export const NODE_TYPE_LINE = 3


export class NodeData {
  constructor(x, y, text) {
    this.type = NODE_TYPE_NONE
    this.x = x
    this.y = y
    this.text = text
  }

  setText(text) {
    this.text = text

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
      return
    }

    // TODO: lineのpattern matching
    if( text == "---" ) {
      if( this.type != NODE_TYPE_LINE ) {
        this.width = 100
        this.height = 0
      }
      this.type = NODE_TYPE_LINE
      return
    }
    
    this.type = NODE_TYPE_TEXT
  }
}
