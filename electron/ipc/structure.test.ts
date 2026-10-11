import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detect } from './detect.ts';

describe('structure engine', () => {
  it('detects chapters + ignores disabled days engine', () => {
    const text = 'Chapter 1\nDay 1\nChapter 2\nDay 2';
    assert.deepEqual(detect(text).map((d) => d.type), ['chapters', 'days', 'chapters', 'days']);
    assert.deepEqual(detect(text, { days: false }).map((d) => d.line), ['Chapter 1', 'Chapter 2']);
  });
  it('tolerates Epsoide typo + markdown headings', () => {
    assert.equal(detect('Epsoide 1\n# Chapter 1\n**Episode 1**').length, 3);
  });
});

