// TODO:
//import fs from 'fs'
//import ipc = from 'electron'.ipcRenderer


import {NODE_TYPE_NONE, NODE_TYPE_TEXT, NODE_TYPE_RECT, NODE_TYPE_LINE, NODE_TYPE_IMAGE, NodeData, NoteData} from './data'
import {clone} from './utils'
import {TextInput} from './text-input'
import {Area, AreaSelection} from './area'
import {EditHistory} from './edit-history'
import {TextNode} from './node/text'
import {RectNode} from './node/rect'
import {LineNode} from './node/line'
import {ImageNode} from './node/image'


const createNode = (data, parentNode, noteFilePath) => {
  if( data.type == NODE_TYPE_TEXT ) {
    return new TextNode(data, parentNode)
  } else if( data.type == NODE_TYPE_RECT ) {
    return new RectNode(data, parentNode)
  } else if( data.type == NODE_TYPE_LINE ) {
    return new LineNode(data, parentNode)
  } else if( data.type == NODE_TYPE_IMAGE ) {
    return new ImageNode(data, parentNode, noteFilePath)
  } else {
    return null
  }
}

const DRAG_NONE = 0
const DRAG_NODE = 1
const DRAG_AREA = 2


export class NoteManager {
  constructor() {
    this.init()
  }

  init() {
    this.isDragging = false
    this.dragStartX = 0
    this.dragStartY = 0
    this.selectedNodes = []
    this.selectedAnchor = null
    this.nodes = []
    this.noteData = new NoteData()
    this.nodeEditied = false
    this.editHistory = new EditHistory()
    this.lastNode = null
    this.copiedNodeDatas = []

    this.setDirty(false)
  }

  prepare() {
    this.svg = document.getElementById('svg')
    
    this.onResize()
    
    document.onmousedown = event => this.onMouseDown(event)
    document.onmouseup   = event => this.onMouseUp(event)
    document.onmousemove = event => this.onMouseMove(event)
    document.body.addEventListener('keydown',  event => this.onKeyDown(event))
    document.body.addEventListener('dblclick', evenet => this.onDoubleClick(event))

    document.ondragover = document.ondrop = event => {
      event.preventDefault()
    }
    document.body.addEventListener('drop', event => this.onDrop(event))

    this.textInput = new TextInput(this)
    this.areaSelection = new AreaSelection()

    this.filePath = null

    window.ipc.on('selected-load-file', (event, path) => {
      if(path) {
        this.loadSub(path)
      }
    })

    window.ipc.on('selected-save-file', (event, path) => {
      if(path) {
        this.saveSub(path)
      }
    })

    window.ipc.on('request', (event, arg) => {
      if( arg == 'new-file' ) {
        this.newFile()
      } else if( arg == 'save' ) {
        this.save()
      } else if( arg == 'duplicate' ) {
        this.duplicateSelectedNodes()
      } else if( arg == 'undo' ) {
        this.undo()
      } else if( arg == 'redo' ) {
        this.redo()
      } else if( arg == 'cut' ) {
        this.cut()
      } else if( arg == 'copy' ) {
        this.copy()
      } else if( arg == 'paste' ) {
        this.paste()
      } else if( arg == 'selectall' ) {
        this.selectAll()
      } else if( arg == 'export-pdf' ) {
        this.exportPDF()
      }
    })

    this.updatePageLabel()
  }

  setDirty(dirty) {
    window.ipc.send('set-dirty', dirty)
  }

  showInputAt(x, y, displayMath=false) {
    this.clearSelection()
    let initialText = ""
    let initialCaretPos = 0
    if( displayMath ) {
      initialText = "$$\n\n$$"
      initialCaretPos = 3
    }
    const data = new NodeData(x, y, initialText)
    this.textInput.show(data, initialCaretPos)
  }

