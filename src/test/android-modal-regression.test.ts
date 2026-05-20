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
    expect(css).toContain('max-height: calc(100svh - var(--android-safe-top) - 8px) !important;');
    expect(css).toContain('padding-bottom: calc(5.5rem + var(--android-safe-bottom)) !important;');
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
