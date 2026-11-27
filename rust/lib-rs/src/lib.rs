//! JS bindings for `src/lib/`: generated from the signatures in `port.rs` by rust-anything.
//! Regenerate with `rust-anything refresh` after changing them.

use wasm_bindgen::prelude::*;

pub mod js;
pub mod port;
pub mod wire;

#[allow(unused_imports)]
use serde_json::Value;
pub mod utf16;

/// `resolveBallistics`.
fn resolve_ballistics_inner(input: String) -> Result<String, String> {
    let input = crate::js::from_json(&input)?;
    let out = port::resolve_ballistics(input)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "resolveBallistics")]
pub fn resolve_ballistics(input: String) -> Result<String, JsError> {
    resolve_ballistics_inner(input).map_err(|e| JsError::new(&e))
}

/// `logBandEdges`.
fn log_band_edges_inner(count: f64, min_hz: f64, max_hz: f64) -> Result<String, String> {
    let out = port::log_band_edges(count, min_hz, max_hz)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "logBandEdges")]
pub fn log_band_edges(count: f64, min_hz: f64, max_hz: f64) -> Result<String, JsError> {
    log_band_edges_inner(count, min_hz, max_hz).map_err(|e| JsError::new(&e))
}

/// `bandsFromSpectrum`.
fn bands_from_spectrum_inner(
    spectrum_db: String,
    sample_rate: f64,
    edges: String,
    out: String,
    arg4: String,
) -> Result<String, String> {
    let spectrum_db = crate::js::from_json(&spectrum_db)?;
    let edges = crate::js::from_json(&edges)?;
    let out = crate::js::from_json(&out)?;
    let arg4 = crate::js::from_json(&arg4)?;
    let out = port::bands_from_spectrum(spectrum_db, sample_rate, edges, out, arg4)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "bandsFromSpectrum")]
pub fn bands_from_spectrum(
    spectrum_db: String,
    sample_rate: f64,
    edges: String,
    out: String,
    arg4: String,
) -> Result<String, JsError> {
    bands_from_spectrum_inner(spectrum_db, sample_rate, edges, out, arg4)
        .map_err(|e| JsError::new(&e))
}

/// `resampleLevels`.
fn resample_levels_inner(
    source: String,
    start: f64,
    length: f64,
    out: String,
) -> Result<String, String> {
    let source = crate::js::from_json(&source)?;
    let out = crate::js::from_json(&out)?;
    let out = port::resample_levels(source, start, length, out)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "resampleLevels")]
pub fn resample_levels(
    source: String,
    start: f64,
    length: f64,
    out: String,
) -> Result<String, JsError> {
    resample_levels_inner(source, start, length, out).map_err(|e| JsError::new(&e))
}

/// `clamp`.
fn clamp_inner(value: f64, min: f64, max: f64) -> Result<f64, String> {
    let out = port::clamp(value, min, max)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "clamp")]
pub fn clamp(value: f64, min: f64, max: f64) -> Result<f64, JsError> {
    clamp_inner(value, min, max).map_err(|e| JsError::new(&e))
}

/// `dbToGain`.
fn db_to_gain_inner(db: f64) -> Result<f64, String> {
    let out = port::db_to_gain(db)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "dbToGain")]
pub fn db_to_gain(db: f64) -> Result<f64, JsError> {
    db_to_gain_inner(db).map_err(|e| JsError::new(&e))
}

/// `gainToDb`.
fn gain_to_db_inner(gain: f64) -> Result<f64, String> {
    let out = port::gain_to_db(gain)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "gainToDb")]
pub fn gain_to_db(gain: f64) -> Result<f64, JsError> {
    gain_to_db_inner(gain).map_err(|e| JsError::new(&e))
}

/// `dbToLevel`.
fn db_to_level_inner(db: f64, min_db: Option<f64>, max_db: Option<f64>) -> Result<f64, String> {
    let out = port::db_to_level(db, min_db, max_db)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "dbToLevel")]
pub fn db_to_level(db: f64, min_db: Option<f64>, max_db: Option<f64>) -> Result<f64, JsError> {
    db_to_level_inner(db, min_db, max_db).map_err(|e| JsError::new(&e))
}

/// `levelToDb`.
fn level_to_db_inner(level: f64, min_db: Option<f64>, max_db: Option<f64>) -> Result<f64, String> {
    let out = port::level_to_db(level, min_db, max_db)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "levelToDb")]
pub fn level_to_db(level: f64, min_db: Option<f64>, max_db: Option<f64>) -> Result<f64, JsError> {
    level_to_db_inner(level, min_db, max_db).map_err(|e| JsError::new(&e))
}