  showInput(asSibling, displayMath=false) {
    let x = 10
    let y = 10
    
    if(this.lastNode != null) {
      if(asSibling) {
        x = this.lastNode.right + 30
        y = this.lastNode.top
      } else {
        x = this.lastNode.left
        y = this.lastNode.bottom + 10
      }
    }

    // 画面外に出ない様にする処理
    const svgWidth = this.svg.width.baseVal.value
    const svgHeight = this.svg.height.baseVal.value
    
    const limitX = svgWidth - 50
    if( x > limitX ) {
      x = limitX
    }
    
    const limitY = svgHeight - 30
    if( y > limitY ) {
      y = limitY
    }

    this.showInputAt(x, y, displayMath)
  }

  forceSetLastNode() {
    // 一番下のnodeをlastNodeとする
    this.lastNode = null

    this.nodes.forEach(node => {
      if( this.lastNode == null ) {
        this.lastNode = node
      } else {
        // bottomではなくtopで比較している
        if( node.top > this.lastNode.top ) {
          this.lastNode = node
        }
      }
    })
  }

  deleteSelectedNodes() {
    let deleted = false
    let lastNodeDeleted = false
    
    this.selectedNodes.forEach(node => {
      // ノードを削除
      this.removeNode(node)
      deleted = true
      if( node == this.lastNode ) {
        lastNodeDeleted = true
      }
    })
    this.seletedNodes = []

    if( lastNodeDeleted ) {
      this.forceSetLastNode()
    }

    if( deleted ) {
      // undoバッファ対応
      this.storeState()
    }
  }

  onKeyDown(e) {
    if( e.target != document.body ) {
      // input入力時のkey押下は無視する
      return
    }

    if(e.key === 'Tab' ) {
      const displayMath = e.ctrlKey
      this.showInput(true, displayMath)
      e.preventDefault()
    } else if(e.key === 'Enter' ) {
      const displayMath = e.ctrlKey
      this.showInput(false, displayMath)
      e.preventDefault()
    } else if(e.key === 'Backspace' ) {
      this.deleteSelectedNodes()
    } else if( (e.key === 'ArrowDown') ) {
      this.moveNextPage()
      e.preventDefault()
    } else if( (e.key === 'ArrowUp') ) {
      this.movePreviousPage()
      e.preventDefault()
    }
  }

  findPickNode(x, y) {
    // マウスが乗った物のなから一番小さい物をまずpick対象として選ぶ
    const pickNodeCandidates = []
    let pickNode = null
    
    for(let i=0; i<this.nodes.length; i++) {
      const node = this.nodes[i]
      if( node.containsPos(x, y) ) {
        pickNodeCandidates.push(node)
      }
    }

    if( pickNodeCandidates.length > 0 ) {
      // マウスが乗った物を面積の小さい物順にソート
      pickNodeCandidates.sort((node0, node1) => {
        const areaDiff = node0.areaSize() - node1.areaSize()
        if( areaDiff != 0 ) {
          // 面積が小さい方を優先
          return areaDiff
        } else {
          // 面積が同じならselectedの方を優先
          const selected0 = node0.isSelected()
          const selected1 = node1.isSelected()
          if( selected0 != selected1 ) {
            if( selected0 ) {
              return -1.0
            } else {
              return 1.0
            }
            return 0.0
          }
        }
      })
      // マウスが乗った物のうち、一番面積が小さかった物
      pickNode = pickNodeCandidates[0]
    }
    
    return pickNode
  }

