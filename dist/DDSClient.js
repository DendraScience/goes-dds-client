'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _events = require('events');

var _taskQueue = require('@dendra-science/task-queue');

var tq = _interopRequireWildcard(_taskQueue);

var _consts = require('./consts');

var _BodyReader = require('./BodyReader');

var _BodyReader2 = _interopRequireDefault(_BodyReader);

var _DDSResponse = require('./DDSResponse');

var _DDSResponse2 = _interopRequireDefault(_DDSResponse);

var _parseDDSHeader = require('./parseDDSHeader');

var _parseDDSHeader2 = _interopRequireDefault(_parseDDSHeader);

var _bodyParsers = require('./body-parsers');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function errorBodyParser(reader) {
  return reader.pipe(new _bodyParsers.ErrorBodyParser());
}

/**
 * A client class for communicating with a DDS server over TCP.
 */
class DDSClient extends _events.EventEmitter {
  constructor(options) {
    super();

    this.options = Object.assign({
      host: 'cdadata.wcda.noaa.gov',
      port: 16003
    }, options);

    this.queue = new tq.TaskQueue();
  }

  /**
   * Cancel processing immediately and clean up.
   *
   * NOTE: It's recommended to call disconnect first!
   */
  destroy() {
    this.queue.destroy();

    this.queue = null;
  }

  _response(res) {
    this.emit('response', res);

    const item = this.queue.head;
    const header = this._responseHeader;
    if (item && item.task === this._requestTask && header && header.type === item.data.type) {
      item.done(res, false);
    }
  }

  _responseBegin(header = null) {
    this._responseHeader = header;
  }

  _responseEnd() {
    const item = this.queue.head;
    const header = this._responseHeader;
    if (item && item.task === this._requestTask && header && header.type === item.data.type) {
      this.queue.next();
    }
  }

  _responseError(err) {
    this.emit('error', err);

    const item = this.queue.head;
    const header = this._responseHeader;
    if (item && item.task === this._requestTask && (!header || header.type === item.data.type)) {
      return item.isCompleted ? this.queue.next() : item.error(err);
    }
  }

  // JSS: Implementation on hold - it's more complicated than this
  // _startRequestTimeout() {
  //   const item = this.queue.head
  //   if (item && (item.task === this._requestTask)) {
  //     if (item.data.tid) clearTimeout(item.data.tid)
  //     item.data.tid = setTimeout(() => {
  //       delete item.data.tid
  //       _responseError(new Error('Request timed out'))
  //     }, 5000)
  //   }
  // }

  _onCloseHandler() {
    this._buf = null;
    this._dataState = 0;
    this.isConnected = false;
    this.socket.removeAllListeners();
    this.socket.unref();

    const item = this.queue.head;
    if (item && item.task === this._disconnectTask) {
      item.done();
    }
  }

  _onConnectHandler() {
    this._buf = null;
    this._dataState = 1;
    this.isConnected = true;

    const item = this.queue.head;
    if (item && item.task === this._connectTask) {
      item.done(this.socket);
    }
  }

  _onDataHandler(data) {
    this._buf = this._buf ? Buffer.concat([this._buf, data], this._buf.length + data.length) : data;

    while (this._buf.length > 0) {
      /*
        Loop to process (potentially) multiple messages in the buffer.
       */

      // State 1: Parse header
      if (this._dataState === 1) {
        try {
          const ret = (0, _parseDDSHeader2.default)(this._buf);
          if (!ret) break; // Need more bytes

          this._responseBegin(ret.header);
          this._buf = ret.body;
          this._dataState++;
        } catch (e) {
          this._responseBegin();
          this._responseError(e);
          this._buf = null;
          this._dataState = 1;
          return;
        }
      }

      // State 2: Prepare response
      if (this._dataState === 2) {
        const header = this._responseHeader;

        let parser;
        let resOpts;

        if (header.length === 0) {
          // Normal response - empty body
          resOpts = {
            header
          };
        } else if (this._buf.length === 0) {
          // No response yet - need more bytes
        } else if (this._buf[0] === _consts.ERROR_CHAR[0]) {
          // Error response - use error body parser
          parser = errorBodyParser;
          resOpts = {
            header,
            isErrorBody: true
          };
        } else if (header.type.parser) {
          // Normal response - use type parser
          parser = header.type.parser;
          resOpts = {
            header
          };
        } else {
          // Normal response - no parser
          resOpts = {
            header
          };
        }

        if (!resOpts) break; // Unable to construct opts

        const minBytes = Math.min(this._buf.length, header.length);

        if (parser) {
          resOpts.body = parser(new _BodyReader2.default({
            buf: this._buf.slice(0, minBytes),
            length: header.length,
            socket: this.socket
          }));
        }

        this._response(new _DDSResponse2.default(resOpts));
        this._receivedBytes = minBytes;
        this._buf = this._buf.slice(minBytes);
        this._dataState++;
      }

      // State 3: Wait for end of body
      if (this._dataState === 3) {
        const header = this._responseHeader;

        this._receivedBytes += this._buf.length;
        if (this._receivedBytes < header.length) {
          this._buf = null; // Discard since the body parsers do the real work
          break; // Need more bytes
        }

        this._responseEnd();
        this._buf = this._buf.slice(this._buf.length - (this._receivedBytes - header.length)); // Trim to next message
        this._dataState = 1;
      }
    }
  }

  _onErrorHandler(err) {
    const item = this.queue.head;
    if (this.socket.connecting && item && item.task === this._connectTask) {
      item.error(err);
    }
  }

  _connectTask({ data, done, error }) {
    const client = data.client;

    if (client.isConnected) return done();

    const sock = client.socket = new _net2.default.Socket();
    sock.once('close', client._onCloseHandler.bind(client));
    sock.once('connect', client._onConnectHandler.bind(client));
    sock.once('error', client._onErrorHandler.bind(client));
    sock.on('data', client._onDataHandler.bind(client));
    sock.connect(client.options.port, client.options.host);
  }

  /**
   * Open a connection to the DDS server.
   */
  connect() {
    return this.queue.push(this._connectTask, {
      client: this
    });
  }

  _disconnectTask({ data, done, error }) {
    const client = data.client;

    if (!client.isConnected) return done();

    client.socket.destroy();
  }

  /**
   * Close a connection to the DDS server.
   */
  disconnect() {
    return this.queue.push(this._disconnectTask, {
      client: this
    });
  }

  _requestTask({ data, done, error }) {
    const client = data.client;

    if (!client.isConnected) return error(new Error('Not connected'));

    const code = Buffer.from(data.type.code);
    const body = data.type.formatter ? data.type.formatter().format(data.options) : _consts.EMPTY_BUF;
    const len = Buffer.from(`00000${body.length}`.slice(-5));
    const msg = Buffer.concat([_consts.SYNC, code, len, body], _consts.SYNC.length + code.length + len.length + body.length);

    client.socket.write(msg);
  }

  /**
   * Send a specific DDS request message type with options.
   */
  request(type, options) {
    return this.queue.push(this._requestTask, {
      client: this,
      options,
      type
    });
  }
}
exports.default = DDSClient;