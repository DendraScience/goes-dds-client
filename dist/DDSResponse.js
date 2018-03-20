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
    this._data = null;
  }

  _onDataHandler(data) {
    this._data.push(data);
  }

  _onEndHandler(resolve) {
    this.bodyUsed = true;
    this.body.removeAllListeners();
    resolve(this._data);
  }

  _onErrorHandler(reject, err) {
    this.error = err;
    this.body.removeAllListeners();
    reject(err);
  }

  data() {
    if (this.error) return Promise.reject(this.error);
    if (this._data) return Promise.resolve(this._data);

    this._data = [];

    return new Promise((resolve, reject) => {
      this.body.on('data', this._onDataHandler.bind(this));
      this.body.once('end', this._onEndHandler.bind(this, resolve));
      this.body.once('error', this._onErrorHandler.bind(this, reject));
    });
  }
}
exports.default = DDSResponse;