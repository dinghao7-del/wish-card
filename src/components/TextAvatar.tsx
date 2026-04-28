import React from 'react';
import { cn } from '../lib/utils';

interface TextAvatarProps {
  name?: string;        // 名字（用于文字头像或 alt）
  src?: string;         // 头像图片路径（优先使用）
  size?: number;        // 直径 px
  className?: string;
}

export function TextAvatar({ name = '?', src, size = 56, className }: TextAvatarProps) {
  // 如果传了 src（本地路径或 data URL），显示为图片
  if (src) {
    return (
      <div className={cn('rounded-full overflow-hidden shrink-0 select-none bg-surface-container', className)} style={{ width: size, height: size }}>
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // 图片加载失败，回退到文字头像
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // 否则显示文字头像（向后兼容）
  const char = name.charAt(0).toUpperCase();
  const COLORS = ['#FF6B6B','#FFA726','#66BB6A','#42A5F5','#AB47BC','#EC407A','#26C6DA','#8D6E63'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const bgColor = COLORS[Math.abs(hash) % COLORS.length];
  const textColor = ['#FFEE58','#FFF176','#66BB6A'].includes(bgColor) ? '#333' : '#FFF';
  const fontSize = Math.round(size * 0.45);

  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold shrink-0 select-none', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: textColor,
        fontSize,
      }}
    >
      {char}
    </div>
  );
}
