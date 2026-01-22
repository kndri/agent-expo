/**
 * @agent-expo/sdk
 *
 * Programmatic SDK for agent-expo.
 * Use this to control React Native apps from code or AI agents.
 */

export { AgentExpoClient } from './client.js';
export {
  aiTools,
  getClaudeTools,
  getOpenAITools,
  executeTools,
  type AITool,
  type AIToolDefinition,
  type ToolCall,
  type ToolResult,
} from './ai-tools.js';
export {
  startDaemon,
  stopDaemon,
  isDaemonRunning,
  type DaemonStartOptions,
} from './daemon-starter.js';
export type { ClientConfig, ClientStatus, ConnectOptions } from './client.js';
