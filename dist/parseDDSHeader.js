'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseDDSHeader;

var _consts = require('./consts');

var _messageTypes = require('./message-types');

var _messageTypes2 = _interopRequireDefault(_messageTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const typeCodes = Object.keys(_messageTypes2.default).reduce((obj, k) => {
  obj[_messageTypes2.default[k].code] = _messageTypes2.default[k];
  return obj;
}, {});

/**
 * Parses a DDS response header given a Buffer.
 */
function parseDDSHeader(buf) {
  if (buf.length < _consts.SYNC.length + _consts.LENGTH_MIN.length + 1) return;

  const header = {};
  let body = buf;

  /*
    Sync
   */
  if (body.compare(_consts.SYNC, 0, _consts.SYNC.length, 0, _consts.SYNC.length) !== 0) {
    throw new Error('Missing sync characters');
  }

  body = body.slice(_consts.SYNC.length);

  /*
    Message type code
   */
  header.typeCode = body.toString(_consts.ENCODING, 0, 1);
  header.type = typeCodes[header.typeCode];
  if (!header.type) throw new Error('Unknown message type code');

  body = body.slice(1);

  /*
    Body length
   */
  if (body.compare(_consts.LENGTH_MIN, 0, _consts.LENGTH_MIN.length, 0, _consts.LENGTH_MIN.length) < 0 || body.compare(_consts.LENGTH_MAX, 0, _consts.LENGTH_MAX.length, 0, _consts.LENGTH_MAX.length) > 0) {
    throw new Error('Invalid body length value');
  }

  header.length = body.toString(_consts.ENCODING, 0, _consts.LENGTH_MIN.length) | 0;
  body = body.slice(_consts.LENGTH_MIN.length);

  return {
    header,
    body
  };
}