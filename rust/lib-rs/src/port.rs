//! The Rust port of `src/lib/`.
//!
//! Replace each `unimplemented!` with the port of the source function. Return `Err` where
//! the source throws or raises: the caller gets an error there too. After changing a
//! signature, run `rust-anything refresh` to regenerate the bindings. `rust-anything diff` checks
//! behavior against what the source recorded.

#![forbid(unsafe_code)]

/// Port of `resolveBallistics` (`src/lib/ballistics.ts:25`).
pub fn resolve_ballistics(input: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    let _ = &input;
    unimplemented!("port `resolveBallistics` from src/lib/ballistics.ts")
}

/// Port of `logBandEdges` (`src/lib/bands.ts:11`).
pub fn log_band_edges(count: f64, min_hz: f64, max_hz: f64) -> Result<serde_json::Value, String> {
    let _ = (&count, &min_hz, &max_hz);
    unimplemented!("port `logBandEdges` from src/lib/bands.ts")
}

/// Port of `bandsFromSpectrum` (`src/lib/bands.ts:33`).
pub fn bands_from_spectrum(
    spectrum_db: serde_json::Value,
    sample_rate: f64,
    edges: serde_json::Value,
    out: serde_json::Value,
    arg4: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let _ = (&spectrum_db, &sample_rate, &edges, &out, &arg4);
    unimplemented!("port `bandsFromSpectrum` from src/lib/bands.ts")
}

/// Port of `resampleLevels` (`src/lib/bands.ts:69`).
pub fn resample_levels(
    source: serde_json::Value,
    start: f64,
    length: f64,
    out: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = (&source, &start, &length, &out);
    unimplemented!("port `resampleLevels` from src/lib/bands.ts")
}

/// Port of `clamp` (`src/lib/decibels.ts:11`).
pub fn clamp(value: f64, min: f64, max: f64) -> Result<f64, String> {
    let _ = (&value, &min, &max);
    unimplemented!("port `clamp` from src/lib/decibels.ts")
}

/// Port of `dbToGain` (`src/lib/decibels.ts:15`).
pub fn db_to_gain(db: f64) -> Result<f64, String> {
    let _ = &db;
    unimplemented!("port `dbToGain` from src/lib/decibels.ts")
}

/// Port of `gainToDb` (`src/lib/decibels.ts:23`).
pub fn gain_to_db(gain: f64) -> Result<f64, String> {
    let _ = &gain;
    unimplemented!("port `gainToDb` from src/lib/decibels.ts")
}

/// Port of `dbToLevel` (`src/lib/decibels.ts:31`).
pub fn db_to_level(db: f64, min_db: Option<f64>, max_db: Option<f64>) -> Result<f64, String> {
    let _ = (&db, &min_db, &max_db);
    unimplemented!("port `dbToLevel` from src/lib/decibels.ts")
}

/// Port of `levelToDb` (`src/lib/decibels.ts:43`).
pub fn level_to_db(level: f64, min_db: Option<f64>, max_db: Option<f64>) -> Result<f64, String> {
    let _ = (&level, &min_db, &max_db);
    unimplemented!("port `levelToDb` from src/lib/decibels.ts")
}

/// Port of `clampDb` (`src/lib/decibels.ts:53`).
pub fn clamp_db(
    db: f64,
    min_db: f64,
    max_db: f64,
    options: Option<serde_json::Value>,
) -> Result<f64, String> {
    let _ = (&db, &min_db, &max_db, &options);
    unimplemented!("port `clampDb` from src/lib/decibels.ts")
}

/// Port of `formatDb` (`src/lib/decibels.ts:83`).
pub fn format_db(db: f64, options: Option<serde_json::Value>) -> Result<String, String> {
    let _ = (&db, &options);
    unimplemented!("port `formatDb` from src/lib/decibels.ts")
}

/// Port of `peakDb` (`src/lib/decibels.ts:116`).
pub fn peak_db(samples: serde_json::Value) -> Result<f64, String> {
    let _ = &samples;
    unimplemented!("port `peakDb` from src/lib/decibels.ts")
}

