const clone = (instance) => {
  return Object.assign(
    Object.create(
      // Set the prototype of the new object to the prototype of the instance.
      // Used to allow new object behave like class instance.
      Object.getPrototypeOf(instance),
    ),
    // Prevent shallow copies of nested structures like arrays, etc
    JSON.parse(JSON.stringify(instance)),
  )
}


const cloneArray = (array) => {
  const clonedArray = []
  array.forEach(obj => {
    clonedArray.push(clone(obj))
  })
  return clonedArray
}


module.exports = {
  clone,
  cloneArray,
}
