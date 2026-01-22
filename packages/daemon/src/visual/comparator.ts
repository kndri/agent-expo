/**
 * Visual Comparator
 *
 * Compare screenshots and generate visual diffs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface ComparisonResult {
  matched: boolean;
  matchPercentage: number;
  threshold: number;
  diffPixels: number;
  totalPixels: number;
  diffPath?: string;
}

export interface CompareOptions {
  threshold?: number; // 0-100, percentage match required (default: 95)
  generateDiff?: boolean;
  diffOutputPath?: string;
  ignoreRegions?: Array<{ x: number; y: number; width: number; height: number }>;
}

const DEFAULT_BASELINES_DIR = '.agent-expo/baselines';

export class VisualComparator {
  private baselinesDir: string;

  constructor(baselinesDir?: string) {
    this.baselinesDir = baselinesDir || path.join(process.cwd(), DEFAULT_BASELINES_DIR);
  }

  /**
   * Ensure baselines directory exists
   */
  private ensureBaselinesDir(): void {
    if (!fs.existsSync(this.baselinesDir)) {
      fs.mkdirSync(this.baselinesDir, { recursive: true });
    }
  }

  /**
   * Get baseline path for a name
   */
  getBaselinePath(name: string): string {
    return path.join(this.baselinesDir, `${name}.png`);
  }

  /**
   * Save a screenshot as baseline
   */
  async saveBaseline(name: string, imageBuffer: Buffer): Promise<string> {
    this.ensureBaselinesDir();
    const baselinePath = this.getBaselinePath(name);
    fs.writeFileSync(baselinePath, imageBuffer);
    return baselinePath;
  }

  /**
   * Check if baseline exists
   */
  hasBaseline(name: string): boolean {
    return fs.existsSync(this.getBaselinePath(name));
  }

  /**
   * Load baseline image
   */
  loadBaseline(name: string): Buffer | null {
    const baselinePath = this.getBaselinePath(name);
    if (!fs.existsSync(baselinePath)) {
      return null;
    }
    return fs.readFileSync(baselinePath);
  }

  /**
   * Compare current screenshot against baseline
   */
  async compare(
    name: string,
    currentBuffer: Buffer,
    options: CompareOptions = {}
  ): Promise<ComparisonResult> {
    const threshold = options.threshold ?? 95;
    const baselineBuffer = this.loadBaseline(name);

    if (!baselineBuffer) {
      throw new Error(`Baseline "${name}" not found. Save baseline first with: agent-expo screenshot save "${name}"`);
    }

    // Parse PNG images
    const baseline = PNG.sync.read(baselineBuffer);
    const current = PNG.sync.read(currentBuffer);

    // Check dimensions match
    if (baseline.width !== current.width || baseline.height !== current.height) {
      return {
        matched: false,
        matchPercentage: 0,
        threshold,
        diffPixels: baseline.width * baseline.height,
        totalPixels: baseline.width * baseline.height,
      };
    }

    const { width, height } = baseline;
    const totalPixels = width * height;

    // Create diff image if requested
    let diff: PNG | undefined;
    if (options.generateDiff) {
      diff = new PNG({ width, height });
    }

    // Compare pixels
    const diffPixels = pixelmatch(
      baseline.data,
      current.data,
      diff?.data,
      width,
      height,
      { threshold: 0.1 } // pixelmatch threshold for color difference
    );

    const matchPercentage = ((totalPixels - diffPixels) / totalPixels) * 100;
    const matched = matchPercentage >= threshold;

    const result: ComparisonResult = {
      matched,
      matchPercentage: Math.round(matchPercentage * 100) / 100,
      threshold,
      diffPixels,
      totalPixels,
    };

    // Save diff image if requested
    if (options.generateDiff && diff) {
      const diffPath = options.diffOutputPath || path.join(this.baselinesDir, `${name}-diff.png`);
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      result.diffPath = diffPath;
    }

    return result;
  }

  /**
   * Generate a diff image between baseline and current
   */
  async generateDiff(
    name: string,
    currentBuffer: Buffer,
    outputPath?: string
  ): Promise<string> {
    const baselineBuffer = this.loadBaseline(name);

    if (!baselineBuffer) {
      throw new Error(`Baseline "${name}" not found`);
    }

    const baseline = PNG.sync.read(baselineBuffer);
    const current = PNG.sync.read(currentBuffer);

    // Handle dimension mismatch
    const width = Math.max(baseline.width, current.width);
    const height = Math.max(baseline.height, current.height);

    // Create diff image
    const diff = new PNG({ width, height });

    // If dimensions don't match, create a side-by-side comparison
    if (baseline.width !== current.width || baseline.height !== current.height) {
      // Create composite showing both images
      const composite = new PNG({ width: baseline.width + current.width + 10, height: Math.max(baseline.height, current.height) });

      // Copy baseline to left side
      PNG.bitblt(baseline, composite, 0, 0, baseline.width, baseline.height, 0, 0);

      // Copy current to right side
      PNG.bitblt(current, composite, 0, 0, current.width, current.height, baseline.width + 10, 0);

      const diffPath = outputPath || path.join(this.baselinesDir, `${name}-diff.png`);
      fs.writeFileSync(diffPath, PNG.sync.write(composite));
      return diffPath;
    }

    // Generate pixel diff
    pixelmatch(
      baseline.data,
      current.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    );

    const diffPath = outputPath || path.join(this.baselinesDir, `${name}-diff.png`);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    return diffPath;
  }

  /**
   * List all saved baselines
   */
  listBaselines(): string[] {
    if (!fs.existsSync(this.baselinesDir)) {
      return [];
    }

    return fs.readdirSync(this.baselinesDir)
      .filter(f => f.endsWith('.png') && !f.endsWith('-diff.png'))
      .map(f => f.replace('.png', ''));
  }

  /**
   * Delete a baseline
   */
  deleteBaseline(name: string): boolean {
    const baselinePath = this.getBaselinePath(name);
    if (fs.existsSync(baselinePath)) {
      fs.unlinkSync(baselinePath);
      return true;
    }
    return false;
  }

  /**
   * Update baseline with new screenshot
   */
  async updateBaseline(name: string, imageBuffer: Buffer): Promise<string> {
    return this.saveBaseline(name, imageBuffer);
  }
}
