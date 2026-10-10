import test from 'node:test';
import assert from 'node:assert/strict';
import { requestGuide } from '../src/game/guide-provider.mjs';
test('live guide bounds output, disables storage and extracts text after non-message outputs', async () => {
  let payload;
  const reply = await requestGuide({ key: 'unit-test-only', model: 'gpt-4.1-mini', instructions: 'Game guide only', question: 'How do I jump?', history: [{ role: 'assistant', content: 'Need a paw?' }], fetcher: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, 'Bearer unit-test-only');
    payload = JSON.parse(options.body);
    return Response.json({ output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text: 'Press ↑.' }, { type: 'output_text', text: 'Quick paws!' }] }] });
  } });
  assert.equal(reply, 'Press ↑.\nQuick paws!');
  assert.equal(payload.store, false); assert.equal(payload.max_output_tokens, 300);
  assert.equal(payload.instructions, 'Game guide only');
  assert.deepEqual(payload.input, [{ role: 'assistant', content: 'Need a paw?' }, { role: 'user', content: 'How do I jump?' }]);
});
test('provider errors and empty output fail without exposing provider response details', async () => {
  const args = { key: 'unit-test-only', model: 'gpt-4.1-mini', instructions: '', question: '?', history: [] };
  await assert.rejects(requestGuide({ ...args, fetcher: async () => new Response('private provider detail', { status: 429 }) }), /^Error: Live guide unavailable$/);
  await assert.rejects(requestGuide({ ...args, fetcher: async () => Response.json({ output: [] }) }), /No guide reply/);
});
