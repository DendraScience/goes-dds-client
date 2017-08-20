'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * Contains state for either a normal or error response.
 */
class DDSResponse {
  constructor(options) {
    Object.assign(this, options);
  }

  destroy() {
    if (this.body) this.body.removeAllListeners();

    this.body = null;
    this.data = null;
  }

  _onDataHandler(data) {
    this._data.push(data);
  }

  _onEndHandler(resolve) {
    this.bodyUsed = true;
    this.body.removeAllListeners();
    resolve(this._data);
  }

  data() {
    if (this._data) return Promise.resolve(this._data);

    this._data = [];

    return new Promise(resolve => {
      this.body.on('data', this._onDataHandler.bind(this));
      this.body.once('end', this._onEndHandler.bind(this, resolve));
    });
  }
}
exports.default = DDSResponse;