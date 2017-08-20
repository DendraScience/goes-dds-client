'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SearchCritReqFormatter = exports.AuthHelloBodyFormatter = exports.HelloRequestFormatter = undefined;

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * A set of formatter functions to prepare a variety of request messages.
 */
class BodyFormatter {
  static format() {}
}

class HelloRequestFormatter extends BodyFormatter {
  static format(options) {
    return Buffer.from(options.username || '');
  }
}

exports.HelloRequestFormatter = HelloRequestFormatter;
class AuthHelloBodyFormatter extends BodyFormatter {
  static format(options) {
    const m = (0, _moment2.default)().utc();
    const un = options.username || '';
    const unBuf = Buffer.from(un);
    const pwBuf = Buffer.from(options.password || '');

    const preBuf = Buffer.concat([unBuf, pwBuf, unBuf, pwBuf], (unBuf.length + pwBuf.length) * 2);

    const preHash = _crypto2.default.createHash('sha1').update(preBuf).digest();

    const timeBuf = Buffer.allocUnsafe(4);
    timeBuf.writeInt32BE(m.unix(), 0);

    const authBuf = Buffer.concat([unBuf, preHash, timeBuf, unBuf, preHash, timeBuf], (unBuf.length + preHash.length + timeBuf.length) * 2);

    const authHashStr = _crypto2.default.createHash(options.algorithm || 'sha1').update(authBuf).digest('hex').toUpperCase();

    return Buffer.from(`${un} ${m.format('YYDDDHHmmss')} ${authHashStr}`);
  }
}

exports.AuthHelloBodyFormatter = AuthHelloBodyFormatter;
class SearchCritReqFormatter extends BodyFormatter {
  static format(options) {
    return Buffer.from(Object.keys(options).reduce((str, key) => {
      return `${str}${key}: ${options[key]}\n`;
    }, ' '.repeat(50)));
  }
}
exports.SearchCritReqFormatter = SearchCritReqFormatter;