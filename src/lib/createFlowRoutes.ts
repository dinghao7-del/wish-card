export type CreationKind = 'task' | 'habit' | 'reward';

export type CreationRouteOptions = {
  planId?: string | null;
  planName?: string | null;
  fromMode?: 'target' | 'habit' | string | null;
};

function appendParams(path: string, params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export function getCreationTemplateRoute(kind: CreationKind, options: CreationRouteOptions = {}): string {
  if (kind === 'reward') {
    return appendParams('/rewards/templates', {
      planId: options.planId,
      planName: options.planName,
    });
  }

  return appendParams('/tasks/templates', {
    planId: options.planId,
    planName: options.planName,
    fromMode: kind === 'habit' ? 'habit' : options.fromMode || 'target',
  });
}

export function getCustomCreationRoute(kind: CreationKind, options: CreationRouteOptions = {}): string {
  if (kind === 'reward') {
    return appendParams('/rewards/new', {
      planId: options.planId,
      planName: options.planName,
    });
  }

  return appendParams('/tasks/new', {
    planId: options.planId,
    planName: options.planName,
  });
}