/// `clampDb`.
fn clamp_db_inner(db: f64, min_db: f64, max_db: f64, options: String) -> Result<f64, String> {
    let options = crate::js::from_json(&options)?;
    let out = port::clamp_db(db, min_db, max_db, options)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "clampDb")]
pub fn clamp_db(db: f64, min_db: f64, max_db: f64, options: String) -> Result<f64, JsError> {
    clamp_db_inner(db, min_db, max_db, options).map_err(|e| JsError::new(&e))
}

/// `formatDb`.
fn format_db_inner(db: f64, options: String) -> Result<String, String> {
    let options = crate::js::from_json(&options)?;
    let out = port::format_db(db, options)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "formatDb")]
pub fn format_db(db: f64, options: String) -> Result<String, JsError> {
    format_db_inner(db, options).map_err(|e| JsError::new(&e))
}

/// `peakDb`.
fn peak_db_inner(samples: String) -> Result<f64, String> {
    let samples = crate::js::from_json(&samples)?;
    let out = port::peak_db(samples)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "peakDb")]
pub fn peak_db(samples: String) -> Result<f64, JsError> {
    peak_db_inner(samples).map_err(|e| JsError::new(&e))
}

/// `rmsDb`.
fn rms_db_inner(samples: String) -> Result<f64, String> {
    let samples = crate::js::from_json(&samples)?;
    let out = port::rms_db(samples)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "rmsDb")]
pub fn rms_db(samples: String) -> Result<f64, JsError> {
    rms_db_inner(samples).map_err(|e| JsError::new(&e))
}

/// `isAudioFile`.
fn is_audio_file_inner(file: String) -> Result<String, String> {
    let file = crate::js::from_json(&file)?;
    let out = port::is_audio_file(file)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "isAudioFile")]
pub fn is_audio_file(file: String) -> Result<String, JsError> {
    is_audio_file_inner(file).map_err(|e| JsError::new(&e))
}

/// `selectionName`.
fn selection_name_inner(selection: String) -> Result<String, String> {
    let selection = crate::js::from_json(&selection)?;
    let out = port::selection_name(selection)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "selectionName")]
pub fn selection_name(selection: String) -> Result<String, JsError> {
    selection_name_inner(selection).map_err(|e| JsError::new(&e))
}

/// `selectionPath`.
fn selection_path_inner(selection: String) -> Result<String, String> {
    let selection = crate::js::from_json(&selection)?;
    let out = port::selection_path(selection)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "selectionPath")]
pub fn selection_path(selection: String) -> Result<String, JsError> {
    selection_path_inner(selection).map_err(|e| JsError::new(&e))
}

/// `pickLocalFiles`.
async fn pick_local_files_inner(
    kind: Option<String>,
    multiple: Option<bool>,
) -> Result<String, String> {
    let out = port::pick_local_files(kind, multiple).await?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "pickLocalFiles")]
pub async fn pick_local_files(
    kind: Option<String>,
    multiple: Option<bool>,
) -> Result<String, JsError> {
    pick_local_files_inner(kind, multiple)
        .await
        .map_err(|e| JsError::new(&e))
}

/// `pickLocalFolder`.
async fn pick_local_folder_inner() -> Result<String, String> {
    let out = port::pick_local_folder().await?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "pickLocalFolder")]
pub async fn pick_local_folder() -> Result<String, JsError> {
    pick_local_folder_inner()
        .await
        .map_err(|e| JsError::new(&e))
}

/// `pickImage`.
async fn pick_image_inner() -> Result<String, String> {
    let out = port::pick_image().await?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "pickImage")]
pub async fn pick_image() -> Result<String, JsError> {
    pick_image_inner().await.map_err(|e| JsError::new(&e))
}

/// `toSelections`.
fn to_selections_inner(files: String) -> Result<String, String> {
    let files = crate::js::from_json(&files)?;
    let out = port::to_selections(files)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "toSelections")]
pub fn to_selections(files: String) -> Result<String, JsError> {
    to_selections_inner(files).map_err(|e| JsError::new(&e))
}

/// `revokeSelection`.
fn revoke_selection_inner(selection: String) -> Result<String, String> {
    let selection = crate::js::from_json(&selection)?;
    let out = port::revoke_selection(selection)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "revokeSelection")]
pub fn revoke_selection(selection: String) -> Result<String, JsError> {
    revoke_selection_inner(selection).map_err(|e| JsError::new(&e))
}

/// `formatBytes`.
fn format_bytes_inner(bytes: Option<f64>) -> Result<String, String> {
    let out = port::format_bytes(bytes)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "formatBytes")]
pub fn format_bytes(bytes: Option<f64>) -> Result<String, JsError> {
    format_bytes_inner(bytes).map_err(|e| JsError::new(&e))
}

