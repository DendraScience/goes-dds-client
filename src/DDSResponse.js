const DEFAULT_TIMEOUT = 90000

/**
 * Contains state for either a normal or error response.
 */
export default class DDSResponse {
  constructor (options) {
    Object.assign(this, options)
  }

  destroy () {
    const {body} = this

    if (body) body.removeAllListeners()

    this.body = null
    this._data = null
  }

  async data (timeout = DEFAULT_TIMEOUT) {
    if (this.error) throw this.error
    if (this._data) return this._data

    const newData = this._data = []
    const {body} = this

    return new Promise((resolve, reject) => {
      let onData
      let onEnd
      let onError

      const tid = setTimeout(() => {
        body.removeListener('data', onData)
        body.removeListener('end', onEnd)
        body.removeListener('error', onError)
        reject(new Error('Response data timeout'))
      }, timeout)

      onData = (data) => {
        // TODO: We could reset the timeout here
        newData.push(data)
      }
      onEnd = () => {
        clearTimeout(tid)
        body.removeListener('data', onData)
        body.removeListener('error', onError)

        this.bodyUsed = true

        resolve(newData)
      }
      onError = (err) => {
        clearTimeout(tid)
        body.removeListener('data', onData)
        body.removeListener('end', onEnd)

        this.error = err

        reject(err)
      }

      body.on('data', onData)
      body.once('end', onEnd)
      body.once('error', onError)
    })
  }
}
