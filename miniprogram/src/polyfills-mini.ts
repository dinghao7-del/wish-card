// @ts-nocheck
/**
 * 微信小程序 Web API Polyfill
 * Supabase SDK 内部使用 Headers/URL/Response/AbortController
 * 微信小程序无这些全局对象 → 运行时崩溃
 */
var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {}));

// ===== Headers Polyfill =====
if (!g.Headers) {
  function Headers(init) {
    this._map = {};
    if (!init) return this;
    if (init instanceof Headers) {
      init.forEach(function(v, k) { this._map[k.toLowerCase()] = v; }.bind(this));
    } else if (typeof init === 'object' && !Array.isArray(init)) {
      var entries = Object.entries(init);
      for (var i = 0; i < entries.length; i++) { this._map[entries[i][0].toLowerCase()] = String(entries[i][1]); }
    } else if (Array.isArray(init)) {
      for (var j = 0; j < init.length; j++) { this._map[String(init[j][0]).toLowerCase()] = String(init[j][1]); }
    }
  }
  Headers.prototype.append = function(k, v) { var lk = k.toLowerCase(); this._map[lk] = this._map[lk] ? this._map[lk] + ',' + v : v; };
  Headers.prototype.delete = function(k) { delete this._map[k.toLowerCase()]; };
  Headers.prototype.get = function(k) { return this._map[k.toLowerCase()] || null; };
  Headers.prototype.has = function(k) { return (k.toLowerCase() in this._map); };
  Headers.prototype.set = function(k, v) { this._map[k.toLowerCase()] = v; };
  Headers.prototype.forEach = function(cb) { var m = Object.entries(this._map); for (var i = 0; i < m.length; i++) cb(m[i][1], m[i][0], this); };
  g.Headers = Headers;
}

// ===== URLSearchParams Polyfill =====
if (!g.URLSearchParams) {
  function URLSearchParams(init) {
    this._m = new (typeof Map !== 'undefined' ? Map : Object)();
    if (!init) return;
    if (init instanceof URLSearchParams || init instanceof (g.URLSearchParams || Object)) {
      // copy from another instance
      var keys = Object.keys(init._m || {});
      for (var i = 0; i < keys.length; i++) this._m[keys[i]] = init._m[keys[i]];
    } else if (typeof init === 'string') {
      var s = init.charAt(0) === '?' ? init.substring(1) : init;
      s.split('&').forEach(function(pair) {
        var eq = pair.indexOf('=');
        if (eq > 0) this._m[decodeURIComponent(pair.substring(0, eq))] = decodeURIComponent(pair.substring(eq + 1));
        else if (eq !== 0 && pair.length > 0) this._m[decodeURIComponent(pair)] = '';
      }.bind(this));
    } else if (Array.isArray(init)) {
      for (var j = 0; j < init.length; j++) this._m[String(init[j][0])] = String(init[j][1]);
    } else if (typeof init === 'object') {
      var entries = Object.entries(init);
      for (var k = 0; k < entries.length; k++) this._m[entries[k][0]] = String(entries[k][1]);
    }
  }
  URLSearchParams.prototype.append = function(n, v) { var e = this._m[n]; this._m[n] = e ? e + ',' + v : v; };
  URLSearchParams.prototype.delete = function(n) { delete this._m[n]; };
  URLSearchParams.prototype.get = function(n) { return this._m[n] || null; };
  URLSearchParams.prototype.has = function(n) { return n in this._m; };
  URLSearchParams.prototype.set = function(n, v) { this._m[n] = v; };
  URLSearchParams.prototype.toString = function() {
    var pairs = [], keys = Object.keys(this._m);
    for (var i = 0; i < keys.length; i++) pairs.push(encodeURIComponent(keys[i]) + '=' + encodeURIComponent(this._m[keys[i]]));
    return pairs.join('&');
  };
  URLSearchParams.prototype.forEach = function(cb) { var keys = Object.keys(this._m); for (var i = 0; i < keys.length; i) cb(this._m[keys[i]], keys[i++], this); };
  g.URLSearchParams = URLSearchParams;
}

// ===== URL Polyfill =====
if (!g.URL) {
  function URL(url) {
    try {
      var m = url.match(/^([^:]+):\/\/([^\/]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
      if (m) {
        this.protocol = m[1] + ':'; this.hostname = m[2]; this.origin = this.protocol + '//' + this.hostname;
        this.pathname = m[3] || '/';
        this.searchParams = new (g.URLSearchParams)(m[4] ? m[4].substring(1) : '');
        this.href = url;
        return;
      }
    } catch(e) {}
    this.href = url; this.pathname = url; this.searchParams = new (g.URLSearchParams)(''); this.origin = ''; this.protocol = 'https:'; this.hostname = '';
  }
  URL.prototype.toString = function() { return this.href || ''; };
  g.URL = URL;
}

// ===== Response Polyfill =====
if (!g.Response) {
  function Response(body, init) {
    this.body_ = body != null ? body : ''; this.status = (init && init.status) || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = (init && init.statusText) || 'OK'; this.headers = (init && init.headers) || {};
  }
  Response.prototype.json = function() { try { return JSON.parse(this.body_); } catch(e) { return null; } };
  Response.prototype.text = function() { return this.body_; };
  g.Response = Response;
}

// ===== AbortController Polyfill =====
if (!g.AbortController) {
  function AbortController() { this.aborted = false; var self = this; this.signal = {}; }
  AbortController.prototype.abort = function() { this.aborted = true; };
  g.AbortController = AbortController;
}
if (!g.Event) { function Event(type) { this.type = type; }; g.Event = Event; }

// ===== TextEncoder/Decoder =====
if (!g.TextEncoder) { g.TextEncoder = function() {}; g.TextEncoder.prototype.encode = function(str) { var b = new Uint8Array(str.length); for (var i = 0; i < str.length; i++) b[i] = str.charCodeAt(i) & 0xff; return b; }; }
if (!g.TextDecoder) { g.TextDecoder = function() {}; g.TextDecoder.prototype.decode = function(buf) { var s = ''; for (var i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]); return s; }; }

console.log('[Polyfills] All Web API polyfills injected OK');