/// Port of `rmsDb` (`src/lib/decibels.ts:128`).
pub fn rms_db(samples: serde_json::Value) -> Result<f64, String> {
    let _ = &samples;
    unimplemented!("port `rmsDb` from src/lib/decibels.ts")
}

/// Port of `isAudioFile` (`src/lib/files.ts:7`).
pub fn is_audio_file(file: serde_json::Value) -> Result<serde_json::Value, String> {
    let _ = &file;
    unimplemented!("port `isAudioFile` from src/lib/files.ts")
}

/// Port of `selectionName` (`src/lib/files.ts:8`).
pub fn selection_name(selection: serde_json::Value) -> Result<serde_json::Value, String> {
    let _ = &selection;
    unimplemented!("port `selectionName` from src/lib/files.ts")
}

/// Port of `selectionPath` (`src/lib/files.ts:9`).
pub fn selection_path(selection: serde_json::Value) -> Result<serde_json::Value, String> {
    let _ = &selection;
    unimplemented!("port `selectionPath` from src/lib/files.ts")
}

/// Port of `pickLocalFiles` (`src/lib/files.ts:46`).
pub async fn pick_local_files(
    kind: Option<String>,
    multiple: Option<bool>,
) -> Result<Vec<serde_json::Value>, String> {
    let _ = (&kind, &multiple);
    unimplemented!("port `pickLocalFiles` from src/lib/files.ts")
}

/// Port of `pickLocalFolder` (`src/lib/files.ts:67`).
pub async fn pick_local_folder() -> Result<Vec<serde_json::Value>, String> {
    unimplemented!("port `pickLocalFolder` from src/lib/files.ts")
}

/// Port of `pickImage` (`src/lib/files.ts:88`).
pub async fn pick_image() -> Result<Option<serde_json::Value>, String> {
    unimplemented!("port `pickImage` from src/lib/files.ts")
}

/// Port of `toSelections` (`src/lib/files.ts:92`).
pub fn to_selections(files: Vec<serde_json::Value>) -> Result<Vec<serde_json::Value>, String> {
    let _ = &files;
    unimplemented!("port `toSelections` from src/lib/files.ts")
}

/// Port of `revokeSelection` (`src/lib/files.ts:99`).
pub fn revoke_selection(selection: serde_json::Value) -> Result<serde_json::Value, String> {
    let _ = &selection;
    unimplemented!("port `revokeSelection` from src/lib/files.ts")
}

/// Port of `formatBytes` (`src/lib/files.ts:103`).
pub fn format_bytes(bytes: Option<f64>) -> Result<serde_json::Value, String> {
    let _ = &bytes;
    unimplemented!("port `formatBytes` from src/lib/files.ts")
}

/// Port of `createHistoryPlayback` (`src/lib/history-playback.ts:10`).
pub fn create_history_playback() -> Result<serde_json::Value, String> {
    unimplemented!("port `createHistoryPlayback` from src/lib/history-playback.ts")
}

/// Port of `appendHistory` (`src/lib/history.ts:3`).
pub fn append_history(
    frame: serde_json::Value,
    level: f64,
    now_ms: f64,
    interval_ms: f64,
) -> Result<(), String> {
    let _ = (&frame, &level, &now_ms, &interval_ms);
    unimplemented!("port `appendHistory` from src/lib/history.ts")
}

/// Port of `readAudioInBrowser` (`src/lib/m4b-browser.ts:242`).
pub async fn read_audio_in_browser(
    selection: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = &selection;
    unimplemented!("port `readAudioInBrowser` from src/lib/m4b-browser.ts")
}

/// Port of `writeAudioMetadataInBrowser` (`src/lib/m4b-browser.ts:290`).
pub async fn write_audio_metadata_in_browser(
    options: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = &options;
    unimplemented!("port `writeAudioMetadataInBrowser` from src/lib/m4b-browser.ts")
}

/// Port of `writeChaptersInBrowser` (`src/lib/m4b-browser.ts:327`).
pub async fn write_chapters_in_browser(
    options: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let _ = &options;
    unimplemented!("port `writeChaptersInBrowser` from src/lib/m4b-browser.ts")
}

