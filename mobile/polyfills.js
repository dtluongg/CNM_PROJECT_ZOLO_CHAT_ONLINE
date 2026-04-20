// DOMException is referenced by react-native-webrtc at module init time
// but doesn't exist in Hermes/JSC — must be polyfilled before any other import.
if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message = '', name = 'DOMException') {
      super(message);
      this.name = name;
    }
  };
}

// EventTarget is also sometimes missing
if (typeof global.EventTarget === 'undefined') {
  global.EventTarget = class EventTarget {
    constructor() { this._listeners = {}; }
    addEventListener(type, fn) {
      (this._listeners[type] = this._listeners[type] || []).push(fn);
    }
    removeEventListener(type, fn) {
      this._listeners[type] = (this._listeners[type] || []).filter(f => f !== fn);
    }
    dispatchEvent(event) {
      (this._listeners[event.type] || []).forEach(fn => fn(event));
    }
  };
}

// livekit-client calls MediaStreamTrack.getSettings() and expects deviceId/label
// to be strings. react-native-webrtc returns undefined for these fields, causing
// "Cannot read property 'toLowerCase' of undefined" inside livekit internals.
// This patch must run AFTER react-native-webrtc registers globals.
function patchMediaStreamTrack() {
  if (typeof MediaStreamTrack === 'undefined') return;
  const _getSettings = MediaStreamTrack.prototype.getSettings;
  MediaStreamTrack.prototype.getSettings = function () {
    const base = (typeof _getSettings === 'function')
      ? (() => { try { return _getSettings.call(this); } catch { return {}; } })()
      : {};
    return {
      ...base,
      deviceId:   base?.deviceId   || 'default',
      groupId:    base?.groupId    || '',
      label:      base?.label      || this.label || '',
      kind:       base?.kind       || this.kind || 'audio',
      width:      base?.width      || 0,
      height:     base?.height     || 0,
      frameRate:  base?.frameRate  || 0,
      facingMode: base?.facingMode || '',
    };
  };

  if (typeof MediaStreamTrack.prototype.getCapabilities !== 'function') {
    MediaStreamTrack.prototype.getCapabilities = function () {
      return { deviceId: 'default', groupId: '', kind: this.kind || 'audio', label: this.label || '' };
    };
  }
}

// livekit-client calls navigator.mediaDevices.enumerateDevices() to list mics/cams.
// react-native-webrtc may not implement this — patch to return safe empty array.
function patchEnumerateDevices() {
  if (typeof navigator === 'undefined') return;
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }
  if (typeof navigator.mediaDevices.enumerateDevices !== 'function') {
    navigator.mediaDevices.enumerateDevices = async () => [];
  }
  // Wrap existing implementation to never reject
  const _enum = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
  navigator.mediaDevices.enumerateDevices = async () => {
    try { return await _enum(); } catch { return []; }
  };
}

// Apply after a tick so react-native-webrtc has had time to register globals
setTimeout(() => {
  patchMediaStreamTrack();
  patchEnumerateDevices();
}, 0);