/// `createHistoryPlayback`.
fn create_history_playback_inner() -> Result<String, String> {
    let out = port::create_history_playback()?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "createHistoryPlayback")]
pub fn create_history_playback() -> Result<String, JsError> {
    create_history_playback_inner().map_err(|e| JsError::new(&e))
}

/// `appendHistory`.
fn append_history_inner(
    frame: String,
    level: f64,
    now_ms: f64,
    interval_ms: f64,
) -> Result<(), String> {
    let frame = crate::js::from_json(&frame)?;
    port::append_history(frame, level, now_ms, interval_ms)?;
    Ok(())
}

#[wasm_bindgen(js_name = "appendHistory")]
pub fn append_history(
    frame: String,
    level: f64,
    now_ms: f64,
    interval_ms: f64,
) -> Result<(), JsError> {
    append_history_inner(frame, level, now_ms, interval_ms).map_err(|e| JsError::new(&e))
}

/// `readAudioInBrowser`.
async fn read_audio_in_browser_inner(selection: String) -> Result<String, String> {
    let selection = crate::js::from_json(&selection)?;
    let out = port::read_audio_in_browser(selection).await?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "readAudioInBrowser")]
pub async fn read_audio_in_browser(selection: String) -> Result<String, JsError> {
    read_audio_in_browser_inner(selection)
        .await
        .map_err(|e| JsError::new(&e))
}

/// `writeAudioMetadataInBrowser`.
async fn write_audio_metadata_in_browser_inner(options: String) -> Result<String, String> {
    let options = crate::js::from_json(&options)?;
    let out = port::write_audio_metadata_in_browser(options).await?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "writeAudioMetadataInBrowser")]
pub async fn write_audio_metadata_in_browser(options: String) -> Result<String, JsError> {
    write_audio_metadata_in_browser_inner(options)
        .await
        .map_err(|e| JsError::new(&e))
}

/// `writeChaptersInBrowser`.
async fn write_chapters_in_browser_inner(options: String) -> Result<String, String> {
    let options = crate::js::from_json(&options)?;
    let out = port::write_chapters_in_browser(options).await?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "writeChaptersInBrowser")]
pub async fn write_chapters_in_browser(options: String) -> Result<String, JsError> {
    write_chapters_in_browser_inner(options)
        .await
        .map_err(|e| JsError::new(&e))
}

/// `createOperationId`.
fn create_operation_id_inner(prefix: Option<String>) -> Result<String, String> {
    let out = port::create_operation_id(prefix)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "createOperationId")]
pub fn create_operation_id(prefix: Option<String>) -> Result<String, JsError> {
    create_operation_id_inner(prefix).map_err(|e| JsError::new(&e))
}

/// `reportOperationProgress`.
fn report_operation_progress_inner(update: String) -> Result<String, String> {
    let update = crate::js::from_json(&update)?;
    let out = port::report_operation_progress(update)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "reportOperationProgress")]
pub fn report_operation_progress(update: String) -> Result<String, JsError> {
    report_operation_progress_inner(update).map_err(|e| JsError::new(&e))
}

/// `initSound`.
fn init_sound_inner(prefs: String) -> Result<String, String> {
    let prefs = crate::js::from_json(&prefs)?;
    let out = port::init_sound(prefs)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "initSound")]
pub fn init_sound(prefs: String) -> Result<String, JsError> {
    init_sound_inner(prefs).map_err(|e| JsError::new(&e))
}

/// `setSoundEnabled`.
fn set_sound_enabled_inner(on: bool) -> Result<String, String> {
    let out = port::set_sound_enabled(on)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "setSoundEnabled")]
pub fn set_sound_enabled(on: bool) -> Result<String, JsError> {
    set_sound_enabled_inner(on).map_err(|e| JsError::new(&e))
}

/// `setSoundVolume`.
fn set_sound_volume_inner(v: f64) -> Result<String, String> {
    let out = port::set_sound_volume(v)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "setSoundVolume")]
pub fn set_sound_volume(v: f64) -> Result<String, JsError> {
    set_sound_volume_inner(v).map_err(|e| JsError::new(&e))
}

/// `detect`.
fn detect_inner(text: String, engines: String) -> Result<String, String> {
    let engines = crate::js::from_json(&engines)?;
    let out = port::detect(text, engines)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "detect")]
pub fn detect(text: String, engines: String) -> Result<String, JsError> {
    detect_inner(text, engines).map_err(|e| JsError::new(&e))
}

/// `splitChapters`.
fn split_chapters_inner(text: String, engines: String) -> Result<String, String> {
    let engines = crate::js::from_json(&engines)?;
    let out = port::split_chapters(text, engines)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "splitChapters")]
