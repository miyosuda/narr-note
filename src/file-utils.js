// TODO:
//import path from 'path'


export const convertPathToRelative = (filePath, basePath) => {
  if( !filePath.startsWith('/') ) {
    // pathが既に相対ならそのまま返す
    return filePath
  }

  if( basePath == null ) {
    // basePathがnullならコンバートしない
    return filePath
  }
  
  const baseDir = window.path.dirname(basePath)
  const relativePath = window.path.relative(baseDir, filePath)
  return relativePath
}


export const convertPathToAbsolute = (filePath, basePath) => {
  if( filePath.startsWith('/') ) {
    // pathが既に絶対ならそのまま返す
    return filePath
  }

  if( basePath == null ) {
    // basePathがnullならコンバートしない
    return filePath
  }

  const baseDir = window.path.dirname(basePath)
  const absolutePath = window.path.join(baseDir, filePath)
  return absolutePath
}
