import {
  success,
  error,
  ErrorCode,
  isSuccess,
  isError,
  serializeResponse,
  parseResponse,
} from '../responses';

describe('Response Utilities', () => {
  describe('success', () => {
    it('should create success response', () => {
      const response = success('test-id', { data: 'value' });

      expect(response.id).toBe('test-id');
      expect(response.success).toBe(true);
      if (isSuccess(response)) {
        expect(response.data).toEqual({ data: 'value' });
      }
    });

    it('should handle various data types', () => {
      const nullResponse = success('id', null);
      const numResponse = success('id', 42);
      const strResponse = success('id', 'string');
      const arrResponse = success('id', [1, 2, 3]);

      if (isSuccess(nullResponse)) expect(nullResponse.data).toBeNull();
      if (isSuccess(numResponse)) expect(numResponse.data).toBe(42);
      if (isSuccess(strResponse)) expect(strResponse.data).toBe('string');
      if (isSuccess(arrResponse)) expect(arrResponse.data).toEqual([1, 2, 3]);
    });
  });

  describe('error', () => {
    it('should create error response', () => {
      const response = error('test-id', 'Not found', ErrorCode.ELEMENT_NOT_FOUND);

      expect(response.id).toBe('test-id');
      expect(response.success).toBe(false);
      expect(response.error).toBe('Not found');
      expect(response.code).toBe(ErrorCode.ELEMENT_NOT_FOUND);
    });

    it('should handle error without code', () => {
      const response = error('test-id', 'Something went wrong');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
      expect(response.code).toBeUndefined();
    });

    it('should include details when provided', () => {
      const details = { field: 'username', reason: 'invalid' };
      const response = error('test-id', 'Validation failed', ErrorCode.INVALID_COMMAND, details);

      expect(response.details).toEqual(details);
    });
  });

  describe('isSuccess', () => {
    it('should identify success responses', () => {
      const successResponse = success('id', {});
      expect(isSuccess(successResponse)).toBe(true);
    });

    it('should reject error responses', () => {
      const errorResponse = error('id', 'error');
      // isError and isSuccess work on the runtime value, not types
      expect(isSuccess(errorResponse as never)).toBe(false);
    });
  });

  describe('isError', () => {
    it('should identify error responses', () => {
      const errorResponse = error('id', 'error');
      expect(isError(errorResponse as never)).toBe(true);
    });

    it('should reject success responses', () => {
      const successResponse = success('id', {});
      expect(isError(successResponse)).toBe(false);
    });
  });

  describe('serializeResponse', () => {
    it('should serialize success response to JSON with newline', () => {
      const response = success('id', { value: 1 });
      const serialized = serializeResponse(response);

      expect(serialized).toBe('{"id":"id","success":true,"data":{"value":1}}\n');
    });

    it('should serialize error response to JSON with newline', () => {
      const response = error('id', 'failed');
      const serialized = serializeResponse(response as never);

      expect(serialized).toContain('"success":false');
      expect(serialized).toContain('"error":"failed"');
      expect(serialized.endsWith('\n')).toBe(true);
    });
  });

  describe('parseResponse', () => {
    it('should parse success response from JSON', () => {
      const json = '{"id":"id","success":true,"data":{"value":1}}';
      const response = parseResponse<{ value: number }>(json);

      expect(response.success).toBe(true);
      if (isSuccess(response)) {
        expect(response.data.value).toBe(1);
      }
    });

    it('should parse error response from JSON', () => {
      const json = '{"id":"id","success":false,"error":"failed","code":"TIMEOUT"}';
      const response = parseResponse(json);

      expect(response.success).toBe(false);
      if (isError(response)) {
        expect(response.error).toBe('failed');
        expect(response.code).toBe('TIMEOUT');
      }
    });

    it('should handle JSON with whitespace', () => {
      const json = '  {"id":"id","success":true,"data":{}}  \n';
      const response = parseResponse(json);

      expect(response.success).toBe(true);
    });
  });

  describe('ErrorCode', () => {
    it('should have expected error codes', () => {
      expect(ErrorCode.UNKNOWN).toBe('UNKNOWN');
      expect(ErrorCode.INVALID_COMMAND).toBe('INVALID_COMMAND');
      expect(ErrorCode.TIMEOUT).toBe('TIMEOUT');
      expect(ErrorCode.DEVICE_NOT_FOUND).toBe('DEVICE_NOT_FOUND');
      expect(ErrorCode.APP_NOT_INSTALLED).toBe('APP_NOT_INSTALLED');
      expect(ErrorCode.ELEMENT_NOT_FOUND).toBe('ELEMENT_NOT_FOUND');
      expect(ErrorCode.BRIDGE_NOT_CONNECTED).toBe('BRIDGE_NOT_CONNECTED');
      expect(ErrorCode.ASSERTION_FAILED).toBe('ASSERTION_FAILED');
      expect(ErrorCode.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
    });
  });

  describe('Round-trip serialization', () => {
    it('should round-trip success response', () => {
      const original = success('test', { nested: { value: [1, 2, 3] } });
      const serialized = serializeResponse(original);
      const parsed = parseResponse(serialized);

      expect(parsed).toEqual(original);
    });

    it('should round-trip error response', () => {
      const original = error('test', 'error message', ErrorCode.UNKNOWN, {
        extra: 'info',
      });
      const serialized = serializeResponse(original as never);
      const parsed = parseResponse(serialized);

      expect(parsed).toEqual(original);
    });
  });
});
