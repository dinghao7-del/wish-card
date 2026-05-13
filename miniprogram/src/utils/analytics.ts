export function trackShareEvent(_event: string, _payload?: Record<string, unknown>) {}

export const shareTracking = {
  track: trackShareEvent,
};

export default {
  trackShareEvent,
  shareTracking,
};
