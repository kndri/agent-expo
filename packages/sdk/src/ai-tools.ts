/**
 * AI Tool Definitions
 *
 * Tool definitions for AI agents (Claude, GPT, etc.)
 */

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
 * Get tool definitions for Claude tools format
 */
export function getClaudeTools(): AIToolDefinition[] {
  return aiTools;
}
