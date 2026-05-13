export type ProductHuntEventName =
  | 'ph_landing_view'
  | 'ph_demo_start'
  | 'ph_demo_family_profile_view'
  | 'ph_demo_ai_plan_view'
  | 'ph_demo_tasks_generated'
  | 'ph_demo_task_completed'
  | 'ph_demo_wish_redeemed'
  | 'ph_demo_parent_promise_view'
  | 'ph_demo_weekly_report_view'
  | 'ph_waitlist_join'
  | 'ph_pricing_plus_click'
  | 'ph_pricing_pro_click'
  | 'ph_gallery_frames_click'
  | 'ph_full_guest_app_click'
  | 'ph_demo_reset';

export interface ProductHuntEvent {
  name: ProductHuntEventName;
  data: Record<string, unknown>;
  createdAt: string;
}

const STORAGE_KEY = 'wishcard.productHuntEvents.v1';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    plausible?: (eventName: string, options?: { props?: Record<string, unknown> }) => void;
  }
}

export function recordProductHuntEvent(
  name: ProductHuntEventName,
  data: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;

  const event: ProductHuntEvent = {
    name,
    data: {
      source: 'product_hunt_demo',
      path: window.location.pathname,
      ...data,
    },
    createdAt: new Date().toISOString(),
  };

  persistEvent(event);
  window.dispatchEvent(new CustomEvent('wishcard:product-hunt-event', { detail: event }));

  window.dataLayer?.push({
    event: name,
    ...event.data,
  });
  window.gtag?.('event', name, event.data);
  window.plausible?.(name, { props: event.data });
}

export function readProductHuntEvents(): ProductHuntEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEvent(event: ProductHuntEvent): void {
  try {
    const events = readProductHuntEvents();
    events.push(event);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-100)));
  } catch {
    // Analytics must never break the Product Hunt demo.
  }
}

