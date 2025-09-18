import { describe, expect, it } from 'vitest';
import { ensureAffiliateTag } from './amazon';

describe('ensureAffiliateTag', () => {
  it('appends tag when missing', () => {
    expect(ensureAffiliateTag('https://amazon.com/dp/B0TEST')).toContain('tag=jmpkc01-20');
  });

  it('preserves existing tag', () => {
    expect(ensureAffiliateTag('https://amazon.com/dp/B0TEST?tag=custom')).toContain('tag=custom');
  });
});
