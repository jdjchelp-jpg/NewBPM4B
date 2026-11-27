// Loads the wasm-bindgen (nodejs target) output built by `rust-anything build`.
const native = require('./pkg/lib_rs.js')

// Structured values cross as JSON text. JSON has no `undefined`, NaN, -0, bigint, Date, Map, Set
// or bytes, and Rust strings no lone surrogates: those travel as one-key marker objects
// (`{"$undefined": true}`, `{"$num": "NaN"}`, `{"$map": [[k, v]]}`, `{"$bytes": [...]}`, ...),
// the same markers recordings use.
const replacer = function (k, v) {
  const raw = this[k]
  if (raw instanceof Date) return { $date: Number.isNaN(raw.getTime()) ? 'Invalid' : raw.toISOString() }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(raw)) return { $buffer: Array.from(raw) }
  if (raw instanceof Uint8Array) return { $bytes: Array.from(raw) }
  if (raw instanceof Map) return { $map: [...raw] }
  if (raw instanceof Set) return { $set: [...raw] }
  return v === undefined ? { $undefined: true }
    : typeof v === 'bigint' ? { $bigint: String(v) }
    : typeof v === 'number' ? (Number.isFinite(v) && !Object.is(v, -0) ? v : { $num: Object.is(v, -0) ? '-0' : String(v) })
    : typeof v === 'string' && !v.isWellFormed() ? { $utf16: Array.from({ length: v.length }, (_, i) => v.charCodeAt(i)) }
    : v
}
const encode = v => JSON.stringify(v, replacer)
const single = (v, key) => Object.keys(v).length === 1 && key in v
const revive = v => Array.isArray(v) ? v.map(revive)
  : v !== null && typeof v === 'object'
    ? (single(v, '$undefined') ? undefined
      : single(v, '$utf16') ? fromUnits(v.$utf16)
      : single(v, '$num') ? Number(v.$num)
      : single(v, '$bigint') ? BigInt(v.$bigint)
      : single(v, '$date') ? new Date(v.$date)
      : single(v, '$bytes') ? Uint8Array.from(v.$bytes)
      : single(v, '$buffer') ? Buffer.from(v.$buffer)
      : single(v, '$map') ? new Map(v.$map.map(([k, x]) => [revive(k), revive(x)]))
      : single(v, '$set') ? new Set(v.$set.map(revive))
      : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)])))
    : v
// Most results carry no marker: skip the walk unless the text has one.
const decode = text => {
  const value = JSON.parse(text)
  return text.includes('"$') ? revive(value) : value
}
const fromUnits = (units) => {
  let out = ''
  for (let i = 0; i < units.length; i += 8192)
    out += String.fromCharCode.apply(null, Array.prototype.slice.call(units, i, i + 8192))
  return out
}

