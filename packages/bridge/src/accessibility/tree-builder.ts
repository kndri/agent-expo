/**
 * AccessibilityTreeBuilder
 *
 * Builds an accessibility tree from the React Native component hierarchy
 * using React's internal fiber tree (similar to React DevTools).
 */

import { Dimensions, findNodeHandle, UIManager, Platform } from 'react-native';
import type {
  AccessibilityNode,
  EnhancedSnapshot,
  RefMap,
  Bounds,
  AccessibilityState,
  AccessibilityValue,
  SnapshotOptions,
} from '../types';

// React fiber types (internal)
interface Fiber {
  tag: number;
  type: any;
  stateNode: any;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  memoizedProps: any;
  _debugOwner?: Fiber;
}

// Fiber tags we care about
const HostComponent = 5; // Native components (View, Text, etc.)
const HostText = 6; // Text nodes

// Accessibility roles mapping from React Native to our format
const ROLE_MAP: Record<string, string> = {
  button: 'button',
  link: 'link',
  search: 'searchbox',
  image: 'image',
  imagebutton: 'button',
  keyboardkey: 'button',
  text: 'text',
  adjustable: 'slider',
  header: 'heading',
  summary: 'text',
  alert: 'alert',
  checkbox: 'checkbox',
  combobox: 'combobox',
  menu: 'menu',
  menubar: 'menubar',
  menuitem: 'menuitem',
  progressbar: 'progressbar',
  radio: 'radio',
  radiogroup: 'radiogroup',
  scrollbar: 'scrollbar',
  spinbutton: 'spinbutton',
  switch: 'switch',
  tab: 'tab',
  tablist: 'tablist',
  timer: 'timer',
  toolbar: 'toolbar',
  none: 'none',
};

// Interactive roles that should be included when filtering
const INTERACTIVE_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'textbox',
  'combobox',
  'menu',
  'menuitem',
  'tab',
  'searchbox',
]);

interface MeasuredNode {
  node: AccessibilityNode;
  nativeHandle: number | null;
}

export class AccessibilityTreeBuilder {
  private refCounter: number = 0;
  private pendingMeasurements: Map<string, Promise<Bounds>> = new Map();

