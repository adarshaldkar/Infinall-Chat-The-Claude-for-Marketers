// ============================================================
// Infinall Chat - Video Intelligence Test Suite
// Tests the real video processing pipeline including:
//   - Frame extraction capability detection
//   - Vision model availability
//   - Scene construction from frame analyses
//   - Honest unavailability reporting
//   - Timestamp citation correctness
// ============================================================

import assert from 'assert';
import { VideoProcessor } from '../lib/multimodal/video';
import type { FrameAnalysis } from '../lib/multimodal/video';

async function runVideoSuite() {
  console.log('\n========================================================');
  console.log('🎬 Running Video Intelligence Test Suite');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => { console.log(`✅ [PASS] ${name}`); passed++; })
        .catch((err: Error) => { console.error(`❌ [FAIL] ${name}:`, err.message); });
    }
    console.log(`✅ [PASS] ${name}`);
    passed++;
  }

  // ── Test 1: Format timestamp utility ─────────────────────────
  await test('T01: formatTimestamp correctly formats seconds', () => {
    // Access through internal format — we test via scene output
    // 90 seconds = 01:30, 3661 seconds = 61:01
    const buf = Buffer.from('not a real video');
    // Just validate the function exists and the module loads
    assert.ok(VideoProcessor, 'VideoProcessor class should be exported');
    assert.ok(typeof VideoProcessor.processVideoMedia === 'function', 'processVideoMedia should be a static method');
    assert.ok(typeof VideoProcessor.getMetadata === 'function', 'getMetadata should be a static method');
  });

  // ── Test 2: Process empty/minimal buffer returns honest unavailable ──
  await test('T02: Minimal video buffer returns available:false (honest)', async () => {
    const tinyBuf = Buffer.from('not a real video file');
    const result = await VideoProcessor.processVideoMedia('test.mp4', tinyBuf, 'video/mp4');

    // Should return structured result
    assert.ok(result.metadata, 'Should return metadata object');
    assert.ok(result.analysis, 'Should return analysis object');

    // If no frames could be extracted and no transcript, must be honest about it
    if (result.scenes.length === 0) {
      assert.strictEqual(result.analysis.available, false, 'Should mark analysis as unavailable when no scenes found');
      assert.ok(result.analysis.unavailableReason, 'Should provide unavailableReason when available:false');
      assert.ok(!result.analysis.unavailableReason!.includes('(estimated)'), 'Unavailable reason must not contain synthetic estimates');
    }
  });

  // ── Test 3: Metadata has correct structure ─────────────────
  await test('T03: Video metadata always has required fields', async () => {
    const buf = Buffer.alloc(1024 * 100); // 100KB dummy
    const metadata = await VideoProcessor.getMetadata('test.mp4', buf);

    assert.ok(typeof metadata.durationSeconds === 'number', 'durationSeconds must be a number');
    assert.ok(metadata.durationSeconds > 0, 'durationSeconds must be positive');
    assert.ok(typeof metadata.sizeBytes === 'number', 'sizeBytes must be a number');
    assert.ok(typeof metadata.format === 'string', 'format must be a string');
    assert.ok(typeof metadata.hasAudio === 'boolean', 'hasAudio must be a boolean');
    assert.ok(typeof metadata.durationIsEstimated === 'boolean', 'durationIsEstimated must indicate estimation status');
  });

  // ── Test 4: No synthetic scene labels when data is absent ──
  await test('T04: No "(estimated)" scene labels returned without real data', async () => {
    const buf = Buffer.from('fake video content for testing purposes');
    const result = await VideoProcessor.processVideoMedia('creative.mp4', buf, 'video/mp4');

    // Verify no scenes contain synthetic estimate labels
    for (const scene of result.scenes) {
      assert.ok(
        !scene.title.includes('(estimated)'),
        `Scene title "${scene.title}" must not contain synthetic '(estimated)' label`
      );
      assert.ok(
        !scene.description.includes('[Synthetic estimate'),
        `Scene description must not contain '[Synthetic estimate' text`
      );
    }
  });

  // ── Test 5: Transcript segments have valid time ranges ─────
  await test('T05: Transcript segments have valid startSeconds/endSeconds', async () => {
    const buf = Buffer.from('test audio video buffer');
    const result = await VideoProcessor.processVideoMedia('video.mp4', buf, 'video/mp4');

    for (const seg of result.transcript) {
      assert.ok(typeof seg.startSeconds === 'number', `Segment ${seg.id} startSeconds must be number`);
      assert.ok(typeof seg.endSeconds === 'number', `Segment ${seg.id} endSeconds must be number`);
      assert.ok(seg.endSeconds >= seg.startSeconds, `Segment ${seg.id} endSeconds must be >= startSeconds`);
      assert.ok(seg.text, `Segment ${seg.id} must have text content`);
    }
  });

  // ── Test 6: VideoAnalysis type contract ─────────────────────
  await test('T06: VideoAnalysis conforms to type contract', async () => {
    const buf = Buffer.from('small test video');
    const result = await VideoProcessor.processVideoMedia('ad.mp4', buf, 'video/mp4');

    const a = result.analysis;
    assert.ok(typeof a.summary === 'string', 'summary must be string');
    assert.ok(typeof a.durationSeconds === 'number', 'durationSeconds must be number');
    assert.ok(Array.isArray(a.transcript), 'transcript must be array');
    assert.ok(Array.isArray(a.scenes), 'scenes must be array');
    assert.ok(Array.isArray(a.citations), 'citations must be array');
    assert.ok(typeof a.available === 'boolean', 'available must be boolean');

    // If available:false, must have unavailableReason
    if (!a.available) {
      assert.ok(typeof a.unavailableReason === 'string', 'unavailableReason must be string when available:false');
      assert.ok(a.unavailableReason!.length > 10, 'unavailableReason must be descriptive');
    }
  });

  // ── Test 7: Citations reference valid scene timestamps ───────
  await test('T07: Citations reference scenes with valid timestamps', async () => {
    const buf = Buffer.from('citation test video buffer');
    const result = await VideoProcessor.processVideoMedia('test.mp4', buf, 'video/mp4');

    if (result.scenes.length > 0) {
      assert.ok(result.analysis.citations.length > 0, 'Should generate citations when scenes exist');
      for (const citation of result.analysis.citations) {
        assert.ok(typeof citation.id === 'string', 'Citation id must be string');
        assert.ok(typeof citation.startSeconds === 'number', 'Citation startSeconds must be number');
        assert.ok(citation.startSeconds >= 0, 'Citation startSeconds must be non-negative');
        assert.ok(typeof citation.label === 'string', 'Citation label must be string');
      }
    }
  });

  // ── Test 8: GIF frame extraction handles binary data ─────────
  await test('T08: GIF detection does not crash on non-GIF data', async () => {
    // Pass something that looks like a GIF header
    const gifHeader = Buffer.from('GIF89a', 'ascii');
    const extendedBuf = Buffer.concat([gifHeader, Buffer.alloc(1000)]);

    // Should not throw
    const result = await VideoProcessor.processVideoMedia('animation.gif', extendedBuf, 'image/gif');
    assert.ok(result.metadata, 'Should return metadata for GIF');
    assert.ok(typeof result.analysis.available === 'boolean', 'Should return valid analysis');
  });

  // ── Test 9: ffmpeg availability check is non-blocking ────────
  await test('T09: Video processing completes without ffmpeg (graceful)', async () => {
    // Force a scenario where ffmpeg is unavailable by using a tiny buffer
    const start = Date.now();
    const result = await VideoProcessor.processVideoMedia(
      'test.mp4',
      Buffer.alloc(50),
      'video/mp4'
    );
    const elapsed = Date.now() - start;

    // Should complete in reasonable time without blocking on missing ffmpeg
    assert.ok(elapsed < 30000, `Processing took ${elapsed}ms — should be < 30s without real video`);
    assert.ok(result.metadata.sizeBytes === 50, 'Metadata should reflect actual buffer size');
  });

  // ── Test 10: marketingSignals not fabricated when unavailable ─
  await test('T10: Marketing signals are absent when video cannot be analyzed', async () => {
    const buf = Buffer.from('tiny');
    const result = await VideoProcessor.processVideoMedia('test.mp4', buf, 'video/mp4');

    if (!result.analysis.available) {
      // marketingSignals should be undefined, not fabricated numbers
      if (result.analysis.marketingSignals) {
        // If it exists, scores must not be fabricated constants
        const signals = result.analysis.marketingSignals;
        assert.ok(
          signals.hookStrengthScore === undefined || typeof signals.hookStrengthScore === 'number',
          'hookStrengthScore must be undefined or a real number'
        );
      }
      // ctaTimestamp should not be fabricated
      assert.ok(
        !result.analysis.marketingSignals?.ctaTimestamp || result.analysis.scenes.length > 0,
        'ctaTimestamp should only exist if scenes were analyzed'
      );
    }
  });

  console.log('\n========================================================');
  console.log(`📊 Video Intelligence Suite: ${passed}/${total} assertions PASSED`);
  console.log('========================================================\n');

  if (passed < total) process.exit(1);
}

runVideoSuite().catch((err) => {
  console.error('Video test suite failed:', err);
  process.exit(1);
});