module.exports = { ...native }
const specs = {
  resolveBallistics: [[1], 'json', false],
  logBandEdges: [[0, 0, 0], 'json', false],
  bandsFromSpectrum: [[1, 0, 1, 1, 1], 'json', false],
  resampleLevels: [[1, 0, 0, 1], 'json', false],
  clampDb: [[0, 0, 0, 1], 'raw', false],
  formatDb: [[0, 1], 'raw', false],
  peakDb: [[1], 'raw', false],
  rmsDb: [[1], 'raw', false],
  isAudioFile: [[1], 'json', false],
  selectionName: [[1], 'json', false],
  selectionPath: [[1], 'json', false],
  pickLocalFiles: [[0, 0], 'json', true],
  pickLocalFolder: [[], 'json', true],
  pickImage: [[], 'json', true],
  toSelections: [[1], 'json', false],
  revokeSelection: [[1], 'json', false],
  formatBytes: [[0], 'json', false],
  createHistoryPlayback: [[], 'json', false],
  appendHistory: [[1, 0, 0, 0], 'raw', false],
  readAudioInBrowser: [[1], 'json', true],
  writeAudioMetadataInBrowser: [[1], 'json', true],
  writeChaptersInBrowser: [[1], 'json', true],
  createOperationId: [[0], 'json', false],
  reportOperationProgress: [[1], 'json', false],
  initSound: [[1], 'json', false],
  setSoundEnabled: [[0], 'json', false],
  setSoundVolume: [[0], 'json', false],
  detect: [[0, 1], 'json', false],
  splitChapters: [[0, 1], 'json', false],
  linearTaper: [[0, 0], 'json', false],
  audioTaper: [[1], 'json', false],
  logTaper: [[0, 0], 'json', false],
  resolveTaper: [[1, 0, 0], 'json', false],
  formatTime: [[0, 1], 'raw', false],
  cn: [[1], 'json', false],
  triggerIndex: [[1], 'raw', false],
  zoneForDb: [[0, 1], 'json', false],
}
const classes = {

}
const convert = result => result === 'json' ? decode : result === 'units' ? fromUnits : x => x
// An omitted structured argument is `undefined`, not a missing value.
const prepare = (a, structured) => Array.from({ length: Math.max(a.length, structured.length) }, (_, i) => structured[i] ? encode(a[i]) : a[i])
// Functions: [structured arguments, result kind, async].
for (const [name, [structured, result, isAsync]] of Object.entries(specs)) {
  const call = native[name]
  const out = convert(result)
  module.exports[name] = isAsync
    ? async (...a) => out(await call(...prepare(a, structured)))
    : (...a) => out(call(...prepare(a, structured)))
}
// Classes: a JS class around the native one, converting arguments and results.
const INNER = Symbol('native')
for (const [name, [ctor, methods]] of Object.entries(classes)) {
  const Native = native[name]
  const Wrapped = { [name]: class { constructor(...a) { this[INNER] = new Native(...prepare(a, ctor)) } } }[name]
  for (const [method, [structured, result]] of Object.entries(methods)) {
    const out = convert(result)
    Wrapped.prototype[method] = function (...a) { return out(this[INNER][method](...prepare(a, structured))) }
  }
  module.exports[name] = Wrapped
}

// The binary wire (see rust-anything's `wire.rs`): arguments are written into `wIn` and copied into
// wasm memory in one step; results are read where the Rust side left them.
let wIn = new Uint8Array(1 << 16), iv = new DataView(wIn.buffer), at = 0, p = 0
const mem = native.rustAnythingWireMemory()
let wOut = new Uint8Array(mem.buffer), ov = new DataView(mem.buffer)
const regrow = () => {}
// Growing wasm memory replaces its buffer: views are made again when that happened.
const views = () => {
  if (wOut.buffer !== mem.buffer) {
    wOut = new Uint8Array(mem.buffer)
    ov = new DataView(mem.buffer)
  }
}
const wireCall = fn => {
  const ptr = native.rustAnythingWireIn(at)
  views()
  wOut.set(wIn.subarray(0, at), ptr)
  if (fn(at) === 0xFFFFFFFF) return false
  views()
  p = native.rustAnythingWireOut()
  return true
}

const need = n => {
  if (at + n <= wIn.length) return
  const grown = new Uint8Array(Math.max(wIn.length * 2, at + n))
  grown.set(wIn)
  wIn = grown
  iv = new DataView(wIn.buffer)
  regrow()
}
const wU8 = v => { need(1); iv.setUint8(at++, v) }
const wU32 = v => { need(4); iv.setUint32(at, v, true); at += 4 }
const wF64 = v => { need(8); iv.setFloat64(at, v, true); at += 8 }
const wUnits = s => {
  need(4 + 2 * s.length)
  iv.setUint32(at, s.length, true)
  at += 4
  for (let i = 0; i < s.length; i++) { iv.setUint16(at, s.charCodeAt(i), true); at += 2 }
}
const wStr = s => { wU8(4); wUnits(s) }
const wDyn = v => {
  switch (typeof v) {
    case 'undefined': wU8(0); return true
    case 'boolean': wU8(v ? 3 : 2); return true
    case 'number': wU8(4); wF64(v); return true
    case 'string': wU8(5); wUnits(v); return true
    case 'object':
      if (v === null) { wU8(1); return true }
      if (Array.isArray(v)) {
        wU8(6); wU32(v.length)
        for (let i = 0; i < v.length; i++) if (!wDyn(v[i])) return false
        return true
      }
      if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) return false
      {
        const keys = Object.keys(v)
        wU8(7); wU32(keys.length)
        for (const k of keys) { wUnits(k); if (!wDyn(v[k])) return false }
        return true
      }
  }
  return false
}
const rU8 = () => ov.getUint8(p++)
const rU32 = () => { const v = ov.getUint32(p, true); p += 4; return v }
const rF64 = () => { const v = ov.getFloat64(p, true); p += 8; return v }
// ignoreBOM: a leading U+FEFF is part of the string, not a byte-order mark.
const utf16 = new TextDecoder('utf-16le', { ignoreBOM: true })
const rUnits = (wellFormed) => {
  const n = rU32()
  let s
  if (n > 24 && wellFormed) s = utf16.decode(wOut.subarray(p, p + 2 * n))
  else {
    s = ''
    for (let i = 0; i < n; i++) s += String.fromCharCode(ov.getUint16(p + 2 * i, true))
  }
  p += 2 * n
  return s
}
// Tag 1: a string from Rust (well-formed); 4: raw code units, lone surrogates included.
const rStr = () => rUnits(rU8() === 1)
const rDyn = () => {
  switch (rU8()) {
    case 0: return undefined
    case 1: return null
    case 2: return false
    case 3: return true
    case 4: return rF64()
    case 5: return rUnits(false)
    case 6: { const n = rU32(); const a = new Array(n); for (let i = 0; i < n; i++) a[i] = rDyn(); return a }
    case 7: { const n = rU32(); const o = {}; for (let i = 0; i < n; i++) { const k = rUnits(false); o[k] = rDyn() } return o }
  }
}

