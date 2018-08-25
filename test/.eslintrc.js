// SEE: http://eslint.org/docs/user-guide/configuring
module.exports = {
  env: {
    'mocha': true,
    'node': true
  },
  extends: 'standard',
  globals: {
    assert: true,
    expect: true,
    helper: true,
    main: true,
    path: true
  },
  root: true,
  parserOptions: {
    sourceType: 'module'
  }
}