pub fn split_chapters(text: String, engines: String) -> Result<String, JsError> {
    split_chapters_inner(text, engines).map_err(|e| JsError::new(&e))
}

/// `linearTaper`.
fn linear_taper_inner(min: f64, max: f64) -> Result<String, String> {
    let out = port::linear_taper(min, max)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "linearTaper")]
pub fn linear_taper(min: f64, max: f64) -> Result<String, JsError> {
    linear_taper_inner(min, max).map_err(|e| JsError::new(&e))
}

/// `audioTaper`.
fn audio_taper_inner(arg0: String) -> Result<String, String> {
    let arg0 = crate::js::from_json(&arg0)?;
    let out = port::audio_taper(arg0)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "audioTaper")]
pub fn audio_taper(arg0: String) -> Result<String, JsError> {
    audio_taper_inner(arg0).map_err(|e| JsError::new(&e))
}

/// `logTaper`.
fn log_taper_inner(min: f64, max: f64) -> Result<String, String> {
    let out = port::log_taper(min, max)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "logTaper")]
pub fn log_taper(min: f64, max: f64) -> Result<String, JsError> {
    log_taper_inner(min, max).map_err(|e| JsError::new(&e))
}

/// `resolveTaper`.
fn resolve_taper_inner(taper: String, min: f64, max: f64) -> Result<String, String> {
    let taper = crate::js::from_json(&taper)?;
    let out = port::resolve_taper(taper, min, max)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "resolveTaper")]
pub fn resolve_taper(taper: String, min: f64, max: f64) -> Result<String, JsError> {
    resolve_taper_inner(taper, min, max).map_err(|e| JsError::new(&e))
}

/// `formatTime`.
fn format_time_inner(seconds: f64, options: String) -> Result<String, String> {
    let options = crate::js::from_json(&options)?;
    let out = port::format_time(seconds, options)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "formatTime")]
pub fn format_time(seconds: f64, options: String) -> Result<String, JsError> {
    format_time_inner(seconds, options).map_err(|e| JsError::new(&e))
}

/// `cn`.
fn cn_inner(inputs: String) -> Result<String, String> {
    let inputs = crate::js::from_json(&inputs)?;
    let out = port::cn(inputs)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "cn")]
pub fn cn(inputs: String) -> Result<String, JsError> {
    cn_inner(inputs).map_err(|e| JsError::new(&e))
}

/// `triggerIndex`.
fn trigger_index_inner(samples: String) -> Result<f64, String> {
    let samples = crate::js::from_json(&samples)?;
    let out = port::trigger_index(samples)?;
    Ok(out)
}

#[wasm_bindgen(js_name = "triggerIndex")]
pub fn trigger_index(samples: String) -> Result<f64, JsError> {
    trigger_index_inner(samples).map_err(|e| JsError::new(&e))
}

/// `zoneForDb`.
fn zone_for_db_inner(db: f64, zones: String) -> Result<String, String> {
    let zones = crate::js::from_json(&zones)?;
    let out = port::zone_for_db(db, zones)?;
    crate::js::to_json(&out)
}

#[wasm_bindgen(js_name = "zoneForDb")]
pub fn zone_for_db(db: f64, zones: String) -> Result<String, JsError> {
    zone_for_db_inner(db, zones).map_err(|e| JsError::new(&e))
}

// ---- the binary wire ------------------------------------------------------------------------

thread_local! {
    static WIRE_IN: std::cell::RefCell<Vec<u8>> = const { std::cell::RefCell::new(Vec::new()) };
    static WIRE_OUT: std::cell::RefCell<Vec<u8>> = const { std::cell::RefCell::new(Vec::new()) };
}

/// This module's memory, where `index.cjs` reads and writes the wire buffers.
#[wasm_bindgen(js_name = "rustAnythingWireMemory")]
pub fn rust_anything_wire_memory() -> JsValue {
    wasm_bindgen::memory()
}

/// The address of an argument buffer of `len` bytes.
#[wasm_bindgen(js_name = "rustAnythingWireIn")]
pub fn rust_anything_wire_in(len: u32) -> u32 {
    WIRE_IN.with(|b| {
        let mut b = b.borrow_mut();
        b.resize(len as usize, 0);
        b.as_mut_ptr() as usize as u32
    })
}

/// The address of the last result.
#[wasm_bindgen(js_name = "rustAnythingWireOut")]
pub fn rust_anything_wire_out() -> u32 {
    WIRE_OUT.with(|b| b.borrow().as_ptr() as usize as u32)
}

