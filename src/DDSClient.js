import net from 'net'
import {EventEmitter} from 'events'
// OLD
// import * as tq from '@dendra-science/task-queue'
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

// NEW
const DEFAULT_HOST = 'cdadata.wcda.noaa.gov'
const DEFAULT_PORT = 16003
const DEFAULT_TIMEOUT = 90000

// OLD
// const DEFAULT_TIMEOUT = 90000
// const DEFAULT_OPTIONS = {
//   host: 'cdadata.wcda.noaa.gov',
//   port: 16003,
//   connectTimeout: DEFAULT_TIMEOUT,
//   disconnectTimeout: DEFAULT_TIMEOUT,
//   requestTimeout: DEFAULT_TIMEOUT
// }

/**
 * A client class for communicating with a DDS server over TCP.
 */
export default class DDSClient extends EventEmitter {
  // OLD
  // constructor (options) {
  //   super()

  //   this.options = Object.assign({}, DEFAULT_OPTIONS, options)
  //   this.queue = new tq.TaskQueue()
  // }

  // NEW
  constructor (options) {
    super()

    this.options = Object.assign({
      host: DEFAULT_HOST,
      port: DEFAULT_PORT
    }, options)
  }

  // OLD
  // _clearTimeout () {
  //   if (this._tid) clearTimeout(this._tid)
  //   this._tid = null
  // }

  /**
   * Cancel processing immediately and clean up.
   */
  cancel () {
    this._buf = null
    this._dataState = 0
    // TODO: Remove
    // this._clearTimeout()

    if (!this.socket) return

    this.isConnected = false

    this.socket.removeAllListeners()
    this.socket.destroy()
    this.socket.unref()

    this.socket = null
  }

  // OLD
  // destroy () {
  //   this.cancel()

  //   this.queue.destroy()

  //   this.queue = null
  // }

  // NEW
  destroy () {
    this.cancel()
  }

  // OLD
  // _cancelError (err, task) {
  //   this.cancel()

  //   this.emit('error', err)

  //   const item = this.queue.head
  //   if (item && (item.task === task)) {
  //     return item.isCompleted ? this.queue.next() : item.error(err)
  //   }
  // }

  // OLD
  // _response (res) {
  //   this._clearTimeout()

  //   this.emit('response', res)

  //   const item = this.queue.head
  //   const header = this._responseHeader
  //   if (item && (item.task === this._requestTask) && header && (header.type === item.data.type)) {
  //     item.done(res, false)
  //   }
  // }

  // NEW
  _response (res) {
    this.emit('response', res)
  }

  _responseBegin (header = null) {
    this._responseHeader = header
  }

  // OLD
  // _responseEnd () {
  //   const item = this.queue.head
  //   const header = this._responseHeader
  //   if (item && (item.task === this._requestTask) && header && (header.type === item.data.type)) {
  //     this.queue.next()
  //   }
  // }

  _responseError (err) {
    this._buf = null
    this._dataState = 1
    this._clearTimeout()

    this.emit('error', err)

    const item = this.queue.head
    const header = this._responseHeader
    if (item && (item.task === this._requestTask) && (!header || (header.type === item.data.type))) {
      return item.isCompleted ? this.queue.next() : item.error(err)
    }
  }

  // OLD
  // _startRequestTimer () {
  //   this._clearTimeout()

  //   this._tid = setTimeout(() => {
  //     this._tid = null
  //     this._responseError(new Error('Request timed out'))
  //   }, this.options.requestTimeout)
  // }

  // OLD
  // _onCloseHandler () {
  //   this._buf = null
  //   this._dataState = 0
  //   this._clearTimeout()

  //   this.isConnected = false
  //   this.socket.removeAllListeners()
  //   this.socket.unref()

  //   const item = this.queue.head
  //   if (item && (item.task === this._disconnectTask)) {
  //     item.done()
  //   }
  // }

  // NEW
  _onCloseHandler () {
    this._buf = null
    this._dataState = 0

    this.isConnected = false

    this.socket.removeAllListeners()
    this.socket.unpipe()
    this.socket.unref()

    this.emit('closed')
  }

  // OLD
  // _onConnectHandler () {
  //   this._buf = null
  //   this._dataState = 1
  //   this._clearTimeout()
  //   this.isConnected = true

  //   const item = this.queue.head
  //   if (item && (item.task === this._connectTask)) {
  //     item.done(this.socket)
  //   }
  // }

  // NEW
  _onConnectHandler () {
    this._buf = null
    this._dataState = 1

    this.isConnected = true

    this.emit('connected', sock)
  }

