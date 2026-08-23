import { describe, expect, it } from 'vitest';
import {
  homeAssistantWebSocketUrl,
  normalizeHomeAssistantUrl,
} from '../apps/studio/src/home-assistant-connection';

describe('FRAKON Studio Home Assistant connection helpers', () => {
  it('normalizes a local Home Assistant address without a protocol', () => {
    expect(normalizeHomeAssistantUrl('homeassistant.local:8123')).toBe('http://homeassistant.local:8123');
  });

  it('converts http to the Home Assistant websocket endpoint', () => {
    expect(homeAssistantWebSocketUrl('http://homeassistant.local:8123')).toBe('ws://homeassistant.local:8123/api/websocket');
  });

  it('converts https to secure websocket and preserves a reverse-proxy base path', () => {
    expect(homeAssistantWebSocketUrl('https://example.test/ha/')).toBe('wss://example.test/ha/api/websocket');
  });

  it('rejects unsupported protocols', () => {
    expect(() => normalizeHomeAssistantUrl('ftp://example.test')).toThrow(/http:\/\/ or https:\/\//);
  });
});