/// Port of `createOperationId` (`src/lib/progress.ts:10`).
pub fn create_operation_id(prefix: Option<String>) -> Result<serde_json::Value, String> {
    let _ = &prefix;
    unimplemented!("port `createOperationId` from src/lib/progress.ts")
}

/// Port of `reportOperationProgress` (`src/lib/progress.ts:15`).
pub fn report_operation_progress(update: serde_json::Value) -> Result<serde_json::Value, String> {
    let _ = &update;
    unimplemented!("port `reportOperationProgress` from src/lib/progress.ts")
}

/// Port of `initSound` (`src/lib/sound.ts:19`).
pub fn init_sound(prefs: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    let _ = &prefs;
    unimplemented!("port `initSound` from src/lib/sound.ts")
}

/// Port of `setSoundEnabled` (`src/lib/sound.ts:39`).
pub fn set_sound_enabled(on: bool) -> Result<serde_json::Value, String> {
    let _ = &on;
    unimplemented!("port `setSoundEnabled` from src/lib/sound.ts")
}

/// Port of `setSoundVolume` (`src/lib/sound.ts:45`).
pub fn set_sound_volume(v: f64) -> Result<serde_json::Value, String> {
    let _ = &v;
    unimplemented!("port `setSoundVolume` from src/lib/sound.ts")
}

/// Port of `detect` (`src/lib/structure.ts:24`).
pub fn detect(
    text: String,
    engines: Option<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    let _ = (&text, &engines);
    unimplemented!("port `detect` from src/lib/structure.ts")
}

/// Port of `splitChapters` (`src/lib/structure.ts:74`).
pub fn split_chapters(
    text: String,
    engines: Option<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    let _ = (&text, &engines);
    unimplemented!("port `splitChapters` from src/lib/structure.ts")
}

/// Port of `linearTaper` (`src/lib/taper.ts:9`).
pub fn linear_taper(min: f64, max: f64) -> Result<serde_json::Value, String> {
    let _ = (&min, &max);
    unimplemented!("port `linearTaper` from src/lib/taper.ts")
}

/// Port of `audioTaper` (`src/lib/taper.ts:30`).
pub fn audio_taper(arg0: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    let _ = &arg0;
    unimplemented!("port `audioTaper` from src/lib/taper.ts")
}

/// Port of `logTaper` (`src/lib/taper.ts:69`).
pub fn log_taper(min: f64, max: f64) -> Result<serde_json::Value, String> {
    let _ = (&min, &max);
    unimplemented!("port `logTaper` from src/lib/taper.ts")
}

/// Port of `resolveTaper` (`src/lib/taper.ts:85`).
pub fn resolve_taper(
    taper: serde_json::Value,
    min: f64,
    max: f64,
) -> Result<serde_json::Value, String> {
    let _ = (&taper, &min, &max);
    unimplemented!("port `resolveTaper` from src/lib/taper.ts")
}

/// Port of `formatTime` (`src/lib/time.ts:15`).
pub fn format_time(seconds: f64, options: Option<serde_json::Value>) -> Result<String, String> {
    let _ = (&seconds, &options);
    unimplemented!("port `formatTime` from src/lib/time.ts")
}

/// Port of `cn` (`src/lib/utils.ts:3`).
pub fn cn(inputs: Option<Vec<serde_json::Value>>) -> Result<serde_json::Value, String> {
    let _ = &inputs;
    unimplemented!("port `cn` from src/lib/utils.ts")
}

/// Port of `triggerIndex` (`src/lib/wave-line.ts:75`).
pub fn trigger_index(samples: serde_json::Value) -> Result<f64, String> {
    let _ = &samples;
    unimplemented!("port `triggerIndex` from src/lib/wave-line.ts")
}

/// Port of `zoneForDb` (`src/lib/zones.ts:16`).
pub fn zone_for_db(
    db: f64,
    zones: Option<Vec<serde_json::Value>>,
) -> Result<serde_json::Value, String> {
    let _ = (&db, &zones);
    unimplemented!("port `zoneForDb` from src/lib/zones.ts")
}
