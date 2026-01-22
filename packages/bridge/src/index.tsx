/**
 * @agent-expo/bridge
 *
 * In-app bridge module for agent-expo.
 * Provides rich automation capabilities for React Native apps.
 */

export { AgentBridgeProvider, useAgentBridge } from './AgentBridgeProvider';
export { useNetworkTracking } from './hooks/useNetworkTracking';
export { useSupabaseTracking } from './network/supabase';
export { useConvexTracking } from './network/convex';
export { AccessibilityTreeBuilder } from './accessibility/tree-builder';

export type {
  AgentBridgeConfig,
  AgentBridgeContext,
  EnhancedSnapshot,
  SnapshotOptions,
  AccessibilityNode,
  NetworkRequest,
  NetworkResponse,
  TrackedRequest,
  SupabaseCall,
  ConvexCall,
} from './types';
