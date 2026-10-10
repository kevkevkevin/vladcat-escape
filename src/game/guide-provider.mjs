export async function requestGuide({ key, model, instructions, question, history, fetcher = fetch }) {
  const response = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, instructions, input: [...history, { role: 'user', content: question }], max_output_tokens: 300, store: false }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Live guide unavailable');
  const body = await response.json();
  const reply = (body.output ?? []).filter(item => item.type === 'message').flatMap(item => item.content ?? []).filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim();
  if (!reply) throw new Error('No guide reply');
  return reply.slice(0, 2000);
}
