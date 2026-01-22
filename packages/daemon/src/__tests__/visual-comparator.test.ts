import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';

// Mock pixelmatch since it's an ESM module that Jest can't handle
jest.mock('pixelmatch', () => ({
  __esModule: true,
  default: jest.fn((img1, img2, output, width, height, _options) => {
    // Simple mock: count pixels that differ
    let diffCount = 0;
    for (let i = 0; i < img1.length; i += 4) {
      const r1 = img1[i];
      const g1 = img1[i + 1];
      const b1 = img1[i + 2];
      const r2 = img2[i];
      const g2 = img2[i + 1];
      const b2 = img2[i + 2];

      if (r1 !== r2 || g1 !== g2 || b1 !== b2) {
        diffCount++;
        // If output buffer exists, mark as diff (red pixel)
        if (output) {
          output[i] = 255;
          output[i + 1] = 0;
          output[i + 2] = 0;
          output[i + 3] = 255;
        }
      } else if (output) {
        output[i] = 0;
        output[i + 1] = 0;
        output[i + 2] = 0;
        output[i + 3] = 255;
      }
    }
    return diffCount;
  }),
}));

import { VisualComparator } from '../visual/comparator';

describe('VisualComparator', () => {
  const testDir = path.join(__dirname, 'test-baselines');
  let comparator: VisualComparator;

  /**
   * Create a solid color test image
   */
  function createTestImage(
    width: number,
    height: number,
    color: [number, number, number, number]
  ): Buffer {
    const png = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        png.data[idx] = color[0]; // R
        png.data[idx + 1] = color[1]; // G
        png.data[idx + 2] = color[2]; // B
        png.data[idx + 3] = color[3]; // A
      }
    }
    return PNG.sync.write(png);
  }

  beforeAll(() => {
    // Create test baselines directory
    fs.mkdirSync(testDir, { recursive: true });
    comparator = new VisualComparator(testDir);
  });

  afterAll(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('saveBaseline', () => {
    it('should save baseline image', async () => {
      const image = createTestImage(100, 100, [255, 0, 0, 255]); // Red
      const savedPath = await comparator.saveBaseline('test-red', image);

      expect(fs.existsSync(savedPath)).toBe(true);
      expect(comparator.hasBaseline('test-red')).toBe(true);
    });

    it('should overwrite existing baseline', async () => {
      const image1 = createTestImage(100, 100, [255, 0, 0, 255]);
      const image2 = createTestImage(100, 100, [0, 255, 0, 255]);

      await comparator.saveBaseline('overwrite-test', image1);
      await comparator.saveBaseline('overwrite-test', image2);

      const loaded = comparator.loadBaseline('overwrite-test');
      expect(loaded).not.toBeNull();

      // The saved image should be the green one
      const png = PNG.sync.read(loaded!);
      expect(png.data[0]).toBe(0); // R
      expect(png.data[1]).toBe(255); // G
    });
  });

  describe('hasBaseline', () => {
    it('should return true for existing baseline', async () => {
      const image = createTestImage(50, 50, [0, 0, 255, 255]);
      await comparator.saveBaseline('exists-test', image);

      expect(comparator.hasBaseline('exists-test')).toBe(true);
    });

    it('should return false for non-existent baseline', () => {
      expect(comparator.hasBaseline('does-not-exist')).toBe(false);
    });
  });

  describe('loadBaseline', () => {
    it('should load existing baseline', async () => {
      const image = createTestImage(50, 50, [128, 128, 128, 255]);
      await comparator.saveBaseline('load-test', image);

      const loaded = comparator.loadBaseline('load-test');
      expect(loaded).not.toBeNull();
      expect(loaded!.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent baseline', () => {
      const loaded = comparator.loadBaseline('non-existent');
      expect(loaded).toBeNull();
    });
  });

  describe('compare', () => {
    it('should return 100% match for identical images', async () => {
      const image = createTestImage(100, 100, [0, 255, 0, 255]); // Green
      await comparator.saveBaseline('identical', image);

      const result = await comparator.compare('identical', image);

      expect(result.matched).toBe(true);
      expect(result.matchPercentage).toBe(100);
      expect(result.diffPixels).toBe(0);
      expect(result.totalPixels).toBe(10000);
    });

    it('should detect differences between images', async () => {
      const baseline = createTestImage(100, 100, [255, 0, 0, 255]); // Red
      const current = createTestImage(100, 100, [0, 0, 255, 255]); // Blue

      await comparator.saveBaseline('different', baseline);
      const result = await comparator.compare('different', current);

      expect(result.matched).toBe(false);
      expect(result.diffPixels).toBeGreaterThan(0);
    });

    it('should fail with mismatched dimensions', async () => {
      const baseline = createTestImage(100, 100, [255, 0, 0, 255]);
      const current = createTestImage(200, 200, [255, 0, 0, 255]);

      await comparator.saveBaseline('size-mismatch', baseline);
      const result = await comparator.compare('size-mismatch', current);

      expect(result.matched).toBe(false);
      expect(result.matchPercentage).toBe(0);
    });

    it('should respect threshold option', async () => {
      const image = createTestImage(100, 100, [255, 0, 0, 255]);
      await comparator.saveBaseline('threshold-test', image);

      // Lower threshold should pass for identical image
      const result90 = await comparator.compare('threshold-test', image, { threshold: 90 });
      expect(result90.matched).toBe(true);

      // 100% threshold should also pass for identical image
      const result100 = await comparator.compare('threshold-test', image, { threshold: 100 });
      expect(result100.matched).toBe(true);
    });

    it('should throw error for non-existent baseline', async () => {
      const image = createTestImage(100, 100, [0, 0, 0, 255]);

      await expect(comparator.compare('non-existent-baseline', image)).rejects.toThrow(
        'Baseline "non-existent-baseline" not found'
      );
    });

    it('should generate diff image when requested', async () => {
      const baseline = createTestImage(100, 100, [255, 0, 0, 255]);
      const current = createTestImage(100, 100, [0, 255, 0, 255]);

      await comparator.saveBaseline('diff-gen-test', baseline);
      const result = await comparator.compare('diff-gen-test', current, { generateDiff: true });

      expect(result.diffPath).toBeDefined();
      expect(fs.existsSync(result.diffPath!)).toBe(true);

      // Clean up diff file
      fs.unlinkSync(result.diffPath!);
    });
  });

  describe('generateDiff', () => {
    it('should generate diff image between baseline and current', async () => {
      const baseline = createTestImage(100, 100, [255, 0, 0, 255]);
      const current = createTestImage(100, 100, [0, 255, 0, 255]);

      await comparator.saveBaseline('gen-diff', baseline);
      const diffPath = await comparator.generateDiff('gen-diff', current);

      expect(fs.existsSync(diffPath)).toBe(true);

      // Clean up
      fs.unlinkSync(diffPath);
    });

    it('should handle dimension mismatch with side-by-side comparison', async () => {
      const baseline = createTestImage(100, 100, [255, 0, 0, 255]);
      const current = createTestImage(150, 150, [0, 255, 0, 255]);

      await comparator.saveBaseline('dim-diff', baseline);
      const diffPath = await comparator.generateDiff('dim-diff', current);

      expect(fs.existsSync(diffPath)).toBe(true);

      // Verify composite is wider than both images
      const composite = PNG.sync.read(fs.readFileSync(diffPath));
      expect(composite.width).toBe(100 + 150 + 10); // baseline + current + gap

      // Clean up
      fs.unlinkSync(diffPath);
    });

    it('should throw error for non-existent baseline', async () => {
      const image = createTestImage(100, 100, [0, 0, 0, 255]);

      await expect(comparator.generateDiff('no-baseline', image)).rejects.toThrow(
        'Baseline "no-baseline" not found'
      );
    });
  });

  describe('listBaselines', () => {
    it('should list all saved baselines', async () => {
      const image = createTestImage(10, 10, [0, 0, 0, 255]);
      await comparator.saveBaseline('list-test-1', image);
      await comparator.saveBaseline('list-test-2', image);

      const baselines = comparator.listBaselines();

      expect(baselines).toContain('list-test-1');
      expect(baselines).toContain('list-test-2');
    });

    it('should not include diff images in listing', async () => {
      const baseline = createTestImage(10, 10, [255, 0, 0, 255]);
      const current = createTestImage(10, 10, [0, 255, 0, 255]);

      const uniqueName = `with-diff-${Date.now()}`;
      await comparator.saveBaseline(uniqueName, baseline);
      const diffPath = await comparator.generateDiff(uniqueName, current);

      const baselines = comparator.listBaselines();
      expect(baselines).toContain(uniqueName);
      expect(baselines).not.toContain(`${uniqueName}-diff`);

      // Clean up
      fs.unlinkSync(diffPath);
      comparator.deleteBaseline(uniqueName);
    });
  });

  describe('deleteBaseline', () => {
    it('should delete existing baseline', async () => {
      const image = createTestImage(10, 10, [0, 0, 0, 255]);
      await comparator.saveBaseline('delete-test', image);

      expect(comparator.hasBaseline('delete-test')).toBe(true);

      const deleted = comparator.deleteBaseline('delete-test');

      expect(deleted).toBe(true);
      expect(comparator.hasBaseline('delete-test')).toBe(false);
    });

    it('should return false for non-existent baseline', () => {
      const deleted = comparator.deleteBaseline('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('updateBaseline', () => {
    it('should update existing baseline', async () => {
      const original = createTestImage(50, 50, [255, 0, 0, 255]);
      const updated = createTestImage(50, 50, [0, 0, 255, 255]);

      await comparator.saveBaseline('update-test', original);
      await comparator.updateBaseline('update-test', updated);

      const loaded = comparator.loadBaseline('update-test');
      const png = PNG.sync.read(loaded!);

      // Should be blue now
      expect(png.data[0]).toBe(0); // R
      expect(png.data[2]).toBe(255); // B
    });
  });

  describe('getBaselinePath', () => {
    it('should return correct path for baseline name', () => {
      const expectedPath = path.join(testDir, 'my-baseline.png');
      expect(comparator.getBaselinePath('my-baseline')).toBe(expectedPath);
    });
  });
});
