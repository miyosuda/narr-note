const EDIT_HISTORY_MAX = 10

const {cloneArray} = require('./utils')


class EditHistory {
  constructor() {
    this.history = new Array()
    this.cursor = -1
    this.addHistory([])
  }

  addHistory(nodeDatas) {
    const clonedNodeDatas = cloneArray(nodeDatas)
    if( this.cursor != this.history.length-1 ) {
      // cursorが終端以外の場所にある時の対応
      this.history.splice(this.cursor+1, this.history.length-(this.cursor+1))
    }
    
    this.history.push(clonedNodeDatas)
    this.cursor += 1
    if( this.history.length > EDIT_HISTORY_MAX ) {
      this.history.shift()
      this.cursor -= 1
    }
  }

  undo() {
    if( this.cursor > 0 ) {
      this.cursor -= 1
      return this.history[this.cursor]
    } else {
      return null
    }
  }

  redo() {
    if( this.cursor < this.history.length-1 ) {
      this.cursor += 1
      return this.history[this.cursor]
    } else {
      return null
    }
  }
}


module.exports = {
  EditHistory,
}
