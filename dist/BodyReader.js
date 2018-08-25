'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stream = require('stream');

/**
 * Attached to a client socket to read the response message body.
 */
class BodyReader extends _stream.Readable {
  constructor(options) {
    super(options);

    this.numBytes = options.length;
    this.socket = options.socket;

    if (options.buf) {
      this.push(options.buf);
      this.numBytes -= options.buf.length;

      if (this.numBytes <= 0) this.push(null);
    }

    if (this.socket && this.numBytes > 0) {
      this.onDataListener = this._onData.bind(this);
      this.socket.on('data', this.onDataListener);
    }
  }

  _onData(data) {
    this.push(data);
    this.numBytes -= data.length;

    if (this.numBytes <= 0) {
      this.push(null);
      this.socket.removeListener('data', this.onDataListener);
      this.onDataListener = null;
    }
  }

  _read() {}
}
exports.default = BodyReader;