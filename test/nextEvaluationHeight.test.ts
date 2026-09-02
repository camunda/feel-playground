import { describe, expect, it } from 'vitest';

import { nextEvaluationHeight } from '../src/core/nextEvaluationHeight';

describe('nextEvaluationHeight', () => {

  it('should use the proposed height after moving', () => {

    // when
    const height = nextEvaluationHeight({
      startHeight: 180,
      minimum: 40,
      maximum: 300,
      openHeight: 200,
      moved: true
    });

    // then
    expect(height).to.equal(180);
  });


  it('should clamp the height to the minimum', () => {

    // when
    const height = nextEvaluationHeight({
      startHeight: 20,
      minimum: 40,
      maximum: 300,
      openHeight: 200,
      moved: true
    });

    // then
    expect(height).to.equal(40);
  });


  it('should clamp the height to the maximum', () => {

    // when
    const height = nextEvaluationHeight({
      startHeight: 400,
      minimum: 40,
      maximum: 300,
      openHeight: 200,
      moved: true
    });

    // then
    expect(height).to.equal(300);
  });


  it('should restore the open height when clicking a collapsed result', () => {

    // when
    const height = nextEvaluationHeight({
      startHeight: 40,
      minimum: 40,
      maximum: 300,
      openHeight: 200,
      moved: false
    });

    // then
    expect(height).to.equal(200);
  });


  it('should collapse when clicking an open result', () => {

    // when
    const height = nextEvaluationHeight({
      startHeight: 200,
      minimum: 40,
      maximum: 300,
      openHeight: null,
      moved: false
    });

    // then
    expect(height).to.equal(40);
  });
});