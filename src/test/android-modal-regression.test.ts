import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

describe('Android modal and sheet regressions', () => {
  it('keeps Android bottom sheets inside the safe visible area', () => {
    const css = readProjectFile('src/styles/android-adaptive.css');

    expect(css).toContain('--android-safe-top');
    expect(css).toContain('--android-safe-bottom');
    expect(css).toContain('.android-native .ui-detail-overlay');
    expect(css).toContain('.android-native .ui-voice-assistant-overlay');
    expect(css).toContain('.android-native .ui-app-modal');
    expect(css).toContain('.android-native .ui-detail-sheet');
    expect(css).toContain('.android-native .ui-voice-assistant-panel');
    expect(css).toContain('.android-native .ui-app-modal-panel[data-bottom-sheet="true"]');
    expect(css).toContain('height: 100dvh !important;');
    expect(css).toContain('padding: 0 !important;');
    expect(css).toContain('--android-modal-gap');
    expect(css).toContain('height: calc(100dvh - var(--android-safe-top) - var(--android-safe-bottom) - var(--android-modal-gap)) !important;');
    expect(css).toContain('margin: 0 auto var(--android-safe-bottom) !important;');
    expect(css).toContain('position: relative !important;');
    expect(css).toContain('min-height: 0 !important;');
    expect(css).toContain('flex: 0 0 auto !important;');
  });

  it('does not nest a fixed detail sheet inside a fixed Android overlay', () => {
    const rewardPage = readProjectFile('src/pages/Rewards.tsx');

    expect(rewardPage).toContain('ui-detail-sheet relative');
    expect(rewardPage).not.toContain('ui-detail-sheet fixed bottom-0 left-0 right-0');
  });

  it('marks all shared detail and assistant surfaces as Android bottom sheets', () => {
    const files = [
      'src/components/AppModal.tsx',
      'src/components/VoiceAssistant.tsx',
      'src/pages/Tasks.tsx',
      'src/pages/Rewards.tsx',
      'src/pages/HabitRewards.tsx',
    ];

    for (const file of files) {
      expect(readProjectFile(file), file).toContain('data-bottom-sheet');
    }
  });
});
