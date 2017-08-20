'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _saxStream = require('sax-stream');

var _saxStream2 = _interopRequireDefault(_saxStream);

var _formatters = require('./formatters');

var f = _interopRequireWildcard(_formatters);

var _bodyParsers = require('./body-parsers');

var p = _interopRequireWildcard(_bodyParsers);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * DDS message types with their associated request formatters and response parsers.
 */
exports.default = {
  IdHello: {
    code: 'a',
    formatter() {
      return f.HelloRequestFormatter;
    },
    parser(reader) {
      return reader.pipe(new p.HelloResponseParser());
    }
  },

  IdAuthHello: {
    code: 'm',
    formatter() {
      return f.AuthHelloBodyFormatter;
    },
    parser(reader) {
      return reader.pipe(new p.AuthHelloRespParser());
    }
  },

  IdGoodbye: {
    code: 'b'
  },

  IdCriteria: {
    code: 'g',
    formatter() {
      return f.SearchCritReqFormatter;
    },
    parser(reader) {
      return reader.pipe(new p.SearchCritRespParser());
    }
  },

  IdDcp: {
    code: 'f',
    parser(reader) {
      return reader.pipe(new p.DcpReqBodyParser());
    }
  },

  IdDcpBlock: {
    code: 'n',
    parser(reader) {
      return reader.pipe(new p.MultDcpReqBodyParser());
    }
  },

  IdDcpBlockExt: {
    code: 'r',
    parser(reader) {
      return reader.pipe(_zlib2.default.createGunzip()).pipe((0, _saxStream2.default)({
        strict: true,
        tag: 'DcpMsg'
      })).pipe(new p.ExtMultDcpMsgParser());
    }
  }
};