/**
 * Home Screen Scenario
 *
 * A typical home screen with navigation, list items, and tabs.
 */

import type { MockAppState } from '../mock-app-state.js';

export const homeScreen: MockAppState = {
  elements: [
    {
      ref: '@nav-header',
      role: 'header',
      label: 'Home',
      testID: 'home-header',
      bounds: { x: 0, y: 44, width: 375, height: 56 },
      children: [
        {
          ref: '@menu-button',
          role: 'button',
          label: 'Menu',
          testID: 'menu-button',
          bounds: { x: 16, y: 52, width: 40, height: 40 },
        },
        {
          ref: '@search-button',
          role: 'button',
          label: 'Search',
          testID: 'search-button',
          bounds: { x: 319, y: 52, width: 40, height: 40 },
        },
      ],
    },
    {
      ref: '@list',
      role: 'list',
      testID: 'item-list',
      bounds: { x: 0, y: 100, width: 375, height: 600 },
      children: [
        {
          ref: '@list-item-1',
          role: 'listitem',
          label: 'First Item',
          testID: 'list-item-1',
          bounds: { x: 0, y: 100, width: 375, height: 80 },
        },
        {
          ref: '@list-item-2',
          role: 'listitem',
          label: 'Second Item',
          testID: 'list-item-2',
          bounds: { x: 0, y: 180, width: 375, height: 80 },
        },
        {
          ref: '@list-item-3',
          role: 'listitem',
          label: 'Third Item',
          testID: 'list-item-3',
          bounds: { x: 0, y: 260, width: 375, height: 80 },
        },
      ],
    },
    {
      ref: '@tab-bar',
      role: 'tabbar',
      testID: 'tab-bar',
      bounds: { x: 0, y: 762, width: 375, height: 50 },
      children: [
        {
          ref: '@tab-home',
          role: 'tab',
          label: 'Home',
          testID: 'tab-home',
          bounds: { x: 0, y: 762, width: 94, height: 50 },
        },
        {
          ref: '@tab-explore',
          role: 'tab',
          label: 'Explore',
          testID: 'tab-explore',
          bounds: { x: 94, y: 762, width: 94, height: 50 },
        },
        {
          ref: '@tab-notifications',
          role: 'tab',
          label: 'Notifications',
          testID: 'tab-notifications',
          bounds: { x: 188, y: 762, width: 94, height: 50 },
        },
        {
          ref: '@tab-profile',
          role: 'tab',
          label: 'Profile',
          testID: 'tab-profile',
          bounds: { x: 282, y: 762, width: 93, height: 50 },
        },
      ],
    },
  ],
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
