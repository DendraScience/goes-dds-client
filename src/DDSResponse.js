/**
 * Contains state for either a normal or error response.
 */
export default class DDSResponse {
  constructor (options) {
    Object.assign(this, options)
  }

  destroy () {
    if (this.body) this.body.removeAllListeners()

    this.body = null
    this._data = null
  }

  _onData (data) {
    this._data.push(data)
  }

  _onEnd (resolve) {
    this.bodyUsed = true
    this.body.removeAllListeners()
    resolve(this._data)
  }

  _onError (reject, err) {
    this.error = err
    this.body.removeAllListeners()
    reject(err)
  }

  data () {
    if (this.error) return Promise.reject(this.error)
    if (this._data) return Promise.resolve(this._data)

    this._data = []

    // let tid = setTimeout(() => {
    //   tid = null
    //   this.emit('error', new Error('Request timeout'))
    // }, timeout)

    return new Promise((resolve, reject) => {
      this.body.on('data', this._onData.bind(this))
      this.body.once('end', this._onEnd.bind(this, resolve))
      this.body.once('error', this._onError.bind(this, reject))
    })
  }
}
