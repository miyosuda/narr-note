const fs = require('fs')
const ipc = require('electron').ipcRenderer

const {NODE_TYPE_NONE, NODE_TYPE_TEXT, NODE_TYPE_RECT, NODE_TYPE_LINE, NodeData} = require('./data')
const {clone} = require('./utils')
const {TextInput} = require('./text-input')
const {Area, AreaSelection} = require('./area')
const {EditHistory} = require('./edit-history')
const {TextNode} = require('./node/text')
const {RectNode} = require('./node/rect')
const {LineNode} = require('./node/line')


const createNode = (data) => {
  if( data.type == NODE_TYPE_TEXT ) {
    return new TextNode(data)
  } else if( data.type == NODE_TYPE_RECT ) {
    return new RectNode(data)
  } else if( data.type == NODE_TYPE_LINE ) {
    return new LineNode(data)
  } else {
    return null
  }
}

const DRAG_NONE = 0
const DRAG_NODE = 1
const DRAG_AREA = 2


class NoteManager {
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
    this.nodeEditied = false
    this.editHistory = new EditHistory()
    this.lastNode = null
    this.copiedNodeDatas = []
  }  

  prepare() {
    this.onResize()
    
    document.onmousedown = event => this.onMouseDown(event)
    document.onmouseup   = event => this.onMouseUp(event)
    document.onmousemove = event => this.onMouseMove(event)
    document.body.addEventListener('keydown',  event => this.onKeyDown(event))
    document.body.addEventListener('dblclick', evenet => this.onDoubleClick(event))

    this.textInput = new TextInput(this)
    this.areaSelection = new AreaSelection()

    this.filePath = null

    ipc.on('selected-file', (event, path) => {
      if(path) {
        this.loadSub(path)
      }
    })

    ipc.on('saved-file', (event, path) => {
      if(path) {
        this.saveSub(path)
      }
    })
  }

  showInput(asSibling) {
    this.clearSelection()
    
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
    
    // TODO: 画面外に出ない様にする対応
    
    const data = new NodeData(x, y, "")
    this.textInput.show(data)
  }

  deleteSelectedNodes() {
    let deleted = false
    
    this.selectedNodes.forEach(node => {
      // ノードを削除
      this.removeNode(node)
      deleted = true
    })
    this.seletedNodes = []

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
      this.showInput(true)
      e.preventDefault()
    } else if(e.key === 'Enter' ) {
      this.showInput(false)
      e.preventDefault()
    } else if(e.key === 'Backspace' ) {
      this.deleteSelectedNodes()
    } else if( (e.key === 'd' && e.ctrlKey) || (e.key === 'd' && e.metaKey) ) {
      this.duplicateSelectedNodes()
      e.preventDefault() // MacのCommand + Dのデフォルトの挙動を防ぐ
    } else if( (e.key === 'z' && e.ctrlKey) || (e.key === 'z' && e.metaKey && !e.shiftKey) ) {
      this.undo()
      e.preventDefault() // MacのCommand + Zのデフォルトの挙動を防ぐ
    } else if( (e.key === 'Z' && e.ctrlKey) || (e.key === 'z' && e.metaKey && e.shiftKey) ) {
      this.redo()
      e.preventDefault() // MacのCommand + Zのデフォルトの挙動を防ぐ
    } else if( (e.key === 's' && e.ctrlKey) || (e.key === 's' && e.metaKey) ) {
      this.save()
      e.preventDefault() // MacのCommand + sのデフォルトの挙動を防ぐ
    } else if( (e.key === 'o' && e.ctrlKey) || (e.key === 'o' && e.metaKey) ) {
      this.load()
      e.preventDefault() // MacのCommand + oのデフォルトの挙動を防ぐ
    } else if( (e.key === 'a' && e.metaKey) ) {
      this.selectAllNodes()
      e.preventDefault()
    } else if( (e.key === 'c' && e.metaKey) ) {
      this.copyNodes()
      e.preventDefault()
    } else if( (e.key === 'v' && e.metaKey) ) {
      this.pasteNodes()
      e.preventDefault()
    } else if( (e.key === 'x' && e.metaKey) ) {
      this.cutNodes()
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
        // 面積が小さい方を優先
        return node0.areaSize() - node1.areaSize()
      })
      // マウスが乗った物のうち、一番面積が小さかった物
      pickNode = pickNodeCandidates[0]
    }
    
    return pickNode
  }

  onMouseDown(e) {
    if( this.textInput.isShown() ) {
      // textInput表示中なら何もしない
      return
    }
    
    this.nodeEditied = false
    
    const pos = this.getLocalPos(e)
    const x = pos.x
    const y = pos.y

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
          this.selectedNodes.push(pickNode)
          dragMode = DRAG_NODE
          // 他のnodeのselected状態はそのままキープ
        }
      } else {
        if(pickNode.isSelected()) {
          // 他のselectedの物も含めて全selected nodeをdrag
          pickNode.onDragStart()
          this.selectedNodes.push(pickNode)
          dragMode = DRAG_NODE
          // 他のnodeのselected状態はそのままキープ
        } else {
          pickNode.setSelected(true)
          pickNode.onDragStart()
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
          this.selectedAnchor.onDrag(dx, dy)
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
      // undoバッファ対応
      this.storeState()
    }
  }

  onTextDecided(data) {
    // テキストが空文字ならばノードを追加しない
    if( data.text != "" ) {
      this.addNode(data)
      // undoバッファ対応
      this.storeState()
    }
  }

  onResize() {
    const svg = document.getElementById('svg')
    svg.setAttribute('width', window.innerWidth)
    svg.setAttribute('height', window.innerHeight)
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

  addNode(nodeData) {
    const node = createNode(nodeData)
    this.nodes.push(node)
    this.lastNode = node
    return node
  }

  removeNode(node) {
      const nodeIndex = this.nodes.indexOf(node)
      if(nodeIndex >= 0) {
        this.nodes.splice(nodeIndex, 1)
      }
      node.remove()
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
      newData.x += 10
      newData.y += 10

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
  
  selectAllNodes() {
    this.clearSelection()

    this.nodes.forEach(node => {
      node.setSelected(true)
      this.selectedNodes.push(node)
    })
  }

  copyNodes() {
    if( this.selectedNodes.length > 0 ) {
      this.copiedNodeDatas = []
      this.selectedNodes.forEach(node => {
        const newData = clone(node.data)
        this.copiedNodeDatas.push(newData)
      })
    }
  }

  pasteNodes() {
    let pasted = false

    const copiedNodes = []
    
    this.copiedNodeDatas.forEach(nodeData => {
      const newNode = this.addNode(nodeData)
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

  cutNodes() {
    if( this.selectedNodes.length > 0 ) {
      this.copyNodes()
      this.deleteSelectedNodes()
    }
  }

  clearAllNodes() {
    for(let i=this.nodes.length-1; i>=0; i--) {
      let node = this.nodes[i]
      this.removeNode(node)
    }    
  }  

  undo() {
    const nodeDatas = this.editHistory.undo()
    if( nodeDatas != null ) {
      this.applyNodeDatas(nodeDatas)
    }
  }

  redo() {
    const nodeDatas = this.editHistory.redo()
    if( nodeDatas != null ) {
      this.applyNodeDatas(nodeDatas)
    }
  }

  storeState() {
    const nodeDatas = []
    this.nodes.forEach(node => {
      nodeDatas.push(node.data)
    })
    this.editHistory.addHistory(nodeDatas)
  }  

  applyNodeDatas(nodeDatas) {
    this.clearAllNodes()

    nodeDatas.forEach(nodeData => {
      this.addNode(nodeData)
    })
  }

  saveSub(path) {
    const DATA_VERSION = 1
    
    const nodeDatas = []
    this.nodes.forEach(node => {
      nodeDatas.push(node.data)
    })
    const data = {
      'version': DATA_VERSION,
      'nodes': nodeDatas,
    }
    const json = JSON.stringify(data, null , '\t')
    
    fs.writeFile(path, json, (error) => {
      if(error != null) {
        console.log('save error')
      }
    })
    
    this.filePath = path
  }

  save() {
    if( this.filePath == null ) {
      ipc.send('save-dialog')
    } else {
      this.saveSub(this.filePath)
    }
  }

  load() {
    ipc.send('open-file-dialog')
  }

  loadSub(path) {
    fs.readFile(path, (error, json) => {
      if(error != null) {
        console.log('file open error')
        return null
      }
      if(json != null) {        
        const data = JSON.parse(json)
        const rawNodeDatas = data.nodes
        // NodeData classに変換する
        const nodeDatas = []
        rawNodeDatas.forEach(rawNodeData => {
          const nodeData = new NodeData()
          const rawNodeDataEntries = Object.entries(rawNodeData)
          rawNodeDataEntries.map( e => {
            nodeData[e[0]] = e[1]
          } )
          nodeDatas.push(nodeData)
        })
        this.clearAllNodes()
        this.init()
        this.applyNodeDatas(nodeDatas)
        this.storeState()
      }
    })
    this.filePath = path
  }
}


module.exports = {
  NoteManager,
}

