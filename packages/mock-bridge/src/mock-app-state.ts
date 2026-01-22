/**
 * Mock App State Types
 *
 * Defines the shape of mock app state used by MockBridge.
 */

/**
 * Bounding box for an element
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Mock UI element representing an accessibility node
 */
export interface MockElement {
  /** Unique reference ID (e.g., @e1, @header) */
  ref: string;
  /** Accessibility role */
  role: string;
  /** Accessibility label */
  label?: string;
  /** Test ID for targeting */
  testID?: string;
  /** Element bounds */
  bounds: Bounds;
  /** Whether the element is visible */
  visible?: boolean;
  /** Whether the element is enabled/interactable */
  enabled?: boolean;
  /** Current value (for inputs) */
  value?: string;
  /** Placeholder text (for inputs) */
  placeholder?: string;
  /** Whether checked (for checkboxes) */
  checked?: boolean;
  /** Child elements */
  children?: MockElement[];
}

/**
 * Mock network request
 */
export interface MockNetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  status?: number;
  response?: unknown;
  timestamp: number;
}

/**
 * Complete mock app state
 */
export interface MockAppState {
  /** UI element tree */
  elements: MockElement[];
  /** Optional screenshot buffer */
  screenshot?: Buffer;
  /** Network requests captured */
  networkRequests?: MockNetworkRequest[];
  /** Device info */
  device?: {
    platform: 'ios' | 'android';
    name: string;
    model: string;
    osVersion: string;
  };
  /** App info */
  app?: {
    bundleId: string;
    version?: string;
  };
}

/**
 * Create a mock element with defaults
 */
export function createMockElement(partial: Partial<MockElement> & { ref: string; role: string }): MockElement {
  return {
    visible: true,
    enabled: true,
    bounds: { x: 0, y: 0, width: 100, height: 44 },
    ...partial,
  };
}
