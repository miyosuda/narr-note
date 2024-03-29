import {clone, cloneArray} from './utils'

export const NODE_TYPE_NONE  = 0
export const NODE_TYPE_TEXT  = 1
export const NODE_TYPE_RECT  = 2
export const NODE_TYPE_LINE  = 3
export const NODE_TYPE_IMAGE = 4


export class NodeData {
  constructor(x, y, text) {
    this.type = NODE_TYPE_NONE
    this.x = x
    this.y = y
    this.text = text
  }

  fromRaw(rawData) {
    const rawDataEntries = Object.entries(rawData)
    rawDataEntries.map( e => {
      this[e[0]] = e[1]
    } )
  }

  setText(text) {
    this.text = text
    
    if( this.setCheckRect(text) ) {
      return
    }
    if( this.setCheckLine(text) ) {
      return
    }
    if( this.setCheckImage(text) ) {
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

      this.clearProperties(NODE_TYPE_RECT)

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
      this.clearProperties(NODE_TYPE_LINE)
      
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

  setCheckImage(text) {
    const imagePattern = /^!\((.*)\)/
    const imageMatchResult = text.match(imagePattern)
    
    if(imageMatchResult != null) {
      const path = imageMatchResult[1]
      if( this.type != NODE_TYPE_IMAGE || this.path != path ) {
        // ダブルクリックで既存のimageを編集した場合以外の時
        // width, height, aspectRatio は画像ロード後にセットする
        this.width = -1
        this.height = -1
        this.aspectRatio = 0.0
        this.path = path
      }
      this.clearProperties(NODE_TYPE_IMAGE)
      this.type = NODE_TYPE_IMAGE
      return true
    } else {
      return false
    }
  }

  clearProperties(keepType) {
    if( keepType == NODE_TYPE_RECT ) {
      this.clearLineProperties()
      this.clearImageProperties()
    } else if( keepType == NODE_TYPE_LINE ) {
      this.clearRectProperties()
      this.clearImageProperties()
    } else if( keepType == NODE_TYPE_IMAGE ) {
      this.clearLineProperties()
      this.clearRectProperties()
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

  clearImageProperties() {
    // Imageで利用するプロパティの削除
    delete this.aspectRatio
    delete this.path
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

  shiftPosForCopy() {
    this.x += 10
    this.y += 10
  }
}


class PageData {
  constructor() {
    this.nodes = [] // NodeData[]
  }

  getNodeDatas() {
    return this.nodes
  }

  fromRaw(rawData) {
    this.nodes = []
    const rawNodeDatas = rawData.nodes 
    rawNodeDatas.forEach(rawNodeData => {
      const nodeData = new NodeData()
      nodeData.fromRaw(rawNodeData)
      this.nodes.push(nodeData)
    })
  }

  addNode(nodeData) {
    this.nodes.push(nodeData)
  }

  removeNode(nodeData) {
    const nodeIndex = this.nodes.indexOf(nodeData)
    if(nodeIndex >= 0) {
      this.nodes.splice(nodeIndex, 1)
    } else {
      console.log('node data not found')
    }
  }

  clone() {
    const clonedPageData = new PageData()
    clonedPageData.nodes = cloneArray(this.nodes)
    return clonedPageData
  }
}


const DATA_VERSION = 1

export class NoteData {
  constructor() {
    this.version = DATA_VERSION
    
    this.pages = []
    const pageData = new PageData()
    this.pages.push(pageData)
    this.currentPage = 0
  }

  addNode(nodeData) {
    const pageData = this.pages[this.currentPage]
    pageData.addNode(nodeData)
  }

  removeNode(nodeData) {
    const pageData = this.pages[this.currentPage]
    pageData.removeNode(nodeData)
  }

  moveNextPage() {
    if( this.currentPage < this.pages.length-1 ) {
      // 次ページへ移動
      this.currentPage += 1
      return false
    } else {
      // 新規にページを作成
      const pageData = new PageData()
      this.pages.push(pageData)
      this.currentPage += 1
      return true
    }
  }

  movePreviousPage() {
    if( this.currentPage > 0 ) {
      this.currentPage -= 1
    }
  }

  clone() {
    const clonedNoteData = new NoteData()
    
    clonedNoteData.currentPage = this.currentPage
    clonedNoteData.pages = []
    
    this.pages.forEach(pageData => {
      clonedNoteData.pages.push(pageData.clone())
    })
    return clonedNoteData
  }

  getCurretNodeDatas() {
    return this.getNodeDatas(this.currentPage)
  }

  getNodeDatas(page) {
    const pageData = this.pages[page]
    return pageData.getNodeDatas()
  }

  getPageSize() {
    return this.pages.length
  }

  toJson() {
    const json = JSON.stringify(this, null , '\t')
    return json
  }

  fromJson(json) {
    this.version = DATA_VERSION // vesionは現在のバージョンを利用する
    
    const rawData = JSON.parse(json)
    this.currentPage = rawData.currentPage
    
    const rawPageDatas = rawData.pages
    this.pages = []
    
    rawPageDatas.forEach(rawPageData => {
      const pageData = new PageData()
      pageData.fromRaw(rawPageData)
      this.pages.push(pageData)
    })
  }
}
