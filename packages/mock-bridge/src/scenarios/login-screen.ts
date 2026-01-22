/**
 * Login Screen Scenario
 *
 * A typical login screen with email, password inputs, and login button.
 */

import type { MockAppState } from '../mock-app-state.js';

export const loginScreen: MockAppState = {
  elements: [
    {
      ref: '@header',
      role: 'header',
      label: 'Welcome',
      bounds: { x: 0, y: 44, width: 375, height: 60 },
    },
    {
      ref: '@email-input',
      role: 'textfield',
      label: 'Email',
      testID: 'email-input',
      placeholder: 'Enter your email',
      bounds: { x: 20, y: 150, width: 335, height: 44 },
    },
    {
      ref: '@password-input',
      role: 'textfield',
      label: 'Password',
      testID: 'password-input',
      placeholder: 'Enter your password',
      bounds: { x: 20, y: 210, width: 335, height: 44 },
    },
    {
      ref: '@login-button',
      role: 'button',
      label: 'Log In',
      testID: 'login-button',
      bounds: { x: 20, y: 280, width: 335, height: 50 },
    },
    {
      ref: '@forgot-password',
      role: 'link',
      label: 'Forgot Password?',
      testID: 'forgot-password-link',
      bounds: { x: 20, y: 350, width: 200, height: 30 },
    },
    {
      ref: '@sign-up',
      role: 'link',
      label: "Don't have an account? Sign Up",
      testID: 'sign-up-link',
      bounds: { x: 20, y: 390, width: 300, height: 30 },
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
