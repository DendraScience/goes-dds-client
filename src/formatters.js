/**
 * A set of formatter functions to prepare a variety of request messages.
 */
import crypto from 'crypto'
import moment from 'moment'

class BodyFormatter {
  static format () {}
}

export class HelloRequestFormatter extends BodyFormatter {
  static format (options) {
    return Buffer.from(options.username || '')
  }
}

export class AuthHelloBodyFormatter extends BodyFormatter {
  static format (options) {
    const m = moment().utc()
    const un = options.username || ''
    const unBuf = Buffer.from(un)
    const pwBuf = Buffer.from(options.password || '')

    const preBuf = Buffer.concat([
      unBuf,
      pwBuf,
      unBuf,
      pwBuf
    ], (unBuf.length + pwBuf.length) * 2)

    const preHash = crypto.createHash('sha1').update(preBuf).digest()

    const timeBuf = Buffer.allocUnsafe(4)
    timeBuf.writeInt32BE(m.unix(), 0)

    const authBuf = Buffer.concat([
      unBuf,
      preHash,
      timeBuf,
      unBuf,
      preHash,
      timeBuf], (unBuf.length + preHash.length + timeBuf.length) * 2)

    const authHashStr = crypto.createHash(options.algorithm || 'sha1').update(authBuf).digest('hex').toUpperCase()

    return Buffer.from(`${un} ${m.format('YYDDDDHHmmss')} ${authHashStr}`)
  }
}

export class SearchCritReqFormatter extends BodyFormatter {
  static format (options) {
    return Buffer.from(Object.keys(options).reduce((str, key) => {
      return `${str}${key}: ${options[key]}\n`
    }, ' '.repeat(50)))
  }
}