/// Reads `len` argument bytes, runs `f`, and keeps its result for `rustAnythingWireOut`.
fn wire_io(
    len: u32,
    f: impl FnOnce(&mut wire::Reader, &mut wire::Writer) -> Result<(), String>,
) -> Result<u32, JsError> {
    let input = WIRE_IN.with(|b| std::mem::take(&mut *b.borrow_mut()));
    let mut w = wire::Writer::default();
    let result = f(
        &mut wire::Reader::new(&input[..(len as usize).min(input.len())]),
        &mut w,
    );
    WIRE_IN.with(|b| *b.borrow_mut() = input);
    match result {
        // A result of another shape than the TS type: JS runs the call through JSON.
        Err(e) if e.starts_with(wire::MISMATCH) => return Ok(u32::MAX),
        other => other.map_err(|e| JsError::new(&e))?,
    }
    let n = w.0.len();
    WIRE_OUT.with(|b| *b.borrow_mut() = w.0);
    Ok(u32::try_from(n).unwrap_or(u32::MAX))
}

static S_RESOLVE_BALLISTICS_OUT: wire::Schema = wire::Schema::Obj(&[
    ("attackMs", wire::Schema::Num),
    ("releaseMs", wire::Schema::Num),
    ("peakHoldMs", wire::Schema::Num),
    ("peakReleaseMs", wire::Schema::Num),
]);

/// `resolveBallistics` over the binary wire.
#[wasm_bindgen(js_name = "resolveBallisticsWire")]
pub fn resolve_ballistics_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let input: Option<serde_json::Value> = wire::read_dyn_opt(r)?;
        let out = &port::resolve_ballistics(input)?;
        wire::write_value(w, out, &S_RESOLVE_BALLISTICS_OUT)?;
        Ok(())
    })
}

static S_LOG_BAND_EDGES_OUT: wire::Schema = wire::Schema::Dyn;

/// `logBandEdges` over the binary wire.
#[wasm_bindgen(js_name = "logBandEdgesWire")]
pub fn log_band_edges_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let count: f64 = r.f64()?;
        let min_hz: f64 = r.f64()?;
        let max_hz: f64 = r.f64()?;
        let out = &port::log_band_edges(count, min_hz, max_hz)?;
        wire::write_value(w, out, &S_LOG_BAND_EDGES_OUT)?;
        Ok(())
    })
}

static S_BANDS_FROM_SPECTRUM_0: wire::Schema = wire::Schema::Dyn;
static S_BANDS_FROM_SPECTRUM_2: wire::Schema = wire::Schema::Dyn;
static S_BANDS_FROM_SPECTRUM_3: wire::Schema = wire::Schema::Dyn;
static S_BANDS_FROM_SPECTRUM_OUT: wire::Schema = wire::Schema::Dyn;

/// `bandsFromSpectrum` over the binary wire.
#[wasm_bindgen(js_name = "bandsFromSpectrumWire")]
pub fn bands_from_spectrum_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let spectrum_db: serde_json::Value = wire::read_value(r, &S_BANDS_FROM_SPECTRUM_0)?;
        let sample_rate: f64 = r.f64()?;
        let edges: serde_json::Value = wire::read_value(r, &S_BANDS_FROM_SPECTRUM_2)?;
        let out: serde_json::Value = wire::read_value(r, &S_BANDS_FROM_SPECTRUM_3)?;
        let arg4: Option<serde_json::Value> = wire::read_dyn_opt(r)?;
        let out = &port::bands_from_spectrum(spectrum_db, sample_rate, edges, out, arg4)?;
        wire::write_value(w, out, &S_BANDS_FROM_SPECTRUM_OUT)?;
        Ok(())
    })
}

static S_RESAMPLE_LEVELS_0: wire::Schema = wire::Schema::Dyn;
static S_RESAMPLE_LEVELS_3: wire::Schema = wire::Schema::Dyn;
static S_RESAMPLE_LEVELS_OUT: wire::Schema = wire::Schema::Dyn;

/// `resampleLevels` over the binary wire.
#[wasm_bindgen(js_name = "resampleLevelsWire")]
pub fn resample_levels_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let source: serde_json::Value = wire::read_value(r, &S_RESAMPLE_LEVELS_0)?;
        let start: f64 = r.f64()?;
        let length: f64 = r.f64()?;
        let out: serde_json::Value = wire::read_value(r, &S_RESAMPLE_LEVELS_3)?;
        let out = &port::resample_levels(source, start, length, out)?;
        wire::write_value(w, out, &S_RESAMPLE_LEVELS_OUT)?;
        Ok(())
    })
}

/// `clampDb` over the binary wire.
#[wasm_bindgen(js_name = "clampDbWire")]
pub fn clamp_db_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let db: f64 = r.f64()?;
        let min_db: f64 = r.f64()?;
        let max_db: f64 = r.f64()?;
        let options: Option<serde_json::Value> = wire::read_dyn_opt(r)?;
        let out = &port::clamp_db(db, min_db, max_db, options)?;
        w.f64(*out);
        Ok(())
    })
}