  onMouseDown(e) {
    if(e.which == 3) {
      // 右クリックの場合
      return
    }
    
    if( this.textInput.isShown() ) {
      // textInput表示中なら何もしない
      return
    }
    
    const pos = this.getLocalPos(e)
    const x = pos.x
    const y = pos.y
    
    this.nodeEditied = false

    // Anchorの上のクリックかどうか
    for(let i=0; i<this.nodes.length; i++) {
      let node = this.nodes[i]
      const anchor = node.containsPosOnAnchor(x, y)
      if(anchor != null) {
        this.selectedAnchor = anchor
        break
      }
    }   

    if( this.selectedAnchor != null ) {
      // Anchor上のクリックだった場合
      this.isDragging = true
      this.dragStartX = x
      this.dragStartY = y

      // 選択Nodeを一時的にnon selected表示に
      this.selectedNodes.forEach(node => {
        node.setSelected(false)
      })

      this.selectedAnchor.show()
      this.selectedAnchor.onDragStart()
      return
    }

    // マウスが乗った物のなから一番小さい物をまずpick対象として選ぶ
    let pickNode = this.findPickNode(x, y)

    let dragMode = DRAG_NONE
    const shitDown = e.shiftKey
    let clearSelection = false
    
    // selected nodesを一旦クリア
    this.selectedNodes = []
    
    if(pickNode != null) {
      // pickNodeがあった場合
      if(shitDown) {
        if(pickNode.isSelected()) {
          // shift押下でselectedなnodeをpick.
          // pickNodeを選択済みでなくす.
          pickNode.setSelected(false)
          // ドラッグは開始しない. エリア選択も開始しない.
          // 他のnodeのselected状態はそのままキープ.
          dragMode = DRAG_NONE
        } else {
          // shift押下で、pickNodeがselectedでなかった場合
          // pickNodeをselectedにして、
          // 他のselectedの物も含めて全selected nodeをdrag
          pickNode.setSelected(true)
          pickNode.onDragStart()
          this.lastNode = pickNode
          this.selectedNodes.push(pickNode)
          dragMode = DRAG_NODE
          // 他のnodeのselected状態はそのままキープ
        }
      } else {
        if(pickNode.isSelected()) {
          // 他のselectedの物も含めて全selected nodeをdrag
          pickNode.onDragStart()
          this.lastNode = pickNode
          this.selectedNodes.push(pickNode)
          dragMode = DRAG_NODE
          // 他のnodeのselected状態はそのままキープ
        } else {
          pickNode.setSelected(true)
          pickNode.onDragStart()
          this.lastNode = pickNode
          this.selectedNodes.push(pickNode)
          dragMode = DRAG_NODE
          // 他のnodeのselected状態はクリア
          clearSelection = true
        }
      }
    } else {
      // pickNodeがない場合
      if(shitDown) {
        dragMode = DRAG_AREA
        // Nodeドラッグは開始しない.
        // エリア選択も開始.
        // 全nodeのselected状態はそのままキープ
      } else {
        dragMode = DRAG_AREA
        // エリア選択開始
        // 全nodeのselected状態はクリア
        clearSelection = true
      }
    }
    
    for(let i=0; i<this.nodes.length; i++) {
      const node = this.nodes[i]
      if( node != pickNode ) {
        if( node.isSelected() ) {
          if(clearSelection) {
            node.setSelected(false)
          } else {
            node.onDragStart()
            this.selectedNodes.push(node)
          }
        }
      }
    }

    if( dragMode == DRAG_NODE ) {
      this.isDragging = true
      this.dragStartX = x
      this.dragStartY = y
    } else if( dragMode == DRAG_AREA ) {
      this.isDragging = true
      this.dragStartX = x
      this.dragStartY = y
      this.areaSelection.onDragStart(x, y)
    }
  }

  onMouseUp(e) {
    if(e.which == 3) {
      // 右クリックの場合
      const pos = this.getLocalPos(e)
      const x = pos.x
      const y = pos.y
      const displayMath = e.ctrlKey
      this.showInputAt(x, y, displayMath)
      return
    }
    
    this.isDragging = false

    if( this.areaSelection.isShown() ) {
      this.areaSelection.onDragEnd()
    }

    if( this.selectedAnchor != null ) {
      this.selectedAnchor.hide()
      this.selectedAnchor = null
      
      // 選択Nodeを一時的にselected表示戻す
      this.selectedNodes.forEach(node => {
        node.setSelected(true)
      })
    }

    if( this.nodeEditied ) {
      // undoバッファ対応
      this.storeState()
      this.nodeEditied = false
    }
  }

