import test from 'node:test';
import assert from 'node:assert/strict';
import { builtInGuide, guideGreeting, guideQuickTopics } from '../src/game/guide-knowledge.mjs';
import { siteInfo } from '../src/game/site-info.mjs';

test('the supplied contract and buy destination identify the same token', () => {
  assert.equal(siteInfo.contract, '0xc4a86cC4e5958440A7Ca3f4053B7C2497a032fB3');
  assert.equal(new URL(siteInfo.buyUrl).pathname.split('/').at(-1), siteInfo.contract.toLowerCase());
});

test('brand mentions do not override token and social questions', () => {
  assert.ok(builtInGuide('What is the Purrvival CA?').includes(siteInfo.contract));
  assert.ok(builtInGuide('How do I buy PURRZ?').includes(siteInfo.buyUrl));
  for (const question of ['Purrvival Telegram link?', 'What is the official X handle?']) {
    const answer = builtInGuide(question);
    assert.ok(answer.includes(siteInfo.telegramUrl));
    assert.ok(answer.includes(siteInfo.xUrl));
  }
});

test('future games and the level creator are described as coming soon', () => {
  const future = builtInGuide('Will there be more games with EIRA and Pur Pur?');
  assert.match(future, /coming soon/i);
  assert.match(future, /EIRA and Pur Pur/);
  assert.match(builtInGuide('Can I playtest my own level and share it with friends?'), /aren’t open yet/);
});

test('specific gameplay and profile help wins over generic challenge matching', () => {
  assert.match(builtInGuide('I am stuck on stage 5 in the challenge'), /drag Pur Pur/);
  assert.match(builtInGuide('How do I end my challenge?'), /cannot be resumed/);
  assert.match(builtInGuide('What wallet and handle do I need for the challenge?'), /active X handle and non-zero EVM wallet/);
  assert.match(builtInGuide('Can I edit my score in the database?'), /can’t directly write database scores/);
});

test('rewards remain a plan and do not claim a fixed or guaranteed payout', () => {
  const answer = builtInGuide('What PURRZ rewards can I receive each week?');
  assert.match(answer, /plan is weekly incentives/);
  assert.match(answer, /no fixed amount or guaranteed payout/);
  assert.doesNotMatch(answer, /token address.*not.*confirmed/i);
});

test('the greeting and quick topics expose the updated Purrvival information', () => {
  assert.match(guideGreeting, /Pur Pur.*EIRA/);
  for (const label of ['BUY $PURRZ', 'Rewards & token', 'More games coming?', 'Community links']) {
    assert.ok(guideQuickTopics.some(topic => topic.label === label));
  }
  assert.ok(guideQuickTopics.every(topic => builtInGuide(topic.label) === topic.answer));
});
