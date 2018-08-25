import net from 'net'
import {EventEmitter} from 'events'
import {
  EMPTY_BUF,
  ERROR_CHAR,
  SYNC
} from './consts'
import BodyReader from './BodyReader'
import DDSResponse from './DDSResponse'
import parseDDSHeader from './parseDDSHeader'
import {ErrorBodyParser} from './body-parsers'

function errorBodyParser (reader) {
  return reader.pipe(new ErrorBodyParser())
}

const DEFAULT_HOST = 'cdadata.wcda.noaa.gov'
const DEFAULT_PORT = 16003
const DEFAULT_TIMEOUT = 90000

/**
 * A client class for communicating with a DDS server over TCP.
 */
export default class DDSClient extends EventEmitter {
  constructor (options) {
    super()

    this.options = Object.assign({
      host: DEFAULT_HOST,
      port: DEFAULT_PORT
    }, options)
  }

  /**
   * Cancel processing immediately and clean up.
   */
  cancel () {
    this._buf = null
    this._dataState = 0

    this.isConnected = false

    const {socket} = this

    if (!socket) return

    socket.removeAllListeners()
    socket.destroy()
    socket.unref()

    this.socket = null
  }

  destroy () {
    this.cancel()
  }

  _onSocketClose () {
    const {socket} = this

    this.cancel()
    this.emit('closed', socket)
  }

  _onSocketConnect () {
    this.isConnected = true

    this.emit('connected', this.socket)
  }

  _onSocketData (data) {
    this._buf = this._buf ? Buffer.concat([this._buf, data], this._buf.length + data.length) : data

    while (this._buf.length > 0) {
      /*
        Loop to process (potentially) multiple messages in the buffer.
       */

      // State 1: Parse header
      if (this._dataState === 1) {
        try {
          const ret = parseDDSHeader(this._buf)
          if (!ret) break // Need more bytes

          this._responseHeader = ret.header
          this._buf = ret.body
          this._dataState++
        } catch (err) {
          this._buf = null
          this._dataState = 1

          this.emit('error', err)
          return
        }
      }

      // State 2: Prepare response
      if (this._dataState === 2) {
        const header = this._responseHeader

        let parser
        let resOpts

        if (header.length === 0) {
          // Normal response - empty body
          resOpts = {
            header
          }
        } else if (this._buf.length === 0) {
          // No response yet - need more bytes
        } else if (this._buf[0] === ERROR_CHAR[0]) {
          // Error response - use error body parser
          parser = errorBodyParser
          resOpts = {
            header,
            isErrorBody: true
          }
        } else if (header.type.parser) {
          // Normal response - use type parser
          parser = header.type.parser
          resOpts = {
            header
          }
        } else {
          // Normal response - no parser
          resOpts = {
            header
          }
        }

        if (!resOpts) break // Unable to construct opts

        const minBytes = Math.min(this._buf.length, header.length)

        if (parser) {
          resOpts.body = parser(new BodyReader({
            buf: this._buf.slice(0, minBytes),
            length: header.length,
            socket: this.socket
          }))
        }

        this.emit('response', new DDSResponse(resOpts))

        this._receivedBytes = minBytes
        this._buf = this._buf.slice(minBytes)
        this._dataState++
      }

      // State 3: Wait for end of body
      if (this._dataState === 3) {
        const header = this._responseHeader

        this._receivedBytes += this._buf.length
        if (this._receivedBytes < header.length) {
          this._buf = null // Discard since the body parsers do the real work
          break // Need more bytes
        }

        this._buf = this._buf.slice(this._buf.length - (this._receivedBytes - header.length)) // Trim to next message
        this._dataState = 1
      }
    }
  }

  _onSocketError (err) {
    this.emit('error', err)
  }

  /**
   * Open a connection to the DDS server.
   */
  async connect (timeout = DEFAULT_TIMEOUT) {
    if (this.isConnected) return this.socket

    const newSock = this.socket = new net.Socket()

    newSock.on('data', this._onSocketData.bind(this))
    newSock.once('close', this._onSocketClose.bind(this))
    newSock.once('connect', this._onSocketConnect.bind(this))
    newSock.once('error', this._onSocketError.bind(this))

    this._buf = null
    this._dataState = 1

    newSock.connect(this.options.port, this.options.host)

    return new Promise((resolve, reject) => {
      let onError
      let onConnected

      const tid = setTimeout(() => {
        this.removeListener('error', onError)
        this.removeListener('connected', onConnected)
        reject(new Error('Connect timeout'))
      }, timeout)

      onError = (err) => {
        clearTimeout(tid)
        this.removeListener('connected', onConnected)
        reject(err)
      }
      onConnected = (sock) => {
        clearTimeout(tid)
        this.removeListener('error', onError)
        resolve(sock)
      }

      this.once('error', onError)
      this.once('connected', onConnected)
    }).catch(err => {
      this.cancel()
      throw err
    })
  }

  /**
   * Close a connection to the DDS server.
   */
  async disconnect (timeout = DEFAULT_TIMEOUT) {
    if (!this.isConnected) throw new Error('Not connected')

    this.socket.destroy()

    return new Promise((resolve, reject) => {
      let onError
      let onClosed

      const tid = setTimeout(() => {
        this.removeListener('error', onError)
        this.removeListener('closed', onClosed)
        reject(new Error('Disconnect timeout'))
      }, timeout)

      onError = (err) => {
        clearTimeout(tid)
        this.removeListener('closed', onClosed)
        reject(err)
      }
      onClosed = (sock) => {
        clearTimeout(tid)
        this.removeListener('error', onError)
        resolve(sock)
      }

      this.once('error', onError)
      this.once('closed', onClosed)
    }).catch(err => {
      this.cancel()
      throw err
    })
  }

  /**
   * Send a specific DDS request message type with options.
   */
  async request (type, options, timeout = DEFAULT_TIMEOUT) {
    if (!this.isConnected) throw new Error('Not connected')

    const code = Buffer.from(type.code)
    const body = type.formatter ? type.formatter().format(options) : EMPTY_BUF
    const len = Buffer.from(`00000${body.length}`.slice(-5))
    const msg = Buffer.concat([SYNC, code, len, body], SYNC.length + code.length + len.length + body.length)

    this._responseHeader = null

    this.socket.write(msg)

    return new Promise((resolve, reject) => {
      let onError
      let onResponse

      const tid = setTimeout(() => {
        this.removeListener('error', onError)
        this.removeListener('response', onResponse)
        reject(new Error('Request timeout'))
      }, timeout)

      onError = (err) => {
        clearTimeout(tid)
        this.removeListener('response', onResponse)
        reject(err)
      }
      onResponse = (res) => {
        clearTimeout(tid)
        this.removeListener('error', onError)
        resolve(res)
      }

      this.once('error', onError)
      this.once('response', onResponse)
    })
  }
}
