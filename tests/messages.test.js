import { describe, it, expect } from 'vitest';
import { buildLunchCard } from '../server/slack/messages.js';

const baseParams = {
  restaurant: { name: 'Chipotle', cuisine: 'Mexican' },
  deadlineAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  rsvpCount: 0,
  sessionId: 1,
  mode: 'random',
  doordashUrl: 'https://doordash.com/group/abc',
};

describe('buildLunchCard', () => {
  it('includes restaurant name in the card', () => {
    const blocks = buildLunchCard(baseParams);
    const text = JSON.stringify(blocks);
    expect(text).toContain('Chipotle');
  });

  it('includes DoorDash URL as a button', () => {
    const blocks = buildLunchCard(baseParams);
    const text = JSON.stringify(blocks);
    expect(text).toContain('https://doordash.com/group/abc');
  });

  it('includes rsvp count', () => {
    const blocks = buildLunchCard({ ...baseParams, rsvpCount: 3 });
    const text = JSON.stringify(blocks);
    expect(text).toContain('3');
  });

  it('includes spin again button only in random mode', () => {
    const randomBlocks = JSON.stringify(buildLunchCard({ ...baseParams, mode: 'random' }));
    const manualBlocks = JSON.stringify(buildLunchCard({ ...baseParams, mode: 'manual' }));
    expect(randomBlocks).toContain('spin_again');
    expect(manualBlocks).not.toContain('spin_again');
  });

  it('includes deadline countdown text', () => {
    const blocks = buildLunchCard(baseParams);
    const text = JSON.stringify(blocks);
    expect(text).toMatch(/Order by/);
  });
});
