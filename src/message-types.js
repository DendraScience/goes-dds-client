/**
 * DDS message types with their associated request formatters and response parsers.
 */
import zlib from 'zlib'
import saxStream from 'sax-stream'
import * as f from './formatters'
import * as p from './body-parsers'

export default {
  IdHello: {
    code: 'a',
    formatter () {
      return f.HelloRequestFormatter
    },
    parser (reader) {
      return reader.pipe(new p.HelloResponseParser())
    }
  },

  IdAuthHello: {
    code: 'm',
    formatter () {
      return f.AuthHelloBodyFormatter
    },
    parser (reader) {
      return reader.pipe(new p.AuthHelloRespParser())
    }
  },

  IdGoodbye: {
    code: 'b'
  },

  IdCriteria: {
    code: 'g',
    formatter () {
      return f.SearchCritReqFormatter
    },
    parser (reader) {
      return reader.pipe(new p.SearchCritRespParser())
    }
  },

  IdDcp: {
    code: 'f',
    parser (reader) {
      return reader.pipe(new p.DcpReqBodyParser())
    }
  },

  IdDcpBlock: {
    code: 'n',
    parser (reader) {
      return reader.pipe(new p.MultDcpReqBodyParser())
    }
  },

  IdDcpBlockExt: {
    code: 'r',
    parser (reader) {
      return reader.pipe(zlib.createGunzip()).pipe(saxStream({
        strict: true,
        tag: 'DcpMsg'
      })).pipe(new p.ExtMultDcpMsgParser())
    }
  }
}
