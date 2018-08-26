/**
 * Main tests
 */

const moment = require('moment')
const now = moment().utc()
const since = now.clone().subtract(15, 'd').startOf('d')
const until = since.clone().add(1, 'd')

const DATE_FORMAT = 'YYYY/DDDD HH:mm:ss'
const DCP_ADDRESS = 'BEC025B0' // Burns

describe('Module', function () {
  this.timeout(180000)

  const authOpts = {
    algorithm: 'sha256',
    username: process.env.DDS_USER,
    password: process.env.DDS_PASS
  }
  let dds
  let client

  after(async function () {
    try {
      if (client) await client.disconnect()
    } catch (_) {
    }
  })

  it('verify DDS_PASS and DDS_USER', function () {
    /*
      You must pass authentication variables when running tests, e.g.:

      DDS_USER=abc DDS_PASS=def npm run test:watch
     */

    /* eslint-disable no-unused-expressions */
    expect(authOpts).to.have.property('username').exist
    /* eslint-disable no-unused-expressions */
    expect(authOpts).to.have.property('password').exist
  })

  it('should import', function () {
    dds = require('../../dist')

    expect(dds).to.have.property('DDSClient')
    expect(dds).to.have.property('types')
  })

  it('should create client', function () {
    client = new dds.DDSClient()

    expect(client).to.respondTo('request')
  })

  it('should connect', function () {
    return client.connect().then(() => {
      expect(client).to.have.property('isConnected', true)
    })
  })

  it('should wait after connect', function () {
    return new Promise(resolve => setTimeout(resolve, 2000))
  })

  it('should request IdAuthHello', function () {
    return client.request(dds.types.IdAuthHello, authOpts).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'm'
      })
      return res.data()
    }).then(data => {
      console.log('IdAuthHello data', data)

      expect(data).to.have.property('0').to.include({
        protocolVersion: 14
      })
    })
  })

  it('should wait after IdAuthHello', function () {
    return new Promise(resolve => setTimeout(resolve, 2000))
  })

  it('should request IdCriteria #1', function () {
    return client.request(dds.types.IdCriteria, {
      DCP_ADDRESS: DCP_ADDRESS,
      DRS_SINCE: since.format(DATE_FORMAT),
      DRS_UNTIL: until.format(DATE_FORMAT)
    }).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'g'
      })
      return res.data()
    }).then(data => {
      console.log('IdCriteria #1 data', data)

      expect(data).to.have.property('0').to.include({
        success: true
      })
    })
  })

  it('should wait after IdCriteria #1', function () {
    return new Promise(resolve => setTimeout(resolve, 2000))
  })

  it('should request IdDcp', function () {
    return client.request(dds.types.IdDcp).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'f'
      })
      return res.data()
    }).then(data => {
      console.log('IdDcp data', data)

      expect(data).to.have.nested.property('0.message.header').to.include({
        spacecraftIndicator: 'W',
        length: 1046
      })
      expect(data).to.have.nested.property('0.message.body.length', 1046)
    })
  })

  it('should wait after IdDcp', function () {
    return new Promise(resolve => setTimeout(resolve, 2000))
  })

  it('should request IdCriteria #2', function () {
    return client.request(dds.types.IdCriteria, {
      DCP_ADDRESS: DCP_ADDRESS,
      DRS_SINCE: since.format(DATE_FORMAT),
      DRS_UNTIL: until.format(DATE_FORMAT)
    }).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'g'
      })
      return res.data()
    }).then(data => {
      console.log('IdCriteria #2 data', data)

      expect(data).to.have.property('0').to.include({
        success: true
      })
    })
  })

  it('should wait after IdCriteria #2', function () {
    return new Promise(resolve => setTimeout(resolve, 2000))
  })

  it('should request IdDcpBlock', function () {
    return client.request(dds.types.IdDcpBlock).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'n'
      })
      return res.data()
    }).then(data => {
      console.log('IdDcpBlock data', data)

      expect(data).to.have.nested.property('0.message.header').to.include({
        spacecraftIndicator: 'W',
        length: 1046
      })
      expect(data).to.have.nested.property('0.message.body.length', 1046)
    })
  })

  it('should wait after IdDcpBlock', function () {
    return new Promise(resolve => setTimeout(resolve, 2000))
  })

  it('should request IdCriteria #3', function () {
    return client.request(dds.types.IdCriteria, {
      DCP_ADDRESS: DCP_ADDRESS,
      DRS_SINCE: since.format(DATE_FORMAT),
      DRS_UNTIL: until.format(DATE_FORMAT)
    }).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'g'
      })
      return res.data()
    }).then(data => {
      console.log('IdCriteria #3 data', data)

      expect(data).to.have.property('0').to.include({
        success: true
      })
    })
  })

  it('should wait after IdCriteria #3', function () {
    return new Promise(resolve => setTimeout(resolve, 2000))
  })

  it('should request IdDcpBlockExt', function () {
    return client.request(dds.types.IdDcpBlockExt).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'r'
      })
      return res.data()
    }).then(data => {
      console.log('IdDcpBlockExt data', data)

      expect(data).to.have.nested.property('0.message.header').to.include({
        spacecraftIndicator: 'W',
        length: 1046
      })
      expect(data).to.have.nested.property('0.message.body.length', 1046)
    })
  })

  it('should wait after IdDcpBlockExt', function () {
    return new Promise(resolve => setTimeout(resolve, 2000))
  })

  it('should request IdGoodbye', function () {
    return client.request(dds.types.IdGoodbye).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'b'
      })
    })
  })

  it('should disconnect', function () {
    return client.disconnect().then(() => {
      expect(client).to.have.property('isConnected', false)
    })
  })
})
