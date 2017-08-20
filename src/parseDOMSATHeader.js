import moment from 'moment'
import {
  CHANNEL_NUMBER_MAX,
  CHANNEL_NUMBER_MIN,
  DOMSAT_HEADER_LENGTH,
  LENGTH_MAX,
  LENGTH_MIN,
  SIGNAL_STRENGTH_MAX,
  SIGNAL_STRENGTH_MIN
} from './consts'

/**
 * Parses a DCP message DOMSAT header given a Buffer.
 */
export default function parseDOMSATHeader (buf) {
  if (buf.length < DOMSAT_HEADER_LENGTH) return

  const header = {}
  let body = buf

  /*
    DCP address
   */
  header.address = body.toString(null, 0, 8)
  body = body.slice(8)

  /*
    Time formatted as YYDDDHHMMSS
   */
  const timeStr = header.timeString = body.toString(null, 0, 11)
  const timeM = moment(`${timeStr}+0000`, 'YYDDDHHmmssZ', true).utc()
  if (!timeM) throw new Error('Invalid time format')
  header.timeDate = timeM.toDate()
  body = body.slice(11)

  /*
    Message type code
   */
  header.typeCode = body.toString(null, 0, 1)
  body = body.slice(1)

  /*
    Signal strength
   */
  // TODO: Should this be strict?
  if ((body.compare(SIGNAL_STRENGTH_MIN, 0, SIGNAL_STRENGTH_MIN.length, 0, SIGNAL_STRENGTH_MIN.length) < 0) ||
    (body.compare(SIGNAL_STRENGTH_MAX, 0, SIGNAL_STRENGTH_MAX.length, 0, SIGNAL_STRENGTH_MAX.length) > 0)) {
    throw new Error('Invalid signal strength value')
  }

  header.signalStrength = body.toString(null, 0, SIGNAL_STRENGTH_MIN.length) | 0
  body = body.slice(SIGNAL_STRENGTH_MIN.length)

  /*
    Frequency offset
   */
  header.frequencyOffset = body.toString(null, 0, 2)
  body = body.slice(2)

  /*
    Modulation index
   */
  header.modulationIndex = body.toString(null, 0, 1)
  body = body.slice(1)

  /*
    Data quality indicator
   */
  header.dataQualityIndicator = body.toString(null, 0, 1)
  body = body.slice(1)

  /*
    Channel number
   */
  // TODO: Should this be strict?
  if ((body.compare(CHANNEL_NUMBER_MIN, 0, CHANNEL_NUMBER_MIN.length, 0, CHANNEL_NUMBER_MIN.length) < 0) ||
    (body.compare(CHANNEL_NUMBER_MAX, 0, CHANNEL_NUMBER_MAX.length, 0, CHANNEL_NUMBER_MAX.length) > 0)) {
    throw new Error('Invalid channel number value')
  }

  header.channelNumber = body.toString(null, 0, CHANNEL_NUMBER_MIN.length) | 0
  body = body.slice(CHANNEL_NUMBER_MIN.length)

  /*
    Spacecraft indicator
   */
  header.spacecraftIndicator = body.toString(null, 0, 1)
  body = body.slice(1)

  /*
    Uplink carrier status
   */
  header.uplinkCarrierStatus = body.toString(null, 0, 2)
  body = body.slice(2)

  /*
    Body length
   */
  if ((body.compare(LENGTH_MIN, 0, LENGTH_MIN.length, 0, LENGTH_MIN.length) < 0) ||
    (body.compare(LENGTH_MAX, 0, LENGTH_MAX.length, 0, LENGTH_MAX.length) > 0)) {
    throw new Error('Invalid body length value')
  }

  header.length = body.toString(null, 0, LENGTH_MIN.length) | 0
  body = body.slice(LENGTH_MIN.length)

  return {
    header,
    body
  }
}
