/**
 * Forest Family 小程序 - 庆祝动画组件
 * 对齐 Web 端 src/components/CelebrationAnimation.tsx
 *
 * 差异说明：
 * - Web 使用 framer-motion → 小程序使用 CSS keyframe 动画
 * - Web 使用 AudioContext → 小程序使用 Taro.vibrateShort() 震动反馈
 * - Web 使用 window.innerWidth/Height → 小程序使用 100vw/vh
 * - 粒子数量从20减少到12（性能优化）
 */

import { View, Text } from '@tarojs/components';
import { useState, useEffect, useRef } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import './index.scss';

interface CelebrationAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
  type: 'reward' | 'habit' | 'penalty';
  title?: string;
  subtitle?: string;
  stars?: number;
}

export function CelebrationAnimation({
  isVisible,
  onComplete,
  type,
  title = '成功！',
  subtitle = '太棒了！',
  stars = 0,
}: CelebrationAnimationProps) {
  const [show, setShow] = useState(isVisible);
  const audioPlayed = useRef(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      audioPlayed.current = false;

      // 震动反馈（替代 Web AudioContext）
      if (!audioPlayed.current) {
        try {
          if (type === 'reward') {
            Taro.vibrateShort({ type: 'heavy' });
          } else if (type === 'habit') {
            Taro.vibrateShort({ type: 'medium' });
          } else {
            Taro.vibrateShort({ type: 'light' });
          }
        } catch {}
        audioPlayed.current = true;
      }

      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete, type]);

  const isReward = type === 'reward';
  const isHabit = type === 'habit';
  const isPenalty = type === 'penalty';

  // 背景渐变色
  const bgStyle = isReward
    ? 'radial-gradient(circle at center, rgba(255,215,0,0.2) 0%, transparent 70%)'
    : isHabit
    ? 'radial-gradient(circle at center, rgba(76,175,80,0.2) 0%, transparent 70%)'
    : 'radial-gradient(circle at center, rgba(244,67,54,0.2) 0%, transparent 70%)';

  // 主题色
  const themeColor = isReward ? '#FFD54F' : isHabit ? '#81C784' : '#E57373';
  const themeColorDeep = isReward ? '#FFA000' : isHabit ? '#2E7D32' : '#C62828';
  const particleColor = isReward ? '#FFD54F' : isHabit ? '#81C784' : '#E57373';

  // 中心图标
  const iconName = isReward ? 'trophy' : isHabit ? 'checkCircle' : 'zap';

  // 粒子数据（12个，性能优化）
  const particles = Array.from({ length: 12 }, (_, i) => ({
    angle: i * 30,
    delay: (i % 4) * 0.08,
    size: 8 + (i % 3) * 4,
    isStar: i % 3 === 0,
    isCircle: i % 3 === 2,
  }));

  if (!show) return null;

  return (
    <View className="celebration-overlay" style={{ background: bgStyle }}>
      {/* 中心爆发效果 */}
      <View className="celebration-center">
        {/* 外圈脉冲（对齐 Web L116-128） */}
        <View
          className="celebration-pulse"
          style={{ borderColor: `${themeColor}50` }}
        />

        {/* 中心图标（对齐 Web L131-152） */}
        <View
          className="celebration-icon-circle"
          style={{
            background: `linear-gradient(135deg, ${themeColor}, ${themeColorDeep})`,
          }}
        >
          <Icon name={iconName} size={64} color="#ffffff" />
        </View>

        {/* 粒子爆炸（对齐 Web L155-209） */}
        {particles.map((p, i) => (
          <View
            key={i}
            className={`celebration-particle particle-${i}`}
            style={{
              animationDelay: `${p.delay}s`,
            }}
          >
            {p.isStar ? (
              <Icon name="star" size={p.size * 2} color={particleColor} />
            ) : p.isCircle ? (
              <View
                className="particle-dot"
                style={{
                  width: `${p.size}rpx`,
                  height: `${p.size}rpx`,
                  backgroundColor: particleColor,
                }}
              />
            ) : (
              <Icon name="sparkles" size={p.size * 2} color={particleColor} />
            )}
          </View>
        ))}

        {/* 旋转光环（对齐 Web L212-228） */}
        <View
          className="celebration-ring"
          style={{ borderColor: `${themeColor}50` }}
        />
      </View>

      {/* 文字动画（对齐 Web L232-263） */}
      <View className="celebration-text">
        <Text className="celebration-title" style={{ color: themeColorDeep }}>
          {title}
        </Text>
        <Text className="celebration-subtitle">{subtitle}</Text>

        {stars > 0 && (
          <View className="celebration-stars">
            <Icon name="star" size={40} color="#F9A825" />
            <Text className="celebration-stars-value" style={{ color: themeColorDeep }}>
              +{stars}
            </Text>
          </View>
        )}
      </View>

      {/* 背景星星装饰（对齐 Web L266-287） */}
      {Array.from({ length: 8 }, (_, i) => (
        <View
          key={`bg-star-${i}`}
          className={`celebration-bg-star bg-star-${i}`}
        >
          <Icon name="star" size={20 + (i % 3) * 8} color={`${themeColor}40`} />
        </View>
      ))}
    </View>
  );
}

export default CelebrationAnimation;
