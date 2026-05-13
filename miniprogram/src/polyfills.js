// 微信小程序 Polyfill
// 此文件必须在所有其他代码之前执行
// 强制覆盖 URL/Headers/Request/Response 实现

(function() {
  // URL 解析函数
  function parseUrl(urlString) {
    if (!urlString || typeof urlString !== 'string' || urlString.trim() === '') {
      return {
        protocol: 'https:',
        hostname: '',
        port: '',
        pathname: '/',
        search: '',
        hash: '',
        host: '',
        origin: 'null',
        href: urlString || '',
      };
    }
    
    // 处理完整的 URL
    var match = urlString.match(/^(\w+:)\/\/([^/:]+)(?::(\d+))?(\/.*)?(\?.*)?(#.*)?$/);
    if (match) {
      return {
        protocol: match[1],
        hostname: match[2],
        port: match[3] || '',
        pathname: match[4] || '/',
        search: match[5] || '',
        hash: match[6] || '',
        host: match[2] + (match[3] ? ':' + match[3] : ''),
        origin: match[1] + '//' + match[2],
        href: urlString,
      };
    }
    
    // 处理只有路径的情况
    var parts = urlString.split('/');
    var host = parts[2] || '';
    return {
      protocol: 'https:',
      hostname: host,
      port: '',
      pathname: '/' + (parts.slice(3).join('/') || ''),
      search: '',
      hash: '',
      host: host,
      origin: 'https://' + host,
      href: urlString,
    };
  }

  // 强制覆盖 URL - 不检查是否已存在
  globalThis.URL = function(url, base) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      this.protocol = 'https:';
      this.hostname = '';
      this.port = '';
      this.pathname = '/';
      this.search = '';
      this.hash = '';
      this.host = '';
      this.origin = 'null';
      this.href = '';
      this.username = '';
      this.password = '';
      return;
    }
    
    var fullUrl = url;
    if (base && !url.match(/^\w+:\/\//)) {
      if (url.startsWith('//')) {
        fullUrl = 'https:' + url;
      } else if (url.startsWith('/')) {
        var baseParsed = parseUrl(base);
        fullUrl = baseParsed.protocol + '//' + baseParsed.host + url;
      } else {
        var baseParsed = parseUrl(base);
        var basePath = baseParsed.pathname.replace(/\/[^\/]*$/, '');
        fullUrl = baseParsed.protocol + '//' + baseParsed.host + basePath + '/' + url;
      }
    }
    
    var parsed = parseUrl(fullUrl);
    this.protocol = parsed.protocol;
    this.hostname = parsed.hostname;
    this.port = parsed.port;
    this.pathname = parsed.pathname;
    this.search = parsed.search;
    this.hash = parsed.hash;
    this.host = parsed.host;
    this.origin = parsed.origin;
    this.href = fullUrl;
    this.username = '';
    this.password = '';
  };

  globalThis.URL.prototype.toString = function() {
    return this.href;
  };

  // 强制覆盖 Headers
  globalThis.Headers = function(init) {
    this._headers = {};
    if (init && typeof init === 'object') {
      Object.keys(init).forEach(function(key) {
        this._headers[key.toLowerCase()] = init[key];
      }.bind(this));
    }
  };

  globalThis.Headers.prototype.append = function(name, value) {
    this._headers[name.toLowerCase()] = value;
  };

  globalThis.Headers.prototype.delete = function(name) {
    delete this._headers[name.toLowerCase()];
  };

  globalThis.Headers.prototype.get = function(name) {
    return this._headers[name.toLowerCase()] || null;
  };

  globalThis.Headers.prototype.has = function(name) {
    return name.toLowerCase() in this._headers;
  };

  globalThis.Headers.prototype.set = function(name, value) {
    this._headers[name.toLowerCase()] = value;
  };

  globalThis.Headers.prototype.forEach = function(callback) {
    var _this = this;
    Object.keys(this._headers).forEach(function(key) {
      callback(_this._headers[key], key, _this);
    });
  };

  // 强制覆盖 Request
  globalThis.Request = function(input, init) {
    this.url = typeof input === 'string' ? input : (input ? input.url : '');
    this.method = (init && init.method) || 'GET';
    this.headers = new globalThis.Headers(init && init.headers);
  };

  // 强制覆盖 Response
  globalThis.Response = function(body, init) {
    this._body = body;
    this.status = (init && init.status) || 200;
    this.statusText = (init && init.statusText) || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new globalThis.Headers(init && init.headers);
  };

  globalThis.Response.prototype.json = function() {
    var _body = this._body;
    return Promise.resolve(typeof _body === 'string' ? JSON.parse(_body) : _body);
  };

  globalThis.Response.prototype.text = function() {
    return Promise.resolve(String(this._body || ''));
  };
})();
