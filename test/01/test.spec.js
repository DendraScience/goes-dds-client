/**
 * Main tests
 */

const moment = require('moment')
const now = moment().utc()
const since = now.clone().subtract(15, 'd').startOf('d')
const until = since.clone().add(1, 'd')

const DATE_FORMAT = 'YYYY/DDD HH:mm:ss'
const DCP_ADDRESS = 'BEC0035C'

describe('Module', function () {
  this.timeout(60000)

  const authOpts = {
    algorithm: 'sha256',
    username: process.env.DDS_USER,
    password: process.env.DDS_PASS
  }
  let dds
  let client

  it('verify DDS_PASS and DDS_USER', function () {
    /*
      You must pass authentication variables when running tests, e.g.:

      DDS_USER=abc DDS_PASS=def npm run test:watch
     */
    expect(authOpts).to.have.property('username').exist
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

  it('should request IdAuthHello', function () {
    return client.request(dds.types.IdAuthHello, authOpts).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'm'
      })
      return res.data()
    }).then(data => {
      expect(data).to.have.property('0').to.include({
        protocolVersion: 14
      })
    })
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
      expect(data).to.have.property('0').to.include({
        success: true
      })
    })
  })

  it('should request IdDcp', function () {
    return client.request(dds.types.IdDcp).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'f'
      })
      return res.data()
    }).then(data => {
      expect(data).to.have.nested.property('0.message.header').to.include({
        spacecraftIndicator: 'W',
        length: 488
      })
      expect(data).to.have.nested.property('0.message.body.length', 488)
    })
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
      expect(data).to.have.property('0').to.include({
        success: true
      })
    })
  })

  it('should request IdDcpBlock', function () {
    return client.request(dds.types.IdDcpBlock).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'n'
      })
      return res.data()
    }).then(data => {
      expect(data).to.have.nested.property('0.message.header').to.include({
        spacecraftIndicator: 'W',
        length: 488
      })
      expect(data).to.have.nested.property('0.message.body.length', 488)
    })
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
      expect(data).to.have.property('0').to.include({
        success: true
      })
    })
  })

  it('should request IdDcpBlockExt', function () {
    return client.request(dds.types.IdDcpBlockExt).then(res => {
      expect(res).to.have.property('header').to.include({
        typeCode: 'r'
      })
      return res.data()
    }).then(data => {
      expect(data).to.have.nested.property('0.message.header').to.include({
        spacecraftIndicator: 'W',
        length: 488
      })
      expect(data).to.have.nested.property('0.message.body.length', 488)
    })
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
