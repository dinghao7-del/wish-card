import React from 'react';
import {
  Activity,
  AlertCircle,
  Angry,
  BookOpen,
  Box,
  Brush,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  DoorOpen,
  Eye,
  Gift,
  Heart,
  HeartHandshake,
  Home,
  ListTodo,
  Shield,
  Shirt,
  Smile,
  Sparkles,
  Star,
  Trash2,
  Trees,
  TrendingDown,
  TrendingUp,
  Trophy,
  Tv,
  User,
  Users,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export const TASK_ICON_REGISTRY = {
  Activity,
  AlertCircle,
  Angry,
  BookOpen,
  Box,
  Brush,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  DoorOpen,
  Eye,
  Gift,
  Heart,
  HeartHandshake,
  Home,
  ListTodo,
  Shield,
  Shirt,
  Smile,
  Sparkles,
  Star,
  Trash2,
  Trees,
  TrendingDown,
  TrendingUp,
  Trophy,
  Tv,
  User,
  Users,
  Utensils,
  Wallet,
} satisfies Record<string, LucideIcon>;

export function getRegisteredTaskIcon(iconName?: string | null): LucideIcon | null {
  if (!iconName) return null;
  return TASK_ICON_REGISTRY[iconName as keyof typeof TASK_ICON_REGISTRY] ?? null;
}

export function renderRegisteredTaskIcon(
  iconName: string | null | undefined,
  options: { size?: number; className?: string; fallback?: LucideIcon } = {}
) {
  const { size = 24, className, fallback: Fallback = ListTodo } = options;
  const Icon = getRegisteredTaskIcon(iconName) ?? Fallback;
  return <Icon size={size} className={className} />;
}
