'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseDOMSATHeader;

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _consts = require('./consts');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Parses a DCP message DOMSAT header given a Buffer.
 */
function parseDOMSATHeader(buf) {
  if (buf.length < _consts.DOMSAT_HEADER_LENGTH) return;

  const header = {};
  let body = buf;

  /*
    DCP address
   */
  header.address = body.toString(_consts.ENCODING, 0, 8);
  body = body.slice(8);

  /*
    Time formatted as YYDDDHHMMSS
   */
  const timeStr = header.timeString = body.toString(_consts.ENCODING, 0, 11);
  const timeM = (0, _moment2.default)(`${timeStr}+0000`, 'YYDDDHHmmssZ', true).utc();
  if (!timeM) throw new Error('Invalid time format');
  header.timeDate = timeM.toDate();
  body = body.slice(11);

  /*
    Message type code
   */
  header.typeCode = body.toString(_consts.ENCODING, 0, 1);
  body = body.slice(1);

  /*
    Signal strength
   */
  // TODO: Should this be strict?
  if (body.compare(_consts.SIGNAL_STRENGTH_MIN, 0, _consts.SIGNAL_STRENGTH_MIN.length, 0, _consts.SIGNAL_STRENGTH_MIN.length) < 0 || body.compare(_consts.SIGNAL_STRENGTH_MAX, 0, _consts.SIGNAL_STRENGTH_MAX.length, 0, _consts.SIGNAL_STRENGTH_MAX.length) > 0) {
    throw new Error('Invalid signal strength value');
  }

  header.signalStrength = body.toString(_consts.ENCODING, 0, _consts.SIGNAL_STRENGTH_MIN.length) | 0;
  body = body.slice(_consts.SIGNAL_STRENGTH_MIN.length);

  /*
    Frequency offset
   */
  header.frequencyOffset = body.toString(_consts.ENCODING, 0, 2);
  body = body.slice(2);

  /*
    Modulation index
   */
  header.modulationIndex = body.toString(_consts.ENCODING, 0, 1);
  body = body.slice(1);

  /*
    Data quality indicator
   */
  header.dataQualityIndicator = body.toString(_consts.ENCODING, 0, 1);
  body = body.slice(1);

  /*
    Channel number
   */
  // TODO: Should this be strict?
  if (body.compare(_consts.CHANNEL_NUMBER_MIN, 0, _consts.CHANNEL_NUMBER_MIN.length, 0, _consts.CHANNEL_NUMBER_MIN.length) < 0 || body.compare(_consts.CHANNEL_NUMBER_MAX, 0, _consts.CHANNEL_NUMBER_MAX.length, 0, _consts.CHANNEL_NUMBER_MAX.length) > 0) {
    throw new Error('Invalid channel number value');
  }

  header.channelNumber = body.toString(_consts.ENCODING, 0, _consts.CHANNEL_NUMBER_MIN.length) | 0;
  body = body.slice(_consts.CHANNEL_NUMBER_MIN.length);

  /*
    Spacecraft indicator
   */
  header.spacecraftIndicator = body.toString(_consts.ENCODING, 0, 1);
  body = body.slice(1);

  /*
    Uplink carrier status
   */
  header.uplinkCarrierStatus = body.toString(_consts.ENCODING, 0, 2);
  body = body.slice(2);

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