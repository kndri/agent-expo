/**
 * Settings Screen Scenario
 *
 * A typical settings screen with toggles and options.
 */

import type { MockAppState } from '../mock-app-state.js';

export const settingsScreen: MockAppState = {
  elements: [
    {
      ref: '@nav-header',
      role: 'header',
      label: 'Settings',
      testID: 'settings-header',
      bounds: { x: 0, y: 44, width: 375, height: 56 },
      children: [
        {
          ref: '@back-button',
          role: 'button',
          label: 'Back',
          testID: 'back-button',
          bounds: { x: 16, y: 52, width: 40, height: 40 },
        },
      ],
    },
    {
      ref: '@profile-section',
      role: 'group',
      label: 'Profile',
      bounds: { x: 0, y: 100, width: 375, height: 80 },
      children: [
        {
          ref: '@profile-picture',
          role: 'image',
          label: 'Profile Picture',
          testID: 'profile-picture',
          bounds: { x: 16, y: 110, width: 60, height: 60 },
        },
        {
          ref: '@user-name',
          role: 'staticText',
          label: 'John Doe',
          testID: 'user-name',
          bounds: { x: 92, y: 120, width: 200, height: 20 },
        },
        {
          ref: '@user-email',
          role: 'staticText',
          label: 'john@example.com',
          testID: 'user-email',
          bounds: { x: 92, y: 144, width: 200, height: 16 },
        },
      ],
    },
    {
      ref: '@notifications-toggle',
      role: 'switch',
      label: 'Push Notifications',
      testID: 'notifications-toggle',
      checked: true,
      bounds: { x: 16, y: 200, width: 343, height: 44 },
    },
    {
      ref: '@dark-mode-toggle',
      role: 'switch',
      label: 'Dark Mode',
      testID: 'dark-mode-toggle',
      checked: false,
      bounds: { x: 16, y: 260, width: 343, height: 44 },
    },
    {
      ref: '@sounds-toggle',
      role: 'switch',
      label: 'Sound Effects',
      testID: 'sounds-toggle',
      checked: true,
      bounds: { x: 16, y: 320, width: 343, height: 44 },
    },
    {
      ref: '@language-option',
      role: 'button',
      label: 'Language',
      testID: 'language-option',
      value: 'English',
      bounds: { x: 16, y: 380, width: 343, height: 44 },
    },
    {
      ref: '@privacy-policy',
      role: 'link',
      label: 'Privacy Policy',
      testID: 'privacy-policy',
      bounds: { x: 16, y: 440, width: 343, height: 44 },
    },
    {
      ref: '@terms-of-service',
      role: 'link',
      label: 'Terms of Service',
      testID: 'terms-of-service',
      bounds: { x: 16, y: 500, width: 343, height: 44 },
    },
    {
      ref: '@logout-button',
      role: 'button',
      label: 'Log Out',
      testID: 'logout-button',
      bounds: { x: 16, y: 580, width: 343, height: 50 },
    },
    {
      ref: '@delete-account',
      role: 'button',
      label: 'Delete Account',
      testID: 'delete-account',
      bounds: { x: 16, y: 650, width: 343, height: 50 },
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