/// `formatDb` over the binary wire.
#[wasm_bindgen(js_name = "formatDbWire")]
pub fn format_db_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let db: f64 = r.f64()?;
        let options: Option<serde_json::Value> = wire::read_dyn_opt(r)?;
        let out = &port::format_db(db, options)?;
        w.string16(out);
        Ok(())
    })
}

static S_PEAK_DB_0: wire::Schema = wire::Schema::Dyn;

/// `peakDb` over the binary wire.
#[wasm_bindgen(js_name = "peakDbWire")]
pub fn peak_db_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let samples: serde_json::Value = wire::read_value(r, &S_PEAK_DB_0)?;
        let out = &port::peak_db(samples)?;
        w.f64(*out);
        Ok(())
    })
}

static S_RMS_DB_0: wire::Schema = wire::Schema::Dyn;

/// `rmsDb` over the binary wire.
#[wasm_bindgen(js_name = "rmsDbWire")]
pub fn rms_db_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let samples: serde_json::Value = wire::read_value(r, &S_RMS_DB_0)?;
        let out = &port::rms_db(samples)?;
        w.f64(*out);
        Ok(())
    })
}

static S_IS_AUDIO_FILE_0: wire::Schema = wire::Schema::Dyn;
static S_IS_AUDIO_FILE_OUT: wire::Schema = wire::Schema::Dyn;

/// `isAudioFile` over the binary wire.
#[wasm_bindgen(js_name = "isAudioFileWire")]
pub fn is_audio_file_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let file: serde_json::Value = wire::read_value(r, &S_IS_AUDIO_FILE_0)?;
        let out = &port::is_audio_file(file)?;
        wire::write_value(w, out, &S_IS_AUDIO_FILE_OUT)?;
        Ok(())
    })
}

static S_SELECTION_NAME_0: wire::Schema = wire::Schema::Dyn;
static S_SELECTION_NAME_OUT: wire::Schema = wire::Schema::Dyn;

/// `selectionName` over the binary wire.
#[wasm_bindgen(js_name = "selectionNameWire")]
pub fn selection_name_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let selection: serde_json::Value = wire::read_value(r, &S_SELECTION_NAME_0)?;
        let out = &port::selection_name(selection)?;
        wire::write_value(w, out, &S_SELECTION_NAME_OUT)?;
        Ok(())
    })
}

static S_SELECTION_PATH_0: wire::Schema = wire::Schema::Dyn;
static S_SELECTION_PATH_OUT: wire::Schema = wire::Schema::Dyn;

/// `selectionPath` over the binary wire.
#[wasm_bindgen(js_name = "selectionPathWire")]
pub fn selection_path_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let selection: serde_json::Value = wire::read_value(r, &S_SELECTION_PATH_0)?;
        let out = &port::selection_path(selection)?;
        wire::write_value(w, out, &S_SELECTION_PATH_OUT)?;
        Ok(())
    })
}

static S_TO_SELECTIONS_0: wire::Schema = wire::Schema::List(&wire::Schema::Dyn);
static S_TO_SELECTIONS_OUT: wire::Schema = wire::Schema::List(&wire::Schema::Obj(&[
    ("name", wire::Schema::Str16),
    ("file", wire::Schema::Dyn),
    ("path", wire::Schema::OptJs(&wire::Schema::Str16)),
    ("url", wire::Schema::OptJs(&wire::Schema::Str16)),
    ("size", wire::Schema::OptJs(&wire::Schema::Num)),
]));

/// `toSelections` over the binary wire.
#[wasm_bindgen(js_name = "toSelectionsWire")]
pub fn to_selections_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let files: Vec<serde_json::Value> =
            r.list(|r| wire::read_value(r, S_TO_SELECTIONS_0.inner()))?;
        let out = &port::to_selections(files)?;
        w.tag(1);
        w.count(out.len());
        for x0 in out.iter() {
            wire::write_value(w, x0, S_TO_SELECTIONS_OUT.inner())?;
        }
        Ok(())
    })
}

static S_REVOKE_SELECTION_0: wire::Schema = wire::Schema::Dyn;
static S_REVOKE_SELECTION_OUT: wire::Schema = wire::Schema::Dyn;

/// `revokeSelection` over the binary wire.
#[wasm_bindgen(js_name = "revokeSelectionWire")]
pub fn revoke_selection_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let selection: serde_json::Value = wire::read_value(r, &S_REVOKE_SELECTION_0)?;
        let out = &port::revoke_selection(selection)?;
        wire::write_value(w, out, &S_REVOKE_SELECTION_OUT)?;
        Ok(())
    })
}

