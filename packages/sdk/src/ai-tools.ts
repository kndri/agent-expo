/**
 * AI Tool Definitions
 *
 * Tool definitions for AI agents (Claude, GPT, etc.)
 */

import type { AgentExpoClient } from './client.js';

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AITool {
  definition: AIToolDefinition;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  name: string;
  result?: unknown;
  error?: string;
}

/**
 * AI tool definitions for mobile automation
 */
export const aiTools: AIToolDefinition[] = [
  {
    name: 'mobile_launch',
    description:
      'Launch a mobile device simulator/emulator and optionally an app. Use this before any other mobile commands.',
    parameters: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'The mobile platform to launch',
        },
        device: {
          type: 'string',
          description: 'Optional device ID or name to use',
        },
        bundleId: {
          type: 'string',
          description: 'Optional app bundle ID to launch (e.g., com.example.myapp)',
        },
      },
      required: ['platform'],
    },
  },
  {
    name: 'mobile_snapshot',
    description:
      'Get the current accessibility tree and element refs from the mobile app. Returns a tree structure with element refs like @e1, @e2 that can be used for interactions.',
    parameters: {
      type: 'object',
      properties: {
        interactive: {
          type: 'boolean',
          description: 'Only return interactive elements (buttons, inputs, etc.)',
        },
        withScreenshot: {
          type: 'boolean',
          description: 'Include a base64 screenshot for visual analysis',
        },
      },
    },
  },
  {
    name: 'mobile_tap',
    description: 'Tap on an element in the mobile app using its ref from the snapshot.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Element ref from snapshot (e.g., @e1, @e5)',
        },
      },
      required: ['ref'],
    },
  },
  {
    name: 'mobile_fill',
    description: 'Fill text into an input field in the mobile app.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Element ref of the input field',
        },
        text: {
          type: 'string',
          description: 'Text to enter into the input',
        },
        clear: {
          type: 'boolean',
          description: 'Clear existing text before filling',
        },
      },
      required: ['ref', 'text'],
    },
  },
  {
    name: 'mobile_scroll',
    description: 'Scroll the screen or a scrollable element.',
    parameters: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right'],
          description: 'Direction to scroll',
        },
        toRef: {
          type: 'string',
          description: 'Optional: scroll until this element ref is visible',
        },
      },
      required: ['direction'],
    },
  },
  {
    name: 'mobile_navigate',
    description: 'Open a deep link URL in the mobile app.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Deep link URL (e.g., myapp://profile/123)',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'mobile_back',
    description: 'Press the back button (Android only).',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'mobile_screenshot',
    description: 'Take a screenshot of the current screen. Returns base64 encoded image.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'mobile_assert',
    description: 'Assert something about an element in the mobile app.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Element ref to check',
        },
        assertion: {
          type: 'string',
          enum: ['visible', 'hidden', 'enabled', 'disabled', 'exists', 'hasText'],
          description: 'Type of assertion',
        },
        value: {
          type: 'string',
          description: 'Expected value (for hasText assertion)',
        },
      },
      required: ['ref', 'assertion'],
    },
  },
  {
    name: 'mobile_api_requests',
    description:
      'Get logged API/network requests from the mobile app. Use to verify API calls were made correctly.',
    parameters: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'URL pattern to filter (e.g., /api/users)',
        },
        method: {
          type: 'string',
          description: 'HTTP method filter (GET, POST, etc.)',
        },
      },
    },
  },
  {
    name: 'mobile_supabase_calls',
    description:
      'Get logged Supabase API calls from the mobile app. Use to verify database operations.',
    parameters: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name to filter',
        },
        operation: {
          type: 'string',
          enum: ['select', 'insert', 'update', 'delete', 'upsert'],
          description: 'Operation type to filter',
        },
      },
    },
  },
  {
    name: 'mobile_convex_calls',
    description:
      'Get logged Convex API calls from the mobile app. Use to verify Convex function invocations.',
    parameters: {
      type: 'object',
      properties: {
        functionName: {
          type: 'string',
          description: 'Function name to filter (e.g., api.users.create)',
        },
        type: {
          type: 'string',
          enum: ['query', 'mutation', 'action'],
          description: 'Call type to filter',
        },
      },
    },
  },
  {
    name: 'mobile_wait_for',
    description: 'Wait for an element to appear or disappear.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Element ref to wait for',
        },
        condition: {
          type: 'string',
          enum: ['visible', 'hidden', 'exists', 'notExists'],
          description: 'Condition to wait for',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 5000)',
        },
      },
      required: ['ref', 'condition'],
    },
  },
  {
    name: 'mobile_clear',
    description: 'Clear text from an input field.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Element ref of the input field to clear',
        },
      },
      required: ['ref'],
    },
  },
  {
    name: 'mobile_double_tap',
    description: 'Double tap on an element.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Element ref to double tap',
        },
      },
      required: ['ref'],
    },
  },
  {
    name: 'mobile_long_press',
    description: 'Long press on an element.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Element ref to long press',
        },
        duration: {
          type: 'number',
          description: 'Press duration in milliseconds (default: 1000)',
        },
      },
      required: ['ref'],
    },
  },
  {
    name: 'mobile_mock_api',
    description: 'Mock an API response for testing. Subsequent requests matching the pattern will return the mocked response.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'URL pattern to match (e.g., /api/users)',
        },
        status: {
          type: 'number',
          description: 'HTTP status code (default: 200)',
        },
        body: {
          type: 'object',
          description: 'Response body (will be JSON encoded)',
        },
        delay: {
          type: 'number',
          description: 'Delay before responding in milliseconds',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'mobile_clear_mocks',
    description: 'Clear all API mocks.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'mobile_reload',
    description: 'Reload the mobile app (terminate and relaunch).',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'mobile_devices',
    description: 'List available simulators/emulators.',
    parameters: {
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          enum: ['ios', 'android'],
          description: 'Filter by platform',
        },
      },
    },
  },
  {
    name: 'mobile_set_location',
    description: 'Set mock GPS location on the device.',
    parameters: {
      type: 'object',
      properties: {
        latitude: {
          type: 'number',
          description: 'Latitude coordinate',
        },
        longitude: {
          type: 'number',
          description: 'Longitude coordinate',
        },
      },
      required: ['latitude', 'longitude'],
    },
  },
  {
    name: 'mobile_swipe',
    description: 'Perform a swipe gesture from one point to another.',
    parameters: {
      type: 'object',
      properties: {
        fromX: {
          type: 'number',
          description: 'Starting X coordinate',
        },
        fromY: {
          type: 'number',
          description: 'Starting Y coordinate',
        },
        toX: {
          type: 'number',
          description: 'Ending X coordinate',
        },
        toY: {
          type: 'number',
          description: 'Ending Y coordinate',
        },
        duration: {
          type: 'number',
          description: 'Duration in milliseconds',
        },
      },
      required: ['fromX', 'fromY', 'toX', 'toY'],
    },
  },
  {
    name: 'mobile_home',
    description: 'Press the home button to go to the device home screen.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Get tool definitions for OpenAI function calling format
 */
export function getOpenAITools(): Array<{
  type: 'function';
  function: AIToolDefinition;
}> {
  return aiTools.map((tool) => ({
    type: 'function' as const,
    function: tool,
  }));
}

/**
 * Get tool definitions for Claude tools format (Anthropic API)
 */
export function getClaudeTools(): Array<{
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}> {
  return aiTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

/**
 * Execute tool calls from AI responses
 *
 * @param client - AgentExpoClient instance
 * @param toolCalls - Array of tool calls from AI
 * @returns Array of tool results
 *
 * @example
 * ```typescript
 * const client = new AgentExpoClient();
 * await client.connect();
 *
 * const toolCalls = [
 *   { name: 'mobile_snapshot', input: { interactive: true } },
 *   { name: 'mobile_tap', input: { ref: '@e1' } },
 * ];
 *
 * const results = await executeTools(client, toolCalls);
 * ```
 */
export async function executeTools(
  client: AgentExpoClient,
  toolCalls: ToolCall[]
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of toolCalls) {
    try {
      const result = await executeSingleTool(client, call);
      results.push({ name: call.name, result });
    } catch (error) {
      results.push({
        name: call.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Execute a single tool call
 */
async function executeSingleTool(
  client: AgentExpoClient,
  call: ToolCall
): Promise<unknown> {
  const { name, input } = call;

  switch (name) {
    case 'mobile_launch':
      return client.launch({
        platform: input.platform as 'ios' | 'android',
        device: input.device as string | undefined,
        bundleId: input.bundleId as string | undefined,
      });

    case 'mobile_snapshot':
      return client.snapshot({
        interactive: input.interactive as boolean | undefined,
        withScreenshot: input.withScreenshot as boolean | undefined,
      });

    case 'mobile_tap':
      return client.tap(input.ref as string);

    case 'mobile_fill':
      return client.fill(
        input.ref as string,
        input.text as string,
        input.clear as boolean | undefined
      );

    case 'mobile_clear':
      return client.clear(input.ref as string);

    case 'mobile_double_tap':
      return client.doubleTap(input.ref as string);

    case 'mobile_long_press':
      return client.longPress(
        input.ref as string,
        input.duration as number | undefined
      );

    case 'mobile_scroll':
      return client.scroll(input.direction as 'up' | 'down' | 'left' | 'right', {
        toRef: input.toRef as string | undefined,
      });

    case 'mobile_swipe':
      return client.swipe(
        { x: input.fromX as number, y: input.fromY as number },
        { x: input.toX as number, y: input.toY as number },
        input.duration as number | undefined
      );

    case 'mobile_navigate':
      return client.navigate(input.url as string);

    case 'mobile_back':
      return client.back();

    case 'mobile_home':
      return client.home();

    case 'mobile_screenshot':
      return client.screenshot();

    case 'mobile_assert':
      return client.assert(
        input.ref as string,
        input.assertion as string,
        input.value as string | undefined
      );

    case 'mobile_wait_for':
      return client.waitFor(
        input.ref as string,
        input.condition as 'visible' | 'hidden' | 'exists' | 'notExists',
        input.timeout as number | undefined
      );

    case 'mobile_api_requests':
      return client.getRequests({
        url: input.filter as string | undefined,
        method: input.method as string | undefined,
      });

    case 'mobile_supabase_calls':
      return client.getSupabaseCalls({
        table: input.table as string | undefined,
        operation: input.operation as string | undefined,
      });

    case 'mobile_convex_calls':
      return client.getConvexCalls({
        functionName: input.functionName as string | undefined,
        type: input.type as 'query' | 'mutation' | 'action' | undefined,
      });

    case 'mobile_mock_api':
      return client.mockResponse(input.pattern as string, {
        status: input.status as number | undefined,
        body: input.body as string | Record<string, unknown> | undefined,
        delay: input.delay as number | undefined,
      });

    case 'mobile_clear_mocks':
      return client.clearMocks();

    case 'mobile_reload':
      return client.reload();

    case 'mobile_devices':
      return client.listDevices(input.platform as 'ios' | 'android' | undefined);

    case 'mobile_set_location':
      return client.setLocation(
        input.latitude as number,
        input.longitude as number
      );

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