  onMouseMove(e) {
    if(e.which == 3) {
      // 右クリックの場合
      return
    }
    
    if(this.isDragging == true) {
      const pos = this.getLocalPos(e)
      const x = pos.x
      const y = pos.y
      
      const dx = x - this.dragStartX
      const dy = y - this.dragStartY

      if( this.areaSelection.isShown() ) {
        const area = this.areaSelection.onDrag(x, y)
        const shiftDown = e.shiftKey
        
        for(let i=0; i<this.nodes.length; i++) {
          const node = this.nodes[i]

          // shift押下時のoverlapは単に追加していくやりかた
          // TODO: toggle版の対応
          //       toggleに対応しようとすると、drag開始時のselected状態を保持しておく必要がある?
          //       -> nodeのstartDragging()時に中で、selectedWehnDragStartを設定する?
          if( node.overlaps(area) ) {
            if( !node.isSelected() ) {
              // 選択されていなかったら選択済に追加
              this.selectedNodes.push(node)
              node.setSelected(true)
              this.lastNode = node
            }
          } else if(!shiftDown) {
            if( node.isSelected() ) {
              // 選択済から削除
              const nodeIndex = this.selectedNodes.indexOf(node)
              if(nodeIndex >= 0) {
                this.selectedNodes.splice(nodeIndex, 1)
              }
              node.setSelected(false)
            }
          }
        }
      } else {
        if( this.selectedAnchor != null ) {
          // アンカーを移動
          const shiftDown = e.shiftKey
          this.selectedAnchor.onDrag(dx, dy, shiftDown)
          // mouseUp時にundoバッファ対応
          this.nodeEditied = true
        } else {
          this.selectedNodes.forEach(node => {
            // ノードを移動
            node.onDrag(dx, dy)
            // mouseUp時にundoバッファ対応
            this.nodeEditied = true
          })
        }
      }
    }
  }

  onDoubleClick(e) {
    const pos = this.getLocalPos(e)
    const x = pos.x
    const y = pos.y
    
    const pickNode = this.findPickNode (x, y)
    if( pickNode != null ) {
      // text input表示
      this.textInput.show(pickNode.data)
      // ノードを削除
      this.removeNode(pickNode)
      // ここではundoバッファに反映しない
      
      // undoバッファ対応
      //this.storeState()
    }
  }
  
  onDrop(e) {
    const pos = this.getLocalPos(e)
    const x = pos.x
    const y = pos.y
    
    const file = e.dataTransfer.files[0]
    const dropFilePath = file.path
    if( dropFilePath.endsWith('.png') ||
        dropFilePath.endsWith('.jpg') ||
        dropFilePath.endsWith('.jpeg') ) {
      // pathを相対にできたらする
      const relativePath = convertPathToRelative(dropFilePath, this.filePath)
      const data = new NodeData(x, y, "")
      const text = '!(' + relativePath + ')'
      data.setText(text)
      this.onTextDecided(data, true)
    }
  }
  
  onTextDecided(data, changed=true) {
    // テキストが空文字ならばノードを追加しない
    if( data.text != "" ) {
      // TODO: 要refactor
      if( data.type == NODE_TYPE_IMAGE && data.width < 0 ) {
        // Image nodeで画像をロード後のwidth取得等が必要な場合
        const image = new Image()
        image.addEventListener('load', () => {
          data.width = image.width
          data.height = image.height
          data.aspectRatio = image.height / image.width
          this.addNode(data)
          // undoバッファ対応
          this.storeState()
        }, false)
        // pathが相対なら絶対パスに変換
        image.src = convertPathToAbsolute(data.path, this.filePath)
      } else {
        this.addNode(data)
        // undoバッファ対応
        if( changed ) {
          this.storeState()
        }
      }
    } else {
      // 空文字だった場合
      if( changed ) {
        // 文字列が削除された場合
        this.storeState()
      }
    }
  }

  onResize() {
    // なぜかmarginをつけないとスクロールバーが出てしまう
    const margin = 2
    
    this.svg.setAttribute('width', window.innerWidth - margin)
    this.svg.setAttribute('height', window.innerHeight - margin)
  }

