'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ExtMultDcpMsgParser = exports.MultDcpReqBodyParser = exports.DcpReqBodyParser = exports.SearchCritRespParser = exports.AuthHelloRespParser = exports.HelloResponseParser = exports.ErrorBodyParser = exports.DebugBodyParser = undefined;

var _stream = require('stream');

var _consts = require('./consts');

var _parseDOMSATHeader = require('./parseDOMSATHeader');

var _parseDOMSATHeader2 = _interopRequireDefault(_parseDOMSATHeader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class BodyParser extends _stream.Transform {
  constructor(options) {
    super(Object.assign({}, options, {
      allowHalfOpen: false,
      readableObjectMode: true
    }));
  }
} /**
   * A set of transform streams to parse the various response body formats.
   */
class DebugBodyParser extends BodyParser {
  _flush(callback) {
    this.push({
      buffer: this._buf,
      string: this._buf.toString(),
      length: this._buf.length
    });

    callback();
  }

  _transform(chunk, encoding, callback) {
    this._buf = this._buf ? Buffer.concat([this._buf, chunk], this._buf.length + chunk.length) : chunk;

    callback();
  }
}

exports.DebugBodyParser = DebugBodyParser;
class ErrorBodyParser extends BodyParser {
  _flush(callback) {
    const str = this._buf.toString(_consts.ENCODING, 1, this._buf.length);
    const parts = str.split(',');

    this.push({
      explanation: parts.slice(2).join(','),
      serverCode: parts[0] | 0,
      systemCode: parts[1] | 0
    });

    callback();
  }

  _transform(chunk, encoding, callback) {
    this._buf = this._buf ? Buffer.concat([this._buf, chunk], this._buf.length + chunk.length) : chunk;

    callback();
  }
}

exports.ErrorBodyParser = ErrorBodyParser;
class HelloResponseParser extends BodyParser {
  _flush(callback) {
    const str = this._buf.toString(_consts.ENCODING, 0, this._buf.length);
    const parts = str.split(' ');

    this.push({
      username: parts[0],
      protocolVersion: parts[1] | 0
    });

    callback();
  }

  _transform(chunk, encoding, callback) {
    this._buf = this._buf ? Buffer.concat([this._buf, chunk], this._buf.length + chunk.length) : chunk;

    callback();
  }
}

exports.HelloResponseParser = HelloResponseParser;
class AuthHelloRespParser extends BodyParser {
  _flush(callback) {
    const str = this._buf.toString(_consts.ENCODING, 0, this._buf.length);
    const parts = str.split(' ');

    this.push({
      username: parts[0],
      timeString: parts[1],
      protocolVersion: parts[2] | 0
    });

    callback();
  }

  _transform(chunk, encoding, callback) {
    this._buf = this._buf ? Buffer.concat([this._buf, chunk], this._buf.length + chunk.length) : chunk;

    callback();
  }
}

exports.AuthHelloRespParser = AuthHelloRespParser;
class SearchCritRespParser extends BodyParser {
  _flush(callback) {
    this.push({
      success: true
    });

    callback();
  }

  _transform(chunk, encoding, callback) {
    callback();
  }
}

exports.SearchCritRespParser = SearchCritRespParser;
class DcpReqBodyParser extends BodyParser {
  constructor(options) {
    super(options);

    this._dataState = 1;
  }

  _transform(chunk, encoding, callback) {
    this._buf = this._buf ? Buffer.concat([this._buf, chunk], this._buf.length + chunk.length) : chunk;

    while (this._buf.length > 0) {
      // State 1: Get file name
      if (this._dataState === 1) {
        if (this._buf.length < _consts.FILE_NAME_LENGTH) break; // Need more bytes

        const zeroIndex = this._buf.indexOf(0);
        this._obj = {
          fileName: this._buf.toString(_consts.ENCODING, 0, zeroIndex > -1 ? zeroIndex : _consts.FILE_NAME_LENGTH)
        };
        this._buf = this._buf.slice(_consts.FILE_NAME_LENGTH);
        this._dataState++;
      }

      // State 2: Parse header
      if (this._dataState === 2) {
        try {
          const ret = (0, _parseDOMSATHeader2.default)(this._buf);
          if (!ret) break; // Need more bytes

          this._obj.message = {
            header: ret.header
          };
          this._buf = ret.body;
          this._dataState++;
        } catch (e) {
          this._buf = null;
          this._dataState = 1;
          callback(e);
          return;
        }
      }

      // State 3: Obtain body
      if (this._dataState === 3) {
        const header = this._obj.message.header;

        if (this._buf.length < header.length) break; // Need more bytes

        this._obj.message.body = this._buf.slice(0, header.length);
        this.push(this._obj);

        this._buf = this._buf.slice(header.length); // Trim to next message
        this._dataState = 1;
      }
    }

    callback();
  }
}

exports.DcpReqBodyParser = DcpReqBodyParser;
class MultDcpReqBodyParser extends BodyParser {
  constructor(options) {
    super(options);

    this._dataState = 1;
  }

  _transform(chunk, encoding, callback) {
    this._buf = this._buf ? Buffer.concat([this._buf, chunk], this._buf.length + chunk.length) : chunk;

    while (this._buf.length > 0) {
      // State 1: Parse header
      if (this._dataState === 1) {
        try {
          const ret = (0, _parseDOMSATHeader2.default)(this._buf);
          if (!ret) break; // Need more bytes

          this._obj = {
            message: {
              header: ret.header
            }
          };
          this._buf = ret.body;
          this._dataState++;
        } catch (e) {
          this._buf = null;
          this._dataState = 1;
          callback(e);
          return;
        }
      }

      // State 2: Obtain body
      if (this._dataState === 2) {
        const header = this._obj.message.header;

        if (this._buf.length < header.length) break; // Need more bytes

        this._obj.message.body = this._buf.slice(0, header.length);
        this.push(this._obj);

        this._buf = this._buf.slice(header.length); // Trim to next message
        this._dataState = 1;
      }
    }

    callback();
  }
}

exports.MultDcpReqBodyParser = MultDcpReqBodyParser;
class ExtMultDcpMsgParser extends BodyParser {
  constructor(options) {
    super(Object.assign({}, options, {
      writableObjectMode: true
    }));
  }

  _transform(chunk, encoding, callback) {
    const obj = {};

    const attribs = chunk.attribs;
    if (attribs) {
      if (attribs.flags) obj.platformId = attribs.flags;
      if (attribs.platformId) obj.platformId = attribs.platformId;
    }

    const children = chunk.children;
    if (children) {
      if (children.DomsatSeq) obj.domsatSeq = children.DomsatSeq.value | 0;
      if (children.DomsatTime) obj.domsatTimeString = children.DomsatTime.value;
      if (children.CarrierStart) obj.carrierStartString = children.CarrierStart.value;
      if (children.CarrierStop) obj.carrierStopString = children.CarrierStop.value;
      if (children.Baud) obj.baud = children.Baud.value | 0;
      if (children.BinaryMsg) {
        try {
          const ret = (0, _parseDOMSATHeader2.default)(Buffer.from(children.BinaryMsg.value, 'base64'));
          if (!ret) throw new Error('Incomplete header');

          obj.message = ret;
        } catch (e) {
          callback(e);
          return;
        }
      }
    }

    callback(null, obj);
  }
}
exports.ExtMultDcpMsgParser = ExtMultDcpMsgParser;