// `resolveBallistics`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.resolveBallistics
const call = native.resolveBallisticsWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
{
const o0 = {}
const n0 = rU8()
for (let j0 = 0; j0 < n0; j0++) {
switch (rU8()) {
case 0: {
let v0
v0 = rF64()
o0["attackMs"] = v0
break
}
case 1: {
let v0
v0 = rF64()
o0["releaseMs"] = v0
break
}
case 2: {
let v0
v0 = rF64()
o0["peakHoldMs"] = v0
break
}
case 3: {
let v0
v0 = rF64()
o0["peakReleaseMs"] = v0
break
}
default: {
const k0 = rStr()
o0[k0] = rDyn()
}
}
}
t = o0
}
return t
}
module.exports.resolveBallistics = function resolveBallistics (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `logBandEdges`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.logBandEdges
const call = native.logBandEdgesWire
const encode = (a0, a1, a2) => {
at = 0
if (typeof a0 !== 'number') return false
wF64(a0)
if (typeof a1 !== 'number') return false
wF64(a1)
if (typeof a2 !== 'number') return false
wF64(a2)
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.logBandEdges = function logBandEdges (a0, a1, a2) {
  try {
    if (arguments.length <= 3 && encode(a0, a1, a2) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `bandsFromSpectrum`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.bandsFromSpectrum
const call = native.bandsFromSpectrumWire
const encode = (a0, a1, a2, a3, a4) => {
at = 0
if (!wDyn(a0)) return false
if (typeof a1 !== 'number') return false
wF64(a1)
if (!wDyn(a2)) return false
if (!wDyn(a3)) return false
if (!wDyn(a4)) return false
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.bandsFromSpectrum = function bandsFromSpectrum (a0, a1, a2, a3, a4) {
  try {
    if (arguments.length <= 5 && encode(a0, a1, a2, a3, a4) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `resampleLevels`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.resampleLevels
const call = native.resampleLevelsWire
const encode = (a0, a1, a2, a3) => {
at = 0
if (!wDyn(a0)) return false
if (typeof a1 !== 'number') return false
wF64(a1)
if (typeof a2 !== 'number') return false
wF64(a2)
if (!wDyn(a3)) return false
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.resampleLevels = function resampleLevels (a0, a1, a2, a3) {
  try {
    if (arguments.length <= 4 && encode(a0, a1, a2, a3) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `clampDb`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.clampDb
const call = native.clampDbWire
const encode = (a0, a1, a2, a3) => {
at = 0
if (typeof a0 !== 'number') return false
wF64(a0)
if (typeof a1 !== 'number') return false
wF64(a1)
if (typeof a2 !== 'number') return false
wF64(a2)
if (!wDyn(a3)) return false
return true
}
const decode = () => {
let t
t = rF64()
return t
}
module.exports.clampDb = function clampDb (a0, a1, a2, a3) {
  try {
    if (arguments.length <= 4 && encode(a0, a1, a2, a3) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `formatDb`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.formatDb
const call = native.formatDbWire
const encode = (a0, a1) => {
at = 0
if (typeof a0 !== 'number') return false
wF64(a0)
if (!wDyn(a1)) return false
return true
}
const decode = () => {
let t
t = rStr()
return t
}
module.exports.formatDb = function formatDb (a0, a1) {
  try {
    if (arguments.length <= 2 && encode(a0, a1) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `peakDb`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.peakDb
const call = native.peakDbWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rF64()
return t
}
module.exports.peakDb = function peakDb (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `rmsDb`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.rmsDb
const call = native.rmsDbWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rF64()
return t
}
module.exports.rmsDb = function rmsDb (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `isAudioFile`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.isAudioFile
const call = native.isAudioFileWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.isAudioFile = function isAudioFile (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `selectionName`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.selectionName
const call = native.selectionNameWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.selectionName = function selectionName (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `selectionPath`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.selectionPath
const call = native.selectionPathWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.selectionPath = function selectionPath (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `toSelections`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.toSelections
const call = native.toSelectionsWire
const encode = (a0) => {
at = 0
if (!Array.isArray(a0)) return false
wU8(1)
wU32(a0.length)
for (let i0 = 0; i0 < a0.length; i0++) {
const v0 = a0[i0]
if (!wDyn(v0)) return false
}
return true
}
const decode = () => {
let t
if (rU8() === 0) t = null
else {
const n0 = rU32()
const a0 = new Array(n0)
for (let i0 = 0; i0 < n0; i0++) {
let v0
{
const o1 = {}
const n1 = rU8()
for (let j1 = 0; j1 < n1; j1++) {
switch (rU8()) {
case 0: {
let v1
v1 = rStr()
o1["name"] = v1
break
}
case 1: {
let v1
v1 = rDyn()
o1["file"] = v1
break
}
case 2: {
let v1
{
const g2 = rU8()
if (g2 === 0) v1 = undefined
else if (g2 === 2) v1 = null
else {
v1 = rStr()
}
}
o1["path"] = v1
break
}
case 3: {
let v1
{
const g2 = rU8()
if (g2 === 0) v1 = undefined
else if (g2 === 2) v1 = null
else {
v1 = rStr()
}
}
o1["url"] = v1
break
}
case 4: {
let v1
{
const g2 = rU8()
if (g2 === 0) v1 = undefined
else if (g2 === 2) v1 = null
else {
v1 = rF64()
}
}
o1["size"] = v1
break
}
default: {
const k1 = rStr()
o1[k1] = rDyn()
}
}
}
v0 = o1
}
a0[i0] = v0
}
t = a0
}
return t
}
module.exports.toSelections = function toSelections (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `revokeSelection`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.revokeSelection
const call = native.revokeSelectionWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.revokeSelection = function revokeSelection (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `formatBytes`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.formatBytes
const call = native.formatBytesWire
const encode = (a0) => {
at = 0
if (a0 === undefined) {
wU8(0)
} else if (a0 === null) {
return false
wU8(2)
} else {
wU8(1)
if (typeof a0 !== 'number') return false
wF64(a0)
}
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.formatBytes = function formatBytes (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `createHistoryPlayback`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.createHistoryPlayback
const call = native.createHistoryPlaybackWire
const encode = () => {
at = 0
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.createHistoryPlayback = function createHistoryPlayback () {
  try {
    if (arguments.length <= 0 && encode() && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `appendHistory`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.appendHistory
const call = native.appendHistoryWire
const encode = (a0, a1, a2, a3) => {
at = 0
if (!wDyn(a0)) return false
if (typeof a1 !== 'number') return false
wF64(a1)
if (typeof a2 !== 'number') return false
wF64(a2)
if (typeof a3 !== 'number') return false
wF64(a3)
return true
}
const decode = () => {
let t
return t
}
module.exports.appendHistory = function appendHistory (a0, a1, a2, a3) {
  try {
    if (arguments.length <= 4 && encode(a0, a1, a2, a3) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `createOperationId`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.createOperationId
const call = native.createOperationIdWire
const encode = (a0) => {
at = 0
if (a0 === undefined) {
wU8(0)
} else if (a0 === null) {
return false
wU8(2)
} else {
wU8(1)
if (typeof a0 !== 'string') return false
wStr(a0)
}
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.createOperationId = function createOperationId (a0) {
  if (illFormed(a0)) throw new TypeError('argument 1 of createOperationId has a lone surrogate, which a Rust String cannot hold')
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `reportOperationProgress`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.reportOperationProgress
const call = native.reportOperationProgressWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.reportOperationProgress = function reportOperationProgress (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `initSound`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.initSound
const call = native.initSoundWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.initSound = function initSound (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `setSoundEnabled`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.setSoundEnabled
const call = native.setSoundEnabledWire
const encode = (a0) => {
at = 0
if (typeof a0 !== 'boolean') return false
wU8(a0 ? 1 : 0)
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.setSoundEnabled = function setSoundEnabled (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `setSoundVolume`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.setSoundVolume
const call = native.setSoundVolumeWire
const encode = (a0) => {
at = 0
if (typeof a0 !== 'number') return false
wF64(a0)
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.setSoundVolume = function setSoundVolume (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `detect`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.detect
const call = native.detectWire
const encode = (a0, a1) => {
at = 0
if (typeof a0 !== 'string') return false
wStr(a0)
if (!wDyn(a1)) return false
return true
}
const decode = () => {
let t
if (rU8() === 0) t = null
else {
const n0 = rU32()
const a0 = new Array(n0)
for (let i0 = 0; i0 < n0; i0++) {
let v0
{
const o1 = {}
const n1 = rU8()
for (let j1 = 0; j1 < n1; j1++) {
switch (rU8()) {
case 0: {
let v1
v1 = rStr()
o1["line"] = v1
break
}
case 1: {
let v1
v1 = rStr()
o1["type"] = v1
break
}
case 2: {
let v1
v1 = rStr()
o1["title"] = v1
break
}
case 3: {
let v1
v1 = rF64()
o1["level"] = v1
break
}
default: {
const k1 = rStr()
o1[k1] = rDyn()
}
}
}
v0 = o1
}
a0[i0] = v0
}
t = a0
}
return t
}
module.exports.detect = function detect (a0, a1) {
  if (illFormed(a0)) throw new TypeError('argument 1 of detect has a lone surrogate, which a Rust String cannot hold')
  try {
    if (arguments.length <= 2 && encode(a0, a1) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `splitChapters`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.splitChapters
const call = native.splitChaptersWire
const encode = (a0, a1) => {
at = 0
if (typeof a0 !== 'string') return false
wStr(a0)
if (!wDyn(a1)) return false
return true
}
const decode = () => {
let t
if (rU8() === 0) t = null
else {
const n0 = rU32()
const a0 = new Array(n0)
for (let i0 = 0; i0 < n0; i0++) {
let v0
{
const o1 = {}
const n1 = rU8()
for (let j1 = 0; j1 < n1; j1++) {
switch (rU8()) {
case 0: {
let v1
v1 = rStr()
o1["title"] = v1
break
}
case 1: {
let v1
v1 = rStr()
o1["content"] = v1
break
}
default: {
const k1 = rStr()
o1[k1] = rDyn()
}
}
}
v0 = o1
}
a0[i0] = v0
}
t = a0
}
return t
}
module.exports.splitChapters = function splitChapters (a0, a1) {
  if (illFormed(a0)) throw new TypeError('argument 1 of splitChapters has a lone surrogate, which a Rust String cannot hold')
  try {
    if (arguments.length <= 2 && encode(a0, a1) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `linearTaper`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.linearTaper
const call = native.linearTaperWire
const encode = (a0, a1) => {
at = 0
if (typeof a0 !== 'number') return false
wF64(a0)
if (typeof a1 !== 'number') return false
wF64(a1)
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.linearTaper = function linearTaper (a0, a1) {
  try {
    if (arguments.length <= 2 && encode(a0, a1) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `audioTaper`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.audioTaper
const call = native.audioTaperWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.audioTaper = function audioTaper (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `logTaper`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.logTaper
const call = native.logTaperWire
const encode = (a0, a1) => {
at = 0
if (typeof a0 !== 'number') return false
wF64(a0)
if (typeof a1 !== 'number') return false
wF64(a1)
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.logTaper = function logTaper (a0, a1) {
  try {
    if (arguments.length <= 2 && encode(a0, a1) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `resolveTaper`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.resolveTaper
const call = native.resolveTaperWire
const encode = (a0, a1, a2) => {
at = 0
if (!wDyn(a0)) return false
if (typeof a1 !== 'number') return false
wF64(a1)
if (typeof a2 !== 'number') return false
wF64(a2)
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.resolveTaper = function resolveTaper (a0, a1, a2) {
  try {
    if (arguments.length <= 3 && encode(a0, a1, a2) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `formatTime`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.formatTime
const call = native.formatTimeWire
const encode = (a0, a1) => {
at = 0
if (typeof a0 !== 'number') return false
wF64(a0)
if (!wDyn(a1)) return false
return true
}
const decode = () => {
let t
t = rStr()
return t
}
module.exports.formatTime = function formatTime (a0, a1) {
  try {
    if (arguments.length <= 2 && encode(a0, a1) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `triggerIndex`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.triggerIndex
const call = native.triggerIndexWire
const encode = (a0) => {
at = 0
if (!wDyn(a0)) return false
return true
}
const decode = () => {
let t
t = rF64()
return t
}
module.exports.triggerIndex = function triggerIndex (a0) {
  try {
    if (arguments.length <= 1 && encode(a0) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}

// `zoneForDb`: binary wire; the JSON version handles inputs of other shapes.
{
const json = module.exports.zoneForDb
const call = native.zoneForDbWire
const encode = (a0, a1) => {
at = 0
if (typeof a0 !== 'number') return false
wF64(a0)
if (a1 === undefined) {
wU8(0)
} else if (a1 === null) {
return false
wU8(2)
} else {
wU8(1)
if (!Array.isArray(a1)) return false
wU8(1)
wU32(a1.length)
for (let i0 = 0; i0 < a1.length; i0++) {
const v0 = a1[i0]
if (!wDyn(v0)) return false
}
}
return true
}
const decode = () => {
let t
t = rDyn()
return t
}
module.exports.zoneForDb = function zoneForDb (a0, a1) {
  try {
    if (arguments.length <= 2 && encode(a0, a1) && wireCall(call)) return decode()
    return json(...arguments)
  } catch (e) {
    throw jsError(e)
  }
}
}
const guards = {
  clamp: [false, []],
  dbToGain: [false, []],
  gainToDb: [false, []],
  dbToLevel: [false, []],
  levelToDb: [false, []],
  pickLocalFiles: [true, [0]],
  pickLocalFolder: [true, []],
  pickImage: [true, []],
  readAudioInBrowser: [true, []],
  writeAudioMetadataInBrowser: [true, []],
  writeChaptersInBrowser: [true, []],
  cn: [false, []],
}
const JS_ERRORS = /^(TypeError|RangeError|SyntaxError|ReferenceError|URIError|EvalError): ([\s\S]*)$/
const jsError = e => {
  const message = typeof e?.message === 'string' ? e.message : ''
  const typed = JS_ERRORS.exec(message)
  if (typed) return new globalThis[typed[1]](typed[2])
  if (/Expected$/.test(e?.code)) return Object.assign(new TypeError(message), { code: e.code })
  if (message.startsWith('Rust panic:')) e.code = 'RUST_PANIC'
  return e
}
const illFormed = v => typeof v === 'string' ? !v.isWellFormed() : Array.isArray(v) && v.some(illFormed)
for (const [name, [isAsync, strings]] of Object.entries(guards)) {
  const f = module.exports[name]
  if (typeof f !== 'function') continue
  const check = a => {
    for (const i of strings) {
      if (illFormed(a[i])) throw new TypeError(`argument ${i + 1} of ${name} has a lone surrogate, which a Rust String cannot hold`)
    }
  }
  module.exports[name] = isAsync
    ? { [name]: async function (...a) { check(a); try { return await f(...a) } catch (e) { throw jsError(e) } } }[name]
    : { [name]: function (...a) { check(a); try { return f(...a) } catch (e) { throw jsError(e) } } }[name]
}
