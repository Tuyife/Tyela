let io = null

module.exports = {
  setIO(value) {
    io = value
  },
  getIO() {
    return io
  }
}