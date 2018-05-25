import {
  ENCODING,
  LENGTH_MAX,
  LENGTH_MIN,
  SYNC
} from './consts'
import types from './message-types'

const typeCodes = Object.keys(types).reduce((obj, k) => {
  obj[types[k].code] = types[k]
  return obj
}, {})

/**
 * Parses a DDS response header given a Buffer.
 */
export default function parseDDSHeader (buf) {
  if (buf.length < SYNC.length + LENGTH_MIN.length + 1) return

  const header = {}
  let body = buf

  /*
    Sync
   */
  if (body.compare(SYNC, 0, SYNC.length, 0, SYNC.length) !== 0) {
    throw new Error('Missing sync characters')
  }

  body = body.slice(SYNC.length)

  /*
    Message type code
   */
  header.typeCode = body.toString(ENCODING, 0, 1)
  header.type = typeCodes[header.typeCode]
  if (!header.type) throw new Error('Unknown message type code')

  body = body.slice(1)

  /*
    Body length
   */
  if ((body.compare(LENGTH_MIN, 0, LENGTH_MIN.length, 0, LENGTH_MIN.length) < 0) ||
    (body.compare(LENGTH_MAX, 0, LENGTH_MAX.length, 0, LENGTH_MAX.length) > 0)) {
    throw new Error('Invalid body length value')
  }

  header.length = body.toString(ENCODING, 0, LENGTH_MIN.length) | 0
  body = body.slice(LENGTH_MIN.length)

  return {
    header,
    body
  }
}
