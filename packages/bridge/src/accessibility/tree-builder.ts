/**
 * AccessibilityTreeBuilder
 *
 * Builds an accessibility tree from the React Native component hierarchy.
 */

import { Dimensions } from 'react-native';
import type {
  AccessibilityNode,
  EnhancedSnapshot,
  RefMap,
  RefEntry,
} from '../types';

export class AccessibilityTreeBuilder {
  private refCounter: number = 0;

  /**
   * Build a snapshot from the root component
   */
  buildSnapshot(rootComponent: any): EnhancedSnapshot {
    this.refCounter = 0;
    const refs: RefMap = {};

    // In a real implementation, this would traverse the React Native
    // component tree and extract accessibility information
    const tree = this.buildPlaceholderTree();
    const formattedTree = this.formatTree(tree, refs, 0);

    const { width, height } = Dimensions.get('window');

    return {
      tree: formattedTree,
      refs,
      viewport: { width, height },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build a placeholder tree for development
   * In a real implementation, this would traverse the actual component tree
   */
  private buildPlaceholderTree(): AccessibilityNode {
    return {
      ref: '',
      role: 'none',
      label: 'App Root',
      bounds: { x: 0, y: 0, width: 390, height: 844 },
      children: [
        {
          ref: '',
          role: 'text',
          label: 'Welcome to agent-expo',
          bounds: { x: 20, y: 100, width: 350, height: 30 },
          children: [],
        },
        {
          ref: '',
          role: 'button',
          label: 'Get Started',
          testID: 'get-started-button',
          bounds: { x: 20, y: 150, width: 350, height: 50 },
          children: [],
        },
      ],
    };
  }

  /**
   * Format the tree into a text representation and populate refs
   */
  private formatTree(
    node: AccessibilityNode,
    refs: RefMap,
    depth: number
  ): string {
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

    if (node.testID) {
      line += ` [testID=${node.testID}]`;
    }

    // Process children
    const childrenLines = node.children
      .map((child) => this.formatTree(child, refs, depth + 1))
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
