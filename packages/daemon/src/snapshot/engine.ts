/**
 * SnapshotEngine
 *
 * Generates accessibility tree snapshots from the device.
 * This is the fallback when bridge is not available.
 */

import type {
  AccessibilityNode,
  EnhancedSnapshot,
  RefMap,
  RefEntry,
  Viewport,
  AccessibilityRole,
} from '@agent-expo/protocol';
import type { DeviceManager } from '../simulator/manager.js';

interface SnapshotOptions {
  interactive?: boolean;
  compact?: boolean;
  maxDepth?: number;
}

export class SnapshotEngine {
  private refCounter: number = 0;

  /**
   * Capture snapshot from device using native accessibility tools
   */
  async captureFromDevice(
    deviceManager: DeviceManager,
    options: SnapshotOptions = {}
  ): Promise<EnhancedSnapshot> {
    const platform = deviceManager.getActivePlatform();

    if (!platform) {
      throw new Error('No active device');
    }

    // Get the raw accessibility data
    let tree: AccessibilityNode;

    if (platform === 'android') {
      tree = await this.captureAndroidTree(deviceManager);
    } else {
      tree = await this.captureIOSTree(deviceManager);
    }

    // Generate refs and format
    this.refCounter = 0;
    const refs: RefMap = {};
    const formattedTree = this.formatTree(tree, refs, options, 0);

    return {
      tree: formattedTree,
      refs,
      viewport: { width: 390, height: 844 }, // Default, should get from device
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Capture accessibility tree from Android using uiautomator
   */
  private async captureAndroidTree(deviceManager: DeviceManager): Promise<AccessibilityNode> {
    // This would call deviceManager's Android manager to dump UI hierarchy
    // For now, return a placeholder
    // In real implementation:
    // const xml = await androidManager.dumpUIHierarchy();
    // return this.parseAndroidXML(xml);

    return this.createPlaceholderTree();
  }

  /**
   * Capture accessibility tree from iOS
   */
  private async captureIOSTree(deviceManager: DeviceManager): Promise<AccessibilityNode> {
    // This would use idb or accessibility inspector to get the tree
    // For now, return a placeholder

    return this.createPlaceholderTree();
  }

  /**
   * Create a placeholder tree for development
   */
  private createPlaceholderTree(): AccessibilityNode {
    return {
      ref: '',
      role: 'none',
      label: 'App Root',
      bounds: { x: 0, y: 0, width: 390, height: 844 },
      children: [],
    };
  }

  /**
   * Parse Android UI Automator XML into AccessibilityNode tree
   */
  parseAndroidXML(xml: string): AccessibilityNode {
    // Parse XML and convert to AccessibilityNode format
    // This is a simplified implementation

    const parseNode = (element: any): AccessibilityNode => {
      const bounds = this.parseAndroidBounds(element.getAttribute?.('bounds') || '');

      return {
        ref: '',
        role: this.mapAndroidClass(element.getAttribute?.('class') || ''),
        label: element.getAttribute?.('content-desc') || element.getAttribute?.('text') || undefined,
        testID: element.getAttribute?.('resource-id') || undefined,
        state: {
          disabled: element.getAttribute?.('enabled') === 'false',
          checked: element.getAttribute?.('checked') === 'true',
          selected: element.getAttribute?.('selected') === 'true',
        },
        bounds,
        children: [],
      };
    };

    // For now, return placeholder
    return this.createPlaceholderTree();
  }

  /**
   * Parse Android bounds string "[x1,y1][x2,y2]"
   */
  private parseAndroidBounds(boundsStr: string): { x: number; y: number; width: number; height: number } {
    const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (match) {
      const x1 = parseInt(match[1], 10);
      const y1 = parseInt(match[2], 10);
      const x2 = parseInt(match[3], 10);
      const y2 = parseInt(match[4], 10);
      return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    }
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  /**
   * Map Android class name to role
   */
  private mapAndroidClass(className: string): AccessibilityRole | string {
    const classMap: Record<string, AccessibilityRole> = {
      'android.widget.Button': 'button',
      'android.widget.TextView': 'text',
      'android.widget.EditText': 'textbox',
      'android.widget.ImageView': 'image',
      'android.widget.ImageButton': 'button',
      'android.widget.CheckBox': 'checkbox',
      'android.widget.RadioButton': 'radio',
      'android.widget.Switch': 'switch',
      'android.widget.ProgressBar': 'progressbar',
      'android.widget.ScrollView': 'scrollview',
      'android.widget.ListView': 'list',
      'android.widget.RecyclerView': 'list',
      'android.view.ViewGroup': 'none',
    };

    // Get the simple class name
    const simpleName = className.split('.').pop() || className;

    return classMap[className] || classMap[`android.widget.${simpleName}`] || 'none';
  }

  /**
   * Format the tree into a text representation
   */
  private formatTree(
    node: AccessibilityNode,
    refs: RefMap,
    options: SnapshotOptions,
    depth: number
  ): string {
    if (options.maxDepth !== undefined && depth > options.maxDepth) {
      return '';
    }

    // Skip non-interactive elements if interactive only
    if (options.interactive && !this.isInteractive(node)) {
      // But still process children
      return node.children
        .map((child) => this.formatTree(child, refs, options, depth))
        .filter(Boolean)
        .join('\n');
    }

    // Assign ref
    const ref = `@e${++this.refCounter}`;
    node.ref = ref;

    // Add to ref map
    refs[ref] = {
      role: node.role,
      label: node.label,
      hint: node.hint,
      testID: node.testID,
      placeholder: node.placeholder,
      bounds: node.bounds,
      state: node.state,
      value: node.value,
    };

    // Build the line
    const indent = '  '.repeat(depth);
    let line = `${indent}- ${node.role}`;

    if (node.label) {
      line += ` "${node.label}"`;
    }

    if (node.placeholder) {
      line += ` placeholder="${node.placeholder}"`;
    }

    if (node.state?.disabled) {
      line += ' disabled';
    }

    if (node.state?.checked) {
      line += ' checked';
    }

    if (node.state?.selected) {
      line += ' selected';
    }

    line += ` [ref=${ref}]`;

    if (node.testID && !options.compact) {
      line += ` [testID=${node.testID}]`;
    }

    // Process children
    const childrenLines = node.children
      .map((child) => this.formatTree(child, refs, options, depth + 1))
      .filter(Boolean);

    if (childrenLines.length > 0) {
      return line + '\n' + childrenLines.join('\n');
    }

    return line;
  }

  /**
   * Check if a node is interactive
   */
  private isInteractive(node: AccessibilityNode): boolean {
    const interactiveRoles: string[] = [
      'button',
      'link',
      'textbox',
      'checkbox',
      'radio',
      'switch',
      'combobox',
      'menuitem',
      'tab',
      'slider',
      'adjustable',
    ];

    return interactiveRoles.includes(node.role);
  }
}