static S_FORMAT_BYTES_OUT: wire::Schema = wire::Schema::Dyn;

/// `formatBytes` over the binary wire.
#[wasm_bindgen(js_name = "formatBytesWire")]
pub fn format_bytes_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let bytes: Option<f64> = r.opt_js(|r| r.f64())?;
        let out = &port::format_bytes(bytes)?;
        wire::write_value(w, out, &S_FORMAT_BYTES_OUT)?;
        Ok(())
    })
}

static S_CREATE_HISTORY_PLAYBACK_OUT: wire::Schema = wire::Schema::Dyn;

/// `createHistoryPlayback` over the binary wire.
#[wasm_bindgen(js_name = "createHistoryPlaybackWire")]
pub fn create_history_playback_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |_r, w| {
        let out = &port::create_history_playback()?;
        wire::write_value(w, out, &S_CREATE_HISTORY_PLAYBACK_OUT)?;
        Ok(())
    })
}

static S_APPEND_HISTORY_0: wire::Schema = wire::Schema::Dyn;

/// `appendHistory` over the binary wire.
#[wasm_bindgen(js_name = "appendHistoryWire")]
pub fn append_history_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, _w| {
        let frame: serde_json::Value = wire::read_value(r, &S_APPEND_HISTORY_0)?;
        let level: f64 = r.f64()?;
        let now_ms: f64 = r.f64()?;
        let interval_ms: f64 = r.f64()?;
        let () = port::append_history(frame, level, now_ms, interval_ms)?;
        Ok(())
    })
}

static S_CREATE_OPERATION_ID_OUT: wire::Schema = wire::Schema::Dyn;

/// `createOperationId` over the binary wire.
#[wasm_bindgen(js_name = "createOperationIdWire")]
pub fn create_operation_id_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let prefix: Option<String> = r.opt_js(|r| r.string16())?;
        let out = &port::create_operation_id(prefix)?;
        wire::write_value(w, out, &S_CREATE_OPERATION_ID_OUT)?;
        Ok(())
    })
}

static S_REPORT_OPERATION_PROGRESS_0: wire::Schema = wire::Schema::Dyn;
static S_REPORT_OPERATION_PROGRESS_OUT: wire::Schema = wire::Schema::Dyn;

/// `reportOperationProgress` over the binary wire.
#[wasm_bindgen(js_name = "reportOperationProgressWire")]
pub fn report_operation_progress_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let update: serde_json::Value = wire::read_value(r, &S_REPORT_OPERATION_PROGRESS_0)?;
        let out = &port::report_operation_progress(update)?;
        wire::write_value(w, out, &S_REPORT_OPERATION_PROGRESS_OUT)?;
        Ok(())
    })
}

static S_INIT_SOUND_OUT: wire::Schema = wire::Schema::Dyn;

/// `initSound` over the binary wire.
#[wasm_bindgen(js_name = "initSoundWire")]
pub fn init_sound_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let prefs: Option<serde_json::Value> = wire::read_dyn_opt(r)?;
        let out = &port::init_sound(prefs)?;
        wire::write_value(w, out, &S_INIT_SOUND_OUT)?;
        Ok(())
    })
}

static S_SET_SOUND_ENABLED_OUT: wire::Schema = wire::Schema::Dyn;

/// `setSoundEnabled` over the binary wire.
#[wasm_bindgen(js_name = "setSoundEnabledWire")]
pub fn set_sound_enabled_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let on: bool = r.bool()?;
        let out = &port::set_sound_enabled(on)?;
        wire::write_value(w, out, &S_SET_SOUND_ENABLED_OUT)?;
        Ok(())
    })
}

static S_SET_SOUND_VOLUME_OUT: wire::Schema = wire::Schema::Dyn;

/// `setSoundVolume` over the binary wire.
#[wasm_bindgen(js_name = "setSoundVolumeWire")]
pub fn set_sound_volume_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let v: f64 = r.f64()?;
        let out = &port::set_sound_volume(v)?;
        wire::write_value(w, out, &S_SET_SOUND_VOLUME_OUT)?;
        Ok(())
    })
}

static S_DETECT_OUT: wire::Schema = wire::Schema::List(&wire::Schema::Obj(&[
    ("line", wire::Schema::Str16),
    ("type", wire::Schema::Str16),
    ("title", wire::Schema::Str16),
    ("level", wire::Schema::Num),
]));

/// `detect` over the binary wire.
#[wasm_bindgen(js_name = "detectWire")]
pub fn detect_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let text: String = r.string16()?;
        let engines: Option<serde_json::Value> = wire::read_dyn_opt(r)?;
        let out = &port::detect(text, engines)?;
        w.tag(1);
        w.count(out.len());
        for x0 in out.iter() {
            wire::write_value(w, x0, S_DETECT_OUT.inner())?;
        }
        Ok(())
    })
}

