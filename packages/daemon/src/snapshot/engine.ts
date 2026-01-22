/**
 * SnapshotEngine
 *
 * Generates accessibility tree snapshots from the device.
 * This is the fallback when bridge is not available.
 */

import {
  Errors,
  logger,
  type AccessibilityNode,
  type EnhancedSnapshot,
  type RefMap,
  type RefEntry,
  type Viewport,
  type AccessibilityRole,
} from '@agent-expo/protocol';
import type { DeviceManager } from '../simulator/manager.js';

const log = logger.child('snapshot');

interface SnapshotOptions {
  interactive?: boolean;
  compact?: boolean;
  maxDepth?: number;
  native?: boolean;
}

// iOS Accessibility role mapping
const IOS_ROLE_MAP: Record<string, string> = {
  AXButton: 'button',
  AXLink: 'link',
  AXImage: 'image',
  AXStaticText: 'text',
  AXTextField: 'textbox',
  AXTextArea: 'textbox',
  AXSearchField: 'searchbox',
  AXCheckBox: 'checkbox',
  AXRadioButton: 'radio',
  AXSlider: 'slider',
  AXSwitch: 'switch',
  AXTabBar: 'tablist',
  AXTab: 'tab',
  AXScrollView: 'scrollview',
  AXList: 'list',
  AXCell: 'listitem',
  AXTable: 'table',
  AXHeader: 'heading',
  AXNavigationBar: 'navigation',
  AXToolbar: 'toolbar',
  AXMenu: 'menu',
  AXMenuItem: 'menuitem',
  AXAlert: 'alert',
  AXDialog: 'dialog',
  AXProgressIndicator: 'progressbar',
  AXGroup: 'group',
  AXWindow: 'window',
  AXApplication: 'application',
};

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
      throw Errors.NO_ACTIVE_DEVICE();
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
    try {
      const androidManager = deviceManager.getAndroidManager();
      if (!androidManager) {
        return this.createPlaceholderTree('Android manager not available');
      }

      const xml = await androidManager.dumpUIHierarchy();
      return this.parseAndroidXMLString(xml);
    } catch (error) {
      log.error('Failed to capture Android tree:', error);
      return this.createPlaceholderTree('Failed to capture Android accessibility tree');
    }
  }

  /**
   * Capture accessibility tree from iOS using idb
   */
  private async captureIOSTree(deviceManager: DeviceManager): Promise<AccessibilityNode> {
    try {
      const iosManager = deviceManager.getIOSManager();
      if (!iosManager) {
        return this.createPlaceholderTree('iOS manager not available');
      }

      const accessibilityData = await iosManager.getAccessibilityTree();
      return this.parseIOSAccessibility(accessibilityData);
    } catch (error) {
      log.error('Failed to capture iOS tree:', error);
      return this.createPlaceholderTree('Failed to capture iOS accessibility tree (idb may not be installed)');
    }
  }

  /**
   * Parse iOS accessibility data into AccessibilityNode tree
   */
  private parseIOSAccessibility(data: any): AccessibilityNode {
    if (!data) {
      return this.createPlaceholderTree('No iOS accessibility data');
    }

    // Handle array of elements
    if (data.elements && Array.isArray(data.elements)) {
      const children = data.elements.map((el: any) => this.parseIOSElement(el));
      return {
        ref: '',
        role: 'application',
        label: 'iOS App',
        bounds: { x: 0, y: 0, width: 390, height: 844 },
        children,
      };
    }

    // Handle single element with nested children
    return this.parseIOSElement(data);
  }

  /**
   * Parse a single iOS accessibility element
   */
  private parseIOSElement(element: any): AccessibilityNode {
    const type = element.type || element.AXType || element.role || 'AXGroup';
    const role = IOS_ROLE_MAP[type] || 'none';

    const frame = element.frame || element.AXFrame || {};
    const bounds = {
      x: frame.x || frame.X || 0,
      y: frame.y || frame.Y || 0,
      width: frame.width || frame.Width || 0,
      height: frame.height || frame.Height || 0,
    };

    const label = element.label || element.AXLabel || element.AXValue || element.title;
    const hint = element.hint || element.AXHint;
    const identifier = element.identifier || element.AXIdentifier;

    const children: AccessibilityNode[] = [];
    if (element.children && Array.isArray(element.children)) {
      for (const child of element.children) {
        children.push(this.parseIOSElement(child));
      }
    }

    return {
      ref: '',
      role,
      label: label ? String(label) : undefined,
      hint: hint ? String(hint) : undefined,
      testID: identifier ? String(identifier) : undefined,
      bounds,
      state: {
        disabled: element.enabled === false || element.AXEnabled === false,
        selected: element.selected === true || element.AXSelected === true,
      },
      children,
    };
  }

  /**
   * Create a placeholder tree for development or errors
   */
  private createPlaceholderTree(message?: string): AccessibilityNode {
    return {
      ref: '',
      role: 'none',
      label: message || 'App Root',
      bounds: { x: 0, y: 0, width: 390, height: 844 },
      children: [],
    };
  }

  /**
   * Parse Android UI Automator XML string into AccessibilityNode tree
   */
  parseAndroidXMLString(xml: string): AccessibilityNode {
    // Simple regex-based XML parsing (lightweight, no external dependency)
    const nodeRegex = /<node\s+([^>]+)(?:\/>|>([\s\S]*?)<\/node>)/g;
    const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;

    const parseAttributes = (attrString: string): Record<string, string> => {
      const attrs: Record<string, string> = {};
      let match;
      while ((match = attrRegex.exec(attrString)) !== null) {
        attrs[match[1]] = match[2];
      }
      attrRegex.lastIndex = 0; // Reset regex
      return attrs;
    };

    const parseNodes = (content: string): AccessibilityNode[] => {
      const nodes: AccessibilityNode[] = [];
      let match;

      while ((match = nodeRegex.exec(content)) !== null) {
        const attrs = parseAttributes(match[1]);
        const innerContent = match[2] || '';

        const bounds = this.parseAndroidBounds(attrs['bounds'] || '');
        const className = attrs['class'] || '';
        const role = this.mapAndroidClass(className);

        const node: AccessibilityNode = {
          ref: '',
          role,
          label: attrs['content-desc'] || attrs['text'] || undefined,
          testID: attrs['resource-id'] || undefined,
          state: {
            disabled: attrs['enabled'] === 'false',
            checked: attrs['checked'] === 'true' ? true : attrs['checked'] === 'false' ? false : undefined,
            selected: attrs['selected'] === 'true',
          },
          bounds,
          children: innerContent ? parseNodes(innerContent) : [],
        };

        // Only include nodes with meaningful content
        if (node.label || node.testID || node.role !== 'none' || node.children.length > 0) {
          nodes.push(node);
        }
      }

      nodeRegex.lastIndex = 0; // Reset regex
      return nodes;
    };

    try {
      const children = parseNodes(xml);

      return {
        ref: '',
        role: 'application',
        label: 'Android App',
        bounds: { x: 0, y: 0, width: 1080, height: 2400 }, // Common Android resolution
        children,
      };
    } catch (error) {
      log.error('Failed to parse Android XML:', error);
      return this.createPlaceholderTree('Failed to parse Android XML');
    }
  }

  /**
   * Parse Android UI Automator XML into AccessibilityNode tree (deprecated - use parseAndroidXMLString)
   */
  parseAndroidXML(xml: string): AccessibilityNode {
    return this.parseAndroidXMLString(xml);
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
