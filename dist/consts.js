'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Common constants.
 */
const CHANNEL_NUMBER_MAX = exports.CHANNEL_NUMBER_MAX = Buffer.from('999');
const CHANNEL_NUMBER_MIN = exports.CHANNEL_NUMBER_MIN = Buffer.from('000');
const DOMSAT_HEADER_LENGTH = exports.DOMSAT_HEADER_LENGTH = 37;
const EMPTY_BUF = exports.EMPTY_BUF = Buffer.alloc(0);
const ERROR_CHAR = exports.ERROR_CHAR = Buffer.from('?');
const ENCODING = exports.ENCODING = 'ascii';
const FILE_NAME_LENGTH = exports.FILE_NAME_LENGTH = 40;
const LENGTH_MAX = exports.LENGTH_MAX = Buffer.from('99999');
const LENGTH_MIN = exports.LENGTH_MIN = Buffer.from('00000');
const SIGNAL_STRENGTH_MAX = exports.SIGNAL_STRENGTH_MAX = Buffer.from('99');
const SIGNAL_STRENGTH_MIN = exports.SIGNAL_STRENGTH_MIN = Buffer.from('00');
const SYNC = exports.SYNC = Buffer.from('FAF0');