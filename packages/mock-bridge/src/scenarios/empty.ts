/**
 * Empty Screen Scenario
 *
 * A blank screen with no elements - useful for building custom states.
 */

import type { MockAppState } from '../mock-app-state.js';

export const emptyScreen: MockAppState = {
  elements: [],
  device: {
    platform: 'ios',
    name: 'iPhone 15',
    model: 'iPhone',
    osVersion: '17.0',
  },
  app: {
    bundleId: 'com.example.mockapp',
    version: '1.0.0',
  },
};