  _onDataHandler (data) {
    this._buf = this._buf ? Buffer.concat([this._buf, data], this._buf.length + data.length) : data

    while (this._buf.length > 0) {
      /*
        Loop to process (potentially) multiple messages in the buffer.
       */

      this._startRequestTimer()

      // State 1: Parse header
      if (this._dataState === 1) {
        try {
          const ret = parseDDSHeader(this._buf)
          if (!ret) break // Need more bytes

          this._responseBegin(ret.header)
          this._buf = ret.body
          this._dataState++
        } catch (e) {
          this._responseError(e)
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

        this._response(new DDSResponse(resOpts))
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

        this._responseEnd()
        this._buf = this._buf.slice(this._buf.length - (this._receivedBytes - header.length)) // Trim to next message
        this._dataState = 1
      }
    }
  }

  _onErrorHandler (err) {
    const item = this.queue.head
    if (this.socket.connecting && item && (item.task === this._connectTask)) {
      item.error(err)
    }
  }

  // OLD
  // _connectTask ({data, done, error}) {
  //   const client = data.client

  //   if (client.isConnected) return done()

  //   const sock = client.socket = new net.Socket()
  //   sock.once('close', client._onCloseHandler.bind(client))
  //   sock.once('connect', client._onConnectHandler.bind(client))
  //   sock.once('error', client._onErrorHandler.bind(client))
  //   sock.on('data', client._onDataHandler.bind(client))

  //   client._clearTimeout()

  //   client._tid = setTimeout(() => {
  //     client._tid = null
  //     client._cancelError(new Error('Connect timed out'), client._connectTask)
  //   }, data.timeout || client.options.connectTimeout)

  //   sock.connect(client.options.port, client.options.host)
  // }

  // NEW
  _connect () {
    return new Promise((resolve, reject) => {
      if (this.isConnected) return resolve()

      const sock = this.socket = new net.Socket()

      let onError
      let onConnect

      onError = (err) => {
        sock.removeListener('connect', onConnect)
        reject(err)
      }
      onConnect = () => {
        sock.removeListener('error', onError)
        resolve(sock)
      }

      sock.once('connect', onConnect)
      sock.once('error', onError)

      sock.on('data', this._onDataHandler.bind(this))

      sock.connect(this.options.port, this.options.host)
    })
  }

  /**
   * Open a connection to the DDS server.
   */
  // OLD
  // connect (timeout = DEFAULT_TIMEOUT) {
  //   return this.queue.push(this._connectTask, {
  //     client: this,
  //     timeout
  //   })
  // }

  // NEW
  connect (timeout = DEFAULT_TIMEOUT) {
    return Promise.race([
      this._connect(),
      new Promise((resolve, reject) => setTimeout(reject, timeout, new Error('Connect timeout')))
    ]).then(sock => {
      this.isConnected = true
      sock.once('close', this._onCloseHandler.bind(this))
      sock.once('error', this._onErrorHandler.bind(this))
      this.emit('connected', sock)
      return sock
    }).catch(err => {
      this.cancel()
      throw err
    })
  }

  // OLD
  // _disconnectTask ({data, done, error}) {
  //   const client = data.client

  //   if (!client.isConnected) return done()

  //   client._clearTimeout()

  //   client._tid = setTimeout(() => {
  //     client._tid = null
  //     client._cancelError(new Error('Disconnect timed out'), client._disconnectTask)
  //   }, data.timeout || client.options.disconnectTimeout)

  //   client.socket.destroy()
  // }

  // NEW
  _disconnect () {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) return reject(new Error('Not connected'))

      const sock = this.socket

      let onError
      let onClosed

      onError = (err) => {
        this.removeListener('closed', onClosed)
        reject(err)
      }
      onClosed = () => {
        sock.removeListener('error', onError)
        resolve(sock)
      }

      this.once('closed', onClosed)
      sock.once('error', onError)

      sock.destroy()
    })
  }

  /**
   * Close a connection to the DDS server.
   */
  // OLD
  // disconnect (timeout = DEFAULT_TIMEOUT) {
  //   return this.queue.push(this._disconnectTask, {
  //     client: this,
  //     timeout
  //   })
  // }

  // NEW
  disconnect (timeout = DEFAULT_TIMEOUT) {
    return Promise.race([
      this._disconnect(),
      new Promise((resolve, reject) => setTimeout(reject, timeout, new Error('Disconnect timeout')))
    ]).then(sock => {
      this.emit('disconnected', sock)
      return sock
    }).catch(err => {
      this.cancel()
      throw err
    })
  }

  // OLD
  // _requestTask ({data, error}) {
  //   const client = data.client

  //   if (!client.isConnected) return error(new Error('Not connected'))

  //   const code = Buffer.from(data.type.code)
  //   const body = data.type.formatter ? data.type.formatter().format(data.options) : EMPTY_BUF
  //   const len = Buffer.from(`00000${body.length}`.slice(-5))
  //   const msg = Buffer.concat([SYNC, code, len, body], SYNC.length + code.length + len.length + body.length)

  //   client._responseBegin()
  //   client._startRequestTimer()

  //   client.socket.write(msg)
  // }

  // NEW
  _request (type, options) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) return reject(new Error('Not connected'))

      const sock = this.socket

      let onError
      let onResponse

      errorCb = (err) => {
        this.removeListener('response', onResponse)
        reject(err)
      }
      onResponse = (res) => {
        sock.removeListener('error', onError)
        resolve(res)
      }

      this.once('response', onResponse)
      sock.once('error', onError)

      const code = Buffer.from(type.code)
      const body = type.formatter ? type.formatter().format(options) : EMPTY_BUF
      const len = Buffer.from(`00000${body.length}`.slice(-5))
      const msg = Buffer.concat([SYNC, code, len, body], SYNC.length + code.length + len.length + body.length)

      this._responseBegin()
      // TODO: Remove
      // this._startRequestTimer()

      sock.write(msg)
    })
  }

  /**
   * Send a specific DDS request message type with options.
   */
  // OLD
  // request (type, options) {
  //   return this.queue.push(this._requestTask, {
  //     client: this,
  //     options,
  //     type
  //   })
  // }

  // NEW
  request (type, options, timeout = DEFAULT_TIMEOUT) {
    return Promise.race([
      this._request(type, options),
      new Promise((resolve, reject) => setTimeout(reject, timeout, new Error('Request timeout')))
    ])
  }
}
