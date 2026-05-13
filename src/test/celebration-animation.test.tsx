import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CelebrationAnimation } from '../components/CelebrationAnimation';

class MockAudioContext {
  currentTime = 0;

  createOscillator() {
    return {
      connect: vi.fn(),
      frequency: { value: 0 },
      type: 'sine',
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
  }

  destination = {};
}

describe('CelebrationAnimation', () => {
  it('心愿兑换显示消耗积分，而不是获得积分', () => {
    vi.stubGlobal('AudioContext', MockAudioContext);

    render(
      <CelebrationAnimation
        isVisible
        type="reward"
        title="兑换成功"
        subtitle="看电视"
        stars={30}
      />,
    );

    expect(screen.getByText('兑换成功')).toBeInTheDocument();
    expect(screen.getByText('消耗 30')).toBeInTheDocument();
    expect(screen.queryByText('+30')).not.toBeInTheDocument();
  }, 10000);

  it('任务完成仍显示获得积分', () => {
    vi.stubGlobal('AudioContext', MockAudioContext);

    render(
      <CelebrationAnimation
        isVisible
        type="habit"
        title="打卡成功"
        subtitle="继续加油"
        stars={15}
      />,
    );

    expect(screen.getByText('+15')).toBeInTheDocument();
  });
});