static S_SPLIT_CHAPTERS_OUT: wire::Schema = wire::Schema::List(&wire::Schema::Obj(&[
    ("title", wire::Schema::Str16),
    ("content", wire::Schema::Str16),
]));

/// `splitChapters` over the binary wire.
#[wasm_bindgen(js_name = "splitChaptersWire")]
pub fn split_chapters_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let text: String = r.string16()?;
        let engines: Option<serde_json::Value> = wire::read_dyn_opt(r)?;
        let out = &port::split_chapters(text, engines)?;
        w.tag(1);
        w.count(out.len());
        for x0 in out.iter() {
            wire::write_value(w, x0, S_SPLIT_CHAPTERS_OUT.inner())?;
        }
        Ok(())
    })
}

static S_LINEAR_TAPER_OUT: wire::Schema = wire::Schema::Dyn;

/// `linearTaper` over the binary wire.
#[wasm_bindgen(js_name = "linearTaperWire")]
pub fn linear_taper_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let min: f64 = r.f64()?;
        let max: f64 = r.f64()?;
        let out = &port::linear_taper(min, max)?;
        wire::write_value(w, out, &S_LINEAR_TAPER_OUT)?;
        Ok(())
    })
}

static S_AUDIO_TAPER_OUT: wire::Schema = wire::Schema::Dyn;

/// `audioTaper` over the binary wire.
#[wasm_bindgen(js_name = "audioTaperWire")]
pub fn audio_taper_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let arg0: Option<serde_json::Value> = wire::read_dyn_opt(r)?;
        let out = &port::audio_taper(arg0)?;
        wire::write_value(w, out, &S_AUDIO_TAPER_OUT)?;
        Ok(())
    })
}

static S_LOG_TAPER_OUT: wire::Schema = wire::Schema::Dyn;

/// `logTaper` over the binary wire.
#[wasm_bindgen(js_name = "logTaperWire")]
pub fn log_taper_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let min: f64 = r.f64()?;
        let max: f64 = r.f64()?;
        let out = &port::log_taper(min, max)?;
        wire::write_value(w, out, &S_LOG_TAPER_OUT)?;
        Ok(())
    })
}

static S_RESOLVE_TAPER_0: wire::Schema = wire::Schema::Dyn;
static S_RESOLVE_TAPER_OUT: wire::Schema = wire::Schema::Dyn;

/// `resolveTaper` over the binary wire.
#[wasm_bindgen(js_name = "resolveTaperWire")]
pub fn resolve_taper_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let taper: serde_json::Value = wire::read_value(r, &S_RESOLVE_TAPER_0)?;
        let min: f64 = r.f64()?;
        let max: f64 = r.f64()?;
        let out = &port::resolve_taper(taper, min, max)?;
        wire::write_value(w, out, &S_RESOLVE_TAPER_OUT)?;
        Ok(())
    })
}

/// `formatTime` over the binary wire.
#[wasm_bindgen(js_name = "formatTimeWire")]
pub fn format_time_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let seconds: f64 = r.f64()?;
        let options: Option<serde_json::Value> = wire::read_dyn_opt(r)?;
        let out = &port::format_time(seconds, options)?;
        w.string16(out);
        Ok(())
    })
}

static S_TRIGGER_INDEX_0: wire::Schema = wire::Schema::Dyn;

/// `triggerIndex` over the binary wire.
#[wasm_bindgen(js_name = "triggerIndexWire")]
pub fn trigger_index_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let samples: serde_json::Value = wire::read_value(r, &S_TRIGGER_INDEX_0)?;
        let out = &port::trigger_index(samples)?;
        w.f64(*out);
        Ok(())
    })
}

static S_ZONE_FOR_DB_1: wire::Schema = wire::Schema::OptJs(&wire::Schema::List(&wire::Schema::Dyn));
static S_ZONE_FOR_DB_OUT: wire::Schema = wire::Schema::Dyn;

/// `zoneForDb` over the binary wire.
#[wasm_bindgen(js_name = "zoneForDbWire")]
pub fn zone_for_db_wire(len: u32) -> Result<u32, JsError> {
    wire_io(len, |r, w| {
        let db: f64 = r.f64()?;
        let zones: Option<Vec<serde_json::Value>> =
            r.opt_js(|r| r.list(|r| wire::read_value(r, S_ZONE_FOR_DB_1.inner().inner())))?;
        let out = &port::zone_for_db(db, zones)?;
        wire::write_value(w, out, &S_ZONE_FOR_DB_OUT)?;
        Ok(())
    })
}