  /**
   * Build a snapshot from the React fiber tree
   */
  async buildSnapshotAsync(options: SnapshotOptions = {}): Promise<EnhancedSnapshot> {
    this.refCounter = 0;
    const refs: RefMap = {};
    const { width, height } = Dimensions.get('window');
    const viewport = { width, height };

    // Try to get the fiber root from React DevTools hook
    const fiberRoot = this.getFiberRoot();

    let rootNode: AccessibilityNode;

    if (fiberRoot) {
      // Traverse the real fiber tree
      const measuredNodes: MeasuredNode[] = [];
      rootNode = await this.traverseFiber(fiberRoot.current, options, measuredNodes, 0, viewport);

      // Measure all nodes that have native handles
      await this.measureAllNodes(measuredNodes);
    } else {
      // Fallback to placeholder if we can't access the fiber tree
      console.warn('[AccessibilityTreeBuilder] Could not access fiber tree, using placeholder');
      rootNode = this.buildPlaceholderTree();
    }

    // Format the tree and populate refs
    const formattedTree = this.formatTree(rootNode, refs, 0, options, viewport);

    return {
      tree: formattedTree,
      refs,
      viewport,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Synchronous build (uses cached data or placeholder)
   */
  buildSnapshot(rootComponent: any): EnhancedSnapshot {
    this.refCounter = 0;
    const refs: RefMap = {};
    const { width, height } = Dimensions.get('window');
    const viewport = { width, height };

    // Try to get the fiber root
    const fiberRoot = this.getFiberRoot();

    let rootNode: AccessibilityNode;

    if (fiberRoot) {
      // Traverse the fiber tree synchronously (without measurements)
      rootNode = this.traverseFiberSync(fiberRoot.current, {}, 0, viewport);
    } else {
      rootNode = this.buildPlaceholderTree();
    }

    const formattedTree = this.formatTree(rootNode, refs, 0, {}, viewport);

    return {
      tree: formattedTree,
      refs,
      viewport,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get the React fiber root from the DevTools hook
   */
  private getFiberRoot(): { current: Fiber } | null {
    try {
      // Access the global React DevTools hook
      const hook = (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;

      if (!hook) {
        console.log('[AccessibilityTreeBuilder] React DevTools hook not available');
        return null;
      }

      // Get the fiber roots (React Native typically has one renderer)
      const rendererId = 1; // React Native renderer ID
      const roots = hook.getFiberRoots?.(rendererId);

      if (!roots || roots.size === 0) {
        // Try alternate method
        const renderers = hook.renderers;
        if (renderers && renderers.size > 0) {
          for (const [id, renderer] of renderers) {
            const fiberRoots = hook.getFiberRoots?.(id);
            if (fiberRoots && fiberRoots.size > 0) {
              return [...fiberRoots][0];
            }
          }
        }
        return null;
      }

      return [...roots][0];
    } catch (error) {
      console.error('[AccessibilityTreeBuilder] Error accessing fiber root:', error);
      return null;
    }
  }

  /**
   * Traverse the fiber tree and build accessibility nodes
   */
  private async traverseFiber(
    fiber: Fiber | null,
    options: SnapshotOptions,
    measuredNodes: MeasuredNode[],
    depth: number,
    viewport?: { width: number; height: number }
  ): Promise<AccessibilityNode> {
    if (!fiber) {
      return this.createEmptyNode();
    }

    const maxDepth = options.maxDepth ?? 50;
    if (depth > maxDepth) {
      return this.createEmptyNode();
    }

    // Skip elements hidden from accessibility
    if (this.isHiddenFromAccessibility(fiber)) {
      return this.createEmptyNode();
    }

    const node = this.extractNodeInfo(fiber);

    // Get native handle for measurement
    if (fiber.stateNode && fiber.tag === HostComponent) {
      const handle = findNodeHandle(fiber.stateNode);
      if (handle) {
        measuredNodes.push({ node, nativeHandle: handle });
      }
    }

    // Traverse children
    const children: AccessibilityNode[] = [];
    let childFiber = fiber.child;

    while (childFiber) {
      const childNode = await this.traverseFiber(childFiber, options, measuredNodes, depth + 1, viewport);

      // Filter out empty nodes and apply interactive filter
      if (this.shouldIncludeNode(childNode, options, viewport)) {
        children.push(childNode);
      } else if (childNode.children.length > 0) {
        // If node itself is filtered but has children, promote children
        children.push(...childNode.children.filter(c => this.shouldIncludeNode(c, options, viewport)));
      }

      childFiber = childFiber.sibling;
    }

    node.children = children;
    return node;
  }

  /**
   * Synchronous fiber traversal (without async measurements)
   */
  private traverseFiberSync(
    fiber: Fiber | null,
    options: SnapshotOptions,
    depth: number,
    viewport?: { width: number; height: number }
  ): AccessibilityNode {
    if (!fiber) {
      return this.createEmptyNode();
    }

    const maxDepth = options.maxDepth ?? 50;
    if (depth > maxDepth) {
      return this.createEmptyNode();
    }

    // Skip elements hidden from accessibility
    if (this.isHiddenFromAccessibility(fiber)) {
      return this.createEmptyNode();
    }

    const node = this.extractNodeInfo(fiber);

    // Try to get bounds synchronously if we have a stateNode
    if (fiber.stateNode && fiber.tag === HostComponent) {
      const handle = findNodeHandle(fiber.stateNode);
      if (handle) {
        // Use measureInWindow synchronously via callback
        this.measureSync(handle, (bounds) => {
          if (bounds) {
            node.bounds = bounds;
          }
        });
      }
    }

    // Traverse children
    const children: AccessibilityNode[] = [];
    let childFiber = fiber.child;

    while (childFiber) {
      const childNode = this.traverseFiberSync(childFiber, options, depth + 1, viewport);

      if (this.shouldIncludeNode(childNode, options, viewport)) {
        children.push(childNode);
      } else if (childNode.children.length > 0) {
        children.push(...childNode.children.filter(c => this.shouldIncludeNode(c, options, viewport)));
      }

      childFiber = childFiber.sibling;
    }

    node.children = children;
    return node;
  }

  /**
   * Check if a fiber node is hidden from accessibility
   */
  private isHiddenFromAccessibility(fiber: Fiber): boolean {
    const props = fiber.memoizedProps || {};

    // Check accessibilityElementsHidden (iOS)
    if (props.accessibilityElementsHidden === true) {
      return true;
    }

    // Check importantForAccessibility (Android)
    if (props.importantForAccessibility === 'no-hide-descendants') {
      return true;
    }

    // Check accessible=false explicitly set
    if (props.accessible === false && props.accessibilityRole === undefined) {
      // Only hide if not explicitly given a role
      return false; // Still traverse children
    }

    return false;
  }

  /**
   * Extract accessibility information from a fiber node
   */
  private extractNodeInfo(fiber: Fiber): AccessibilityNode {
    const props = fiber.memoizedProps || {};
    const type = fiber.type;

    // Determine the role
    let role = 'none';

    if (props.accessibilityRole) {
      role = ROLE_MAP[props.accessibilityRole] || props.accessibilityRole;
    } else if (typeof type === 'string') {
      // Infer role from component type
      const typeName = type.toLowerCase();
      if (typeName.includes('text')) {
        role = 'text';
      } else if (typeName.includes('button') || typeName.includes('touchable') || typeName.includes('pressable')) {
        role = 'button';
      } else if (typeName.includes('textinput')) {
        role = 'textbox';
      } else if (typeName.includes('image')) {
        role = 'image';
      } else if (typeName.includes('scroll')) {
        role = 'scrollview';
      } else if (typeName.includes('flatlist') || typeName.includes('sectionlist')) {
        role = 'list';
      } else if (typeName === 'rctview' || typeName === 'view') {
        role = 'none';
      }
    } else if (type && type.displayName) {
      // Check displayName for custom components
      const displayName = type.displayName.toLowerCase();
      if (displayName.includes('button') || displayName.includes('touchable') || displayName.includes('pressable')) {
        role = 'button';
      } else if (displayName.includes('input') || displayName.includes('textfield')) {
        role = 'textbox';
      }
    }

    // Check for onPress to identify interactive elements
    if (role === 'none' && (props.onPress || props.onPressIn || props.onPressOut)) {
      role = 'button';
    }

    // Extract label
    let label = props.accessibilityLabel || props.accessible && props.children;

    // If children is a string, use it as label
    if (!label && typeof props.children === 'string') {
      label = props.children;
    }

    // Extract state
    const state: AccessibilityState = {};
    if (props.accessibilityState) {
      Object.assign(state, props.accessibilityState);
    }
    if (props.disabled) {
      state.disabled = true;
    }
    if (props.selected) {
      state.selected = true;
    }

    // Extract value
    let value: AccessibilityValue | undefined;
    if (props.accessibilityValue) {
      value = props.accessibilityValue;
    } else if (props.value !== undefined) {
      value = { text: String(props.value) };
    }

    return {
      ref: '',
      role,
      label: label ? String(label) : undefined,
      hint: props.accessibilityHint,
      testID: props.testID || props.nativeID,
      placeholder: props.placeholder,
      state: Object.keys(state).length > 0 ? state : undefined,
      value,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      children: [],
    };
  }

  /**
   * Measure all nodes with native handles
   */
  private async measureAllNodes(measuredNodes: MeasuredNode[]): Promise<void> {
    const promises = measuredNodes.map(({ node, nativeHandle }) => {
      if (!nativeHandle) return Promise.resolve();

      return new Promise<void>((resolve) => {
        UIManager.measureInWindow(nativeHandle, (x, y, width, height) => {
          if (width !== undefined && height !== undefined) {
            node.bounds = { x: x || 0, y: y || 0, width, height };
          }
          resolve();
        });
      });
    });

    await Promise.all(promises);
  }

  /**
   * Synchronous measure (best effort)
   */
  private measureSync(handle: number, callback: (bounds: Bounds | null) => void): void {
    try {
      UIManager.measureInWindow(handle, (x, y, width, height) => {
        if (width !== undefined && height !== undefined) {
          callback({ x: x || 0, y: y || 0, width, height });
        } else {
          callback(null);
        }
      });
    } catch {
      callback(null);
    }
  }

  /**
   * Check if a node should be included based on options
   */
  private shouldIncludeNode(node: AccessibilityNode, options: SnapshotOptions, viewport?: { width: number; height: number }): boolean {
    // Always exclude completely empty nodes
    if (node.role === 'none' && !node.label && !node.testID && node.children.length === 0) {
      return false;
    }

    // Filter out off-screen elements if visibleOnly is set
    if (options.visibleOnly && viewport && node.bounds) {
      const isOffScreen =
        node.bounds.x + node.bounds.width < 0 ||
        node.bounds.y + node.bounds.height < 0 ||
        node.bounds.x > viewport.width ||
        node.bounds.y > viewport.height;

      // Still include if it has visible children
      if (isOffScreen && !node.children.some(c => this.shouldIncludeNode(c, options, viewport))) {
        return false;
      }
    }

    // Filter out zero-size elements (unless they have children or labels)
    if (node.bounds.width === 0 && node.bounds.height === 0 && !node.label && node.children.length === 0) {
      return false;
    }

    // Interactive filter
    if (options.interactive) {
      const isInteractive = INTERACTIVE_ROLES.has(node.role) ||
                           node.testID !== undefined ||
                           node.children.some(c => this.shouldIncludeNode(c, options, viewport));
      return isInteractive;
    }

    return true;
  }

  /**
   * Create an empty node
   */
  private createEmptyNode(): AccessibilityNode {
    return {
      ref: '',
      role: 'none',
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      children: [],
    };
  }

  /**
   * Build a placeholder tree for development/fallback
   */
  private buildPlaceholderTree(): AccessibilityNode {
    const { width, height } = Dimensions.get('window');
    return {
      ref: '',
      role: 'none',
      label: 'App Root (placeholder - fiber tree not accessible)',
      bounds: { x: 0, y: 0, width, height },
      children: [],
    };
  }

  /**
   * Format the tree into a text representation and populate refs
   */
  private formatTree(
    node: AccessibilityNode,
    refs: RefMap,
    depth: number,
    options: SnapshotOptions,
    viewport?: { width: number; height: number }
  ): string {
    // Skip empty nodes in compact mode
    if (options.compact && node.role === 'none' && !node.label && !node.testID) {
      const childrenLines = node.children
        .map((child) => this.formatTree(child, refs, depth, options, viewport))
        .filter(Boolean);
      return childrenLines.join('\n');
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
      // Truncate long labels
      const maxLabelLen = 50;
      const label = node.label.length > maxLabelLen
        ? node.label.substring(0, maxLabelLen) + '...'
        : node.label;
      line += ` "${label}"`;
    }

    if (node.placeholder) {
      line += ` placeholder="${node.placeholder}"`;
    }

    if (node.state?.disabled) {
      line += ' disabled';
    }

    if (node.state?.checked !== undefined) {
      line += node.state.checked ? ' checked' : ' unchecked';
    }

    if (node.state?.selected) {
      line += ' selected';
    }

    line += ` [ref=${ref}]`;

    if (node.testID) {
      line += ` [testID=${node.testID}]`;
    }

    // Process children
    const childrenLines = node.children
      .map((child) => this.formatTree(child, refs, depth + 1, options, viewport))
      .filter(Boolean);

    if (childrenLines.length > 0) {
      return line + '\n' + childrenLines.join('\n');
    }

    return line;
  }

  /**
   * Find an element by testID
   */
  findByTestID(root: AccessibilityNode, testID: string): AccessibilityNode | null {
    if (root.testID === testID) {
      return root;
    }

    for (const child of root.children) {
      const found = this.findByTestID(child, testID);
      if (found) return found;
    }

    return null;
  }

  /**
   * Find an element by ref
   */
  findByRef(root: AccessibilityNode, ref: string): AccessibilityNode | null {
    if (root.ref === ref) {
      return root;
    }

    for (const child of root.children) {
      const found = this.findByRef(child, ref);
      if (found) return found;
    }

    return null;
  }
}