  getLocalPos(e) {
    const rect = document.getElementById('svg').getBoundingClientRect()
    
    const x = e.clientX
    const y = e.clientY

    const pos = {}
    pos.x = x - rect.left
    pos.y = y - rect.top
    return pos
  }

  addNode(nodeData, applyToNote=true) {
    // TODO: 整理
    const g = document.getElementById('nodes')
    const node = createNode(nodeData, g, this.filePath)
    this.nodes.push(node)
    this.lastNode = node
    if( applyToNote ) {
      this.noteData.addNode(nodeData)
    }
    return node
  }

  removeNode(node, applyToNote=true) {
    // TODO: 整理
    const nodeIndex = this.nodes.indexOf(node)
    if(nodeIndex >= 0) {
      this.nodes.splice(nodeIndex, 1)
    }
    node.remove()
    if( applyToNote ) {
      this.noteData.removeNode(node.data)
    }
  }

  clearSelection() {
    this.selectedNodes.forEach(node => {
      node.setSelected(false)
    })
    this.selectedNodes = []
  }

  duplicateSelectedNodes() {
    const duplicatedNodes = []

    let duplicated = false
    
    this.selectedNodes.forEach(node => {
      const newData = clone(node.data)
      // 位置をずらす
      newData.shiftPosForCopy()
      
      // TODO: 画面外に出ない様にする対応
      
      // 新規にノードを追加
      const newNode = this.addNode(newData)
      duplicatedNodes.push(newNode)
      duplicated = true
    })
    
    if( duplicated ) {
      // undoバッファ対応
      this.storeState()
    }

    // 選択状態をクリア
    this.clearSelection()

    // 複製ノードを選択状態にしておく
    this.selectedNodes = duplicatedNodes
    this.selectedNodes.forEach(node => {
      node.setSelected(true)
    })
  }
  
  selectAll() {
    if( this.textInput.isShown() ) {
      document.execCommand("selectAll")
      return
    }
    
    this.clearSelection()

    this.nodes.forEach(node => {
      node.setSelected(true)
      this.selectedNodes.push(node)
    })
  }

  copy() {
    if( this.textInput.isShown() ) {    
      document.execCommand("copy")
      return
    }
    
    if( this.selectedNodes.length > 0 ) {
      this.copiedNodeDatas = []
      this.selectedNodes.forEach(node => {
        const newData = clone(node.data)
        this.copiedNodeDatas.push(newData)
      })
    }
  }

  paste() {
    if( this.textInput.isShown() ) {    
      document.execCommand("paste")
      return
    }
    
    let pasted = false

    const copiedNodes = []
    
    this.copiedNodeDatas.forEach(nodeData => {
      // pasteを複数回繰り返せるのでcloneをしておく
      const clonedNodeData = clone(nodeData)
      // 位置をずらす
      clonedNodeData.shiftPosForCopy()
      const newNode = this.addNode(clonedNodeData)
      copiedNodes.push(newNode)
      pasted = true
    })
    
    if( pasted ) {
      // undoバッファ対応
      this.storeState()
    }

    // 選択状態をクリア
    this.clearSelection()

    // 複製ノードを選択状態にしておく
    this.selectedNodes = copiedNodes
    this.selectedNodes.forEach(node => {
      node.setSelected(true)
    })
  }

  cut() {
    if( this.textInput.isShown() ) {
      document.execCommand("cut")
      return
    }
    
    if( this.selectedNodes.length > 0 ) {
      this.copy()
      this.deleteSelectedNodes()
    }
  }

  clearAllNodes() {
    for(let i=this.nodes.length-1; i>=0; i--) {
      const node = this.nodes[i]
      // TODO: 整理
      this.removeNode(node, false) // noteにはremoveを反映しない
    }
    this.lastNode = null
  }  

  undo() {
    if( this.textInput.isShown() ) {
      document.execCommand("undo")
      return
    }
    
    const noteData = this.editHistory.undo()
    if( noteData != null ) {
      this.applyNoteData(noteData)
    }
  }

  redo() {
    if( this.textInput.isShown() ) {    
      document.execCommand("redo")
      return
    }
    
    const noteData = this.editHistory.redo()
    if( noteData != null ) {
      this.applyNoteData(noteData)
    }
  }

