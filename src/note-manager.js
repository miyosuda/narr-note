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


class NoteManager {
  constructor() {
    this.isMouseDown = false
    this.dragStartX = 0
    this.dragStartY = 0
    this.selectedNodes = []
    this.selectedAnchor = null
    this.nodes = []
    this.nodeEditied = false
    this.editHistory = new EditHistory()
  }

  prepare() {
    this.onResize()
    
    document.onmousedown = event => this.onMouseDown(event)
    document.onmouseup   = event => this.onMouseUp(event)
    document.onmousemove = event => this.onMouseMove(event)
    document.body.addEventListener('keydown',  event => this.onKeyDown(event))
    document.body.addEventListener('dblclick', evenet => this.onDoubleClick(event))

    this.lastNode = null
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

  clearSelection() {
    this.selectedNodes.forEach(node => {
      node.setSelected(false)
    })
    this.selectedNodes = []
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

  getLocalPos(e) {
    const rect = document.getElementById('svg').getBoundingClientRect()
    
    const x = e.clientX
    const y = e.clientY

    const pos = {}
    pos.x = x - rect.left
    pos.y = y - rect.top
    return pos
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
    } else if(e.key === 'Backspace' ) {
      this.deleteSelectedNodes()
    } else if( (e.key === 'd' && e.ctrlKey) || (e.key === 'd' && e.metaKey) ) {
      this.duplicateSelectedNodes()
      // MacのCommand + Dのデフォルトの挙動を防ぐ
      e.preventDefault()
    } else if( (e.key === 'z' && e.ctrlKey) || (e.key === 'z' && e.metaKey && !e.shiftKey) ) {
      this.undo()
      // MacのCommand + Zのデフォルトの挙動を防ぐ
      e.preventDefault()
    } else if( (e.key === 'Z' && e.ctrlKey) || (e.key === 'z' && e.metaKey && e.shiftKey) ) {
      this.redo()
      // MacのCommand + Zのデフォルトの挙動を防ぐ
      e.preventDefault()
    } else if( (e.key === 's' && e.ctrlKey) || (e.key === 's' && e.metaKey) ) {
      this.save()
      // MacのCommand + sのデフォルトの挙動を防ぐ
      e.preventDefault()
    } else if( (e.key === 'o' && e.ctrlKey) || (e.key === 'o' && e.metaKey) ) {
      this.load()
      // MacのCommand + oのデフォルトの挙動を防ぐ
      e.preventDefault()
    }    
  }

  onMouseDown(e) {
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
      this.isMouseDown = true
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
    const pickNodeCandidates = []
    let pickNode = null
    
    for(let i=0; i<this.nodes.length; i++) {
      const node = this.nodes[i]
      if( node.containsPos(x, y) ) {
        pickNodeCandidates.push(node)
      }
    }

    if( pickNodeCandidates.length > 0 ) {
      pickNodeCandidates.sort((node0, node1) => {
        // 面積が小さい方を優先
        return node0.areaSize() - node1.areaSize()
      })
      pickNode = pickNodeCandidates[0]
    }
    
    // 今回既に選択済のNode上のクリックだったかどうか
    let hitOnSelectedNode = false
    
    if( pickNode != null && pickNode.isSelected() ) {
      hitOnSelectedNode = true
    }

    // TODO: shift押下時にselectedを外す対応
    
    const addingSelection = e.shiftKey || hitOnSelectedNode
    this.selectedNodes = []
    
    for(let i=0; i<this.nodes.length; i++) {
      const node = this.nodes[i]
      if( addingSelection ) {
        if( node.isSelected() && node != pickNode ) {
          // 選択済みのものであれば
          // Nodeがマウスの上になろうがなかろうが、drag start処理を行う.
          node.onDragStart()
          this.selectedNodes.push(node)
        }
      } else {
        if( node != pickNode ) {
          // 選択済みだった場合に選択状態をクリア
          node.setSelected(false)
        }
      }
    }

    if( pickNode != null ) {
      pickNode.setSelected(true)
      pickNode.onDragStart()
      this.selectedNodes.push(pickNode)

      this.isMouseDown = true
      this.dragStartX = x
      this.dragStartY = y      
    } else {
      this.isMouseDown = true
      this.dragStartX = x
      this.dragStartY = y
      this.areaSelection.onDragStart(x, y)
    }
  }

  onMouseUp(e) {
    this.isMouseDown = false

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
    if(this.isMouseDown == true) {
      const pos = this.getLocalPos(e)
      const x = pos.x
      const y = pos.y
      const dx = x - this.dragStartX
      const dy = y - this.dragStartY

      if( this.areaSelection.isShown() ) {
        const area = this.areaSelection.onDrag(x, y)
        const adding = e.shiftKey
        
        for(let i=0; i<this.nodes.length; i++) {
          const node = this.nodes[i]

          // shift押下時のoverlapは単に追加していくやりかた
          // TODO: toggle版の対応
          if( node.overlaps(area) ) {
            // 選択済に追加
            if( !node.isSelected() ) {
              this.selectedNodes.push(node)
              node.setSelected(true)
            }
          } else if(!adding) {
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

    for(let i=this.nodes.length-1; i>=0; i--) {
      // 最初に見つけたらそこでloopを抜ける
      let node = this.nodes[i]
      if( node.containsPos(x, y) ) {
        this.textInput.show(node.data)        
        this.removeNode(node)
        // undoバッファ対応
        this.storeState()
        break
      }
    }
  }

  onTextDecided(data) {
    // TODO: テキストが空文字ならばノードを追加しない
    // 新規にノードを追加
    this.addNode(data)
    // undoバッファ対応
    this.storeState()
  }

  duplicateSelectedNodes() {
    const duplicatedNodes = []

    let duplicated = false
    
    this.selectedNodes.forEach(node => {
      const newData = clone(node.data)
      newData.x += 10
      newData.y += 10

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

  applyNodeDatas(nodeDatas) {
    for(let i=this.nodes.length-1; i>=0; i--) {
      let node = this.nodes[i]
      this.removeNode(node)
    }

    nodeDatas.forEach(nodeData => {
      this.addNode(nodeData)
    })
  }

  storeState() {
    const nodeDatas = []
    this.nodes.forEach(node => {
      nodeDatas.push(node.data)
    })
    this.editHistory.addHistory(nodeDatas)
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
    const json = JSON.stringify(data)
    
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
        this.applyNodeDatas(nodeDatas)
      }
    })
    this.filePath = path
  }

  onResize() {
    const svg = document.getElementById('svg')
    svg.setAttribute('width', window.innerWidth)
    svg.setAttribute('height', window.innerHeight)    
  }
}


module.exports = {
  NoteManager,
}

