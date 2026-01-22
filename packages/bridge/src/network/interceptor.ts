/**
 * NetworkInterceptor
 *
 * Intercepts fetch and XMLHttpRequest to track network requests.
 */

import type { NetworkRequest, NetworkResponse, MockConfig } from '../types';

type RequestCallback = (request: NetworkRequest) => void;
type ResponseCallback = (requestId: string, response: NetworkResponse) => void;
type ErrorCallback = (requestId: string, error: string) => void;

export class NetworkInterceptor {
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: any = null;
  private originalXHRSend: any = null;
  private mocks: Map<string, MockConfig> = new Map();
  private installed: boolean = false;

  onRequest: RequestCallback | null = null;
  onResponse: ResponseCallback | null = null;
  onError: ErrorCallback | null = null;

  /**
   * Install the interceptor
   */
  install(): void {
    if (this.installed) return;

    this.interceptFetch();
    this.interceptXHR();
    this.installed = true;
  }

  /**
   * Uninstall the interceptor
   */
  uninstall(): void {
    if (!this.installed) return;

    if (this.originalFetch) {
      (global as any).fetch = this.originalFetch;
      this.originalFetch = null;
    }

    if (this.originalXHROpen && this.originalXHRSend) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      XMLHttpRequest.prototype.send = this.originalXHRSend;
      this.originalXHROpen = null;
      this.originalXHRSend = null;
    }

    this.installed = false;
  }

  /**
   * Add a mock response
   */
  addMock(pattern: string, config: MockConfig): void {
    this.mocks.set(pattern, config);
  }

  /**
   * Remove a mock
   */
  removeMock(pattern: string): void {
    this.mocks.delete(pattern);
  }

  /**
   * Clear all mocks
   */
  clearMocks(): void {
    this.mocks.clear();
  }

  /**
   * Check if a URL matches any mock pattern
   */
  private findMock(url: string): MockConfig | null {
    for (const [pattern, config] of this.mocks) {
      if (url.includes(pattern) || new RegExp(pattern).test(url)) {
        return config;
      }
    }
    return null;
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Intercept fetch
   */
  private interceptFetch(): void {
    this.originalFetch = (global as any).fetch;

    (global as any).fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const id = this.generateId();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';

      // Track request
      const request: NetworkRequest = {
        id,
        url,
        method,
        headers: this.headersToRecord(init?.headers),
        body: init?.body?.toString(),
        timestamp: new Date().toISOString(),
      };

      this.onRequest?.(request);

      // Check for mock
      const mock = this.findMock(url);
      if (mock) {
        if (mock.delay) {
          await new Promise((r) => setTimeout(r, mock.delay));
        }

        const mockResponse = new Response(
          typeof mock.body === 'object' ? JSON.stringify(mock.body) : mock.body,
          {
            status: mock.status || 200,
            statusText: mock.statusText || 'OK',
            headers: mock.headers,
          }
        );

        const response: NetworkResponse = {
          id,
          status: mockResponse.status,
          statusText: mockResponse.statusText,
          headers: this.headersToRecord(mockResponse.headers),
          body: typeof mock.body === 'object' ? JSON.stringify(mock.body) : mock.body,
          duration: mock.delay || 0,
        };

        this.onResponse?.(id, response);
        return mockResponse;
      }

      // Make actual request
      const startTime = Date.now();

      try {
        const fetchResponse = await this.originalFetch!(input, init);
        const clone = fetchResponse.clone();

        // Track response
        const responseBody = await clone.text();
        const response: NetworkResponse = {
          id,
          status: fetchResponse.status,
          statusText: fetchResponse.statusText,
          headers: this.headersToRecord(fetchResponse.headers),
          body: responseBody,
          duration: Date.now() - startTime,
        };

        this.onResponse?.(id, response);
        return fetchResponse;
      } catch (error) {
        this.onError?.(id, error instanceof Error ? error.message : String(error));
        throw error;
      }
    };
  }

  /**
   * Intercept XMLHttpRequest
   */
  private interceptXHR(): void {
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;

    const self = this;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ) {
      (this as any).__agentExpo = {
        id: self.generateId(),
        method,
        url: url.toString(),
        startTime: 0,
      };

      return self.originalXHROpen.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function (body?: any) {
      const info = (this as any).__agentExpo;
      if (info) {
        info.startTime = Date.now();

        const request: NetworkRequest = {
          id: info.id,
          url: info.url,
          method: info.method,
          headers: {},
          body: body?.toString(),
          timestamp: new Date().toISOString(),
        };

        self.onRequest?.(request);

        const originalOnReadyStateChange = this.onreadystatechange;
        this.onreadystatechange = function (ev) {
          if (this.readyState === 4) {
            const response: NetworkResponse = {
              id: info.id,
              status: this.status,
              statusText: this.statusText,
              headers: self.parseXHRHeaders(this.getAllResponseHeaders()),
              body: this.responseText,
              duration: Date.now() - info.startTime,
            };

            self.onResponse?.(info.id, response);
          }

          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.call(this, ev);
          }
        };

        this.onerror = function (ev) {
          self.onError?.(info.id, 'Network error');
        };
      }

      return self.originalXHRSend.call(this, body);
    };
  }

  /**
   * Convert Headers object to Record
   */
  private headersToRecord(headers?: any): Record<string, string> {
    const result: Record<string, string> = {};

    if (!headers) return result;

    if (headers instanceof Headers) {
      headers.forEach((value: string, key: string) => {
        result[key] = value;
      });
    } else if (Array.isArray(headers)) {
      for (const [key, value] of headers) {
        result[key] = value;
      }
    } else {
      Object.assign(result, headers);
    }

    return result;
  }

  /**
   * Parse XHR response headers string
   */
  private parseXHRHeaders(headersString: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = headersString.trim().split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        result[key] = value;
      }
    }

    return result;
  }
}
