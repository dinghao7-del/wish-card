/**
 * 统一头像组件
 * 支持：图片 URL、文字头像规格字符串（text:char,bg,color）
 */
import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

// 解析头像规格字符串: text:红,#FF6B6B,#FFF
function parseSpec(src: string): { char: string; bgColor: string; textColor: string } | null {
  if (!src || !src.startsWith('text:')) return null;
  const body = src.slice(5); // 去掉 'text:'
  const parts = body.split(',');
  if (parts.length >= 3) {
    return { char: parts[0], bgColor: parts[1], textColor: parts[2] };
  }
  return null;
}

// 根据名字生成稳定颜色
function getColorFromName(name: string): string {
  const colors = ['#FF6B6B','#FFA726','#66BB6A','#42A5F5','#AB47BC','#EC407A','#26C6DA','#8D6E63'];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const spec = parseSpec(src || '');
  const [imgError, setImgError] = useState(false);

  // 如果是文字头像规格字符串，渲染文字头像
  if (spec) {
    return (
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold flex-shrink-0",
          sizeMap[size],
          className
        )}
        style={{ backgroundColor: spec.bgColor, color: spec.textColor }}
      >
        {spec.char}
      </div>
    );
  }

  // 如果是图片 URL 且加载未失败，使用 img 标签
  if (src && !imgError && !src.startsWith('data:')) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        className={cn("rounded-full object-cover flex-shrink-0", sizeMap[size], className)}
        onError={() => setImgError(true)}
      />
    );
  }

  // 降级：显示文字头像
  const char = name ? name.charAt(0).toUpperCase() : '?';
  const bgColor = name ? getColorFromName(name) : '#42A5F5';
  const textColor = ['#FFEE58','#FFF176','#66BB6A'].includes(bgColor) ? '#333' : '#FFF';

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold flex-shrink-0",
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {char}
    </div>
  );
}