  storeState() {
    this.editHistory.addHistory(this.noteData)
    this.setDirty(true)
  }

  applyNoteData(noteData) {
    this.clearAllNodes()
    const nodeDatas = noteData.getCurretNodeDatas()
    nodeDatas.forEach(nodeData => {
      // TODO: 整理
      this.addNode(nodeData, false)
    })
    this.noteData = noteData

    this.forceSetLastNode()
  }

  saveSub(path) {
    const json = this.noteData.toJson()
    window.fs.writeFile(path, json, (error) => {
      if(error != null) {
        console.log('save error')
      }
    })
    
    this.filePath = path
    this.setDirty(false)

    window.ipc.send('save-finished')
  }

  save() {
    if( this.filePath != null ) {
      this.saveSub(this.filePath)
    } else {
      // TODO: 無いパターン
    }
  }

  exportPDF() {
    const json = this.noteData.toJson()
    const arg = {
      filePath: this.filePath,
      json: json,
    }
    window.ipc.send('print-to-pdf', arg)
  }

  newFile() {
    // TODO: loadSub()と共通化
    const noteData = new NoteData()
    this.clearAllNodes()
    this.init()
    this.applyNoteData(noteData)
    this.storeState()
    this.updatePageLabel()

    this.filePath = null

    this.setDirty(false)
  }

  loadSub(path) {
    window.fs.readFile(path, (error, json) => {
      if(error != null) {
        console.log('file open error')
        return null
      }
      if(json != null) {
        const noteData = new NoteData()
        noteData.fromJson(json)
        // TODO: newFile()と共通化
        this.clearAllNodes()
        this.init()
        this.applyNoteData(noteData)
        this.storeState()
        this.updatePageLabel()
        
        this.filePath = path
        this.setDirty(false)
      }
    })
  }

  moveNextPage() {
    const ret = this.noteData.moveNextPage()
    if( ret ) {
      this.storeState()
    }
    this.applyNoteData(this.noteData)
    this.updatePageLabel()
  }

  movePreviousPage() {
    this.noteData.movePreviousPage()
    this.applyNoteData(this.noteData)
    this.updatePageLabel()
  }

  updatePageLabel() {
    const page = this.noteData.currentPage
    const footer = document.getElementById('footer')
    const pageStr = "-" + (page + 1) + "-"
    footer.textContent = pageStr
  }
}


export class PrintNoteManager {
  constructor() {
  }

  prepare() {
    window.ipc.on('print-to-pdf', (event, arg) => {
      this.load(arg.json, arg.filePath)
    })
  }

  load(json, path) {
    const noteData = new NoteData()
    noteData.fromJson(json)
    
    const ns = 'http://www.w3.org/2000/svg'
    const pageSize = noteData.getPageSize()

    const minWidth = 800
    const minHeight = 600

    const svgs = []
    let maxX = minWidth
    let maxY = minHeight
    
    for(let i=0; i<pageSize; ++i) {
      const svg = document.createElementNS(ns, 'svg')
      svgs.push(svg)
      
      svg.setAttribute('width', minWidth)
      svg.setAttribute('height', minHeight)
      document.body.appendChild(svg)
      
      const canvas = document.createElementNS(ns, 'g')
      svg.appendChild(canvas)
      
      const g = document.createElementNS(ns, 'g')
      canvas.appendChild(g)

      const nodeDatas = noteData.getNodeDatas(i)

      nodeDatas.forEach(nodeData => {
        const node = createNode(nodeData, g, path)
        maxX = Math.max(maxX, node.right, node.left)
        maxY = Math.max(maxY, node.bottom, node.top)
      })
    }
    
    svgs.forEach(svg => {
      svg.setAttribute('width', maxX)
      svg.setAttribute('height', maxY)
    })
    
    const dims = {}
    dims.width = maxX
    dims.height = maxY
    
    window.ipc.send("ready-print-to-pdf", dims)
  }
}
