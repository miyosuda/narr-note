const path = require('path')


const convertPathToRelative = (filePath, basePath) => {
  if( !filePath.startsWith('/') ) {
    // pathが既に相対ならそのまま返す
    return filePath
  }

  if( basePath == null ) {
    // basePathがnullならコンバートしない
    return filePath
  }
  
  const baseDir = path.dirname(basePath)
  const relativePath = path.relative(baseDir, filePath)
  return relativePath
}


const convertPathToAbsolute = (filePath, basePath) => {
  if( filePath.startsWith('/') ) {
    // pathが既に絶対ならそのまま返す
    return filePath
  }

  if( basePath == null ) {
    // basePathがnullならコンバートしない
    return filePath
  }

  const baseDir = path.dirname(basePath)
  const absolutePath = path.join(baseDir, filePath)
  return absolutePath
}

module.exports = {
  convertPathToRelative,
  convertPathToAbsolute
}
