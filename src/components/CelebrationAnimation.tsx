import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

// 音效播放函数
const playSound = (type: 'reward' | 'habit' | 'penalty') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 根据类型播放不同的音效
    if (type === 'reward') {
      // 奖励兑换：上升音调的成功音效
      playTone(audioContext, 523.25, 0.1, 'sine'); // C5
      setTimeout(() => playTone(audioContext, 659.25, 0.1, 'sine'), 100); // E5
      setTimeout(() => playTone(audioContext, 783.99, 0.2, 'sine'), 200); // G5
    } else if (type === 'habit') {
      // 习惯打卡：清脆的完成音效
      playTone(audioContext, 880, 0.15, 'sine'); // A5
      setTimeout(() => playTone(audioContext, 1108.73, 0.15, 'sine'), 150); // C#6
    } else {
      // 惩罚打卡：警示音效
      playTone(audioContext, 440, 0.2, 'square'); // A4
      setTimeout(() => playTone(audioContext, 349.23, 0.3, 'square'), 200); // F4
    }
  } catch (error) {
    console.log('音效播放失败:', error);
  }
};

// 播放单个音调
const playTone = (
  audioContext: AudioContext, 
  frequency: number, 
  duration: number, 
  type: OscillatorType
) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

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
  stars = 0 
}: CelebrationAnimationProps) {
  const [show, setShow] = useState(isVisible);
  const audioPlayed = useRef(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      audioPlayed.current = false;
      
      // 播放音效
      if (!audioPlayed.current) {
        playSound(type);
        audioPlayed.current = true;
      }
      
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete, type]);

  const isReward = type === 'reward';
  const isHabit = type === 'habit';
  const isPenalty = type === 'penalty';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          style={{
            background: isReward 
              ? 'radial-gradient(circle at center, rgba(255,215,0,0.2) 0%, transparent 70%)'
              : isHabit
              ? 'radial-gradient(circle at center, rgba(76,175,80,0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(244,67,54,0.2) 0%, transparent 70%)'
          }}
        >
          {/* 中心爆发效果 */}
          <div className="relative flex items-center justify-center">
            {/* 外圈脉冲 */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ 
                scale: [0, 2.5, 3],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn(
                "absolute inset-0 rounded-full",
                isReward ? "bg-yellow-400/30" : isHabit ? "bg-green-400/30" : "bg-red-400/30"
              )}
              style={{ width: 200, height: 200, marginLeft: -100, marginTop: -100 }}
            />

            {/* 中心图标 */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.2, 1],
                rotate: [0, 10, 0]
              }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              className={cn(
                "relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl",
                isReward ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
                isHabit ? "bg-gradient-to-br from-green-400 to-emerald-600" :
                "bg-gradient-to-br from-red-400 to-pink-600"
              )}
            >
              {isReward ? (
                <Trophy size={64} className="text-white drop-shadow-lg" strokeWidth={2.5} />
              ) : isHabit ? (
                <CheckCircle2 size={64} className="text-white drop-shadow-lg" strokeWidth={2.5} />
              ) : (
                <Zap size={64} className="text-white drop-shadow-lg" strokeWidth={2.5} />
              )}
            </motion.div>

            {/* 粒子爆炸效果 */}
            {[...Array(20)].map((_, i) => {
              const angle = (i * 18) * Math.PI / 180;
              const distance = 120 + Math.random() * 80;
              const size = 8 + Math.random() * 16;
              const delay = Math.random() * 0.3;
              
              return (
                <motion.div
                  key={i}
                  initial={{ 
                    scale: 0,
                    x: 0,
                    y: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    scale: [0, 1, 0.5, 0],
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
                    opacity: [1, 1, 0.6, 0]
                  }}
                  transition={{ 
                    duration: 0.6,
                    delay: delay * 0.3,
                    ease: "easeOut"
                  }}
                  className="absolute top-1/2 left-1/2 -mt-2 -ml-2"
                >
                  {i % 3 === 0 ? (
                    <Star 
                      className={cn(
                        "fill-current drop-shadow-lg",
                        isReward ? "text-yellow-400" : isHabit ? "text-green-400" : "text-red-400"
                      )} 
                      size={size} 
                    />
                  ) : i % 3 === 1 ? (
                    <Sparkles 
                      className={cn(
                        "fill-current drop-shadow-lg",
                        isReward ? "text-yellow-300" : isHabit ? "text-green-300" : "text-red-300"
                      )} 
                      size={size} 
                    />
                  ) : (
                    <div 
                      className={cn(
                        "rounded-full",
                        isReward ? "bg-yellow-400" : isHabit ? "bg-green-400" : "bg-red-400"
                      )}
                      style={{ width: size / 2, height: size / 2 }}
                    />
                  )}
                </motion.div>
              );
            })}

            {/* 旋转光环 */}
            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ 
                scale: [0, 1.5, 2],
                rotate: [0, 180, 360],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -mt-16 -ml-16"
              style={{ width: 128, height: 128 }}
            >
              <div className={cn(
                "w-full h-full rounded-full border-4 border-dashed",
                isReward ? "border-yellow-400/50" : isHabit ? "border-green-400/50" : "border-red-400/50"
              )} />
            </motion.div>
          </div>

          {/* 文字动画 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="absolute bottom-1/3 text-center"
          >
            <motion.h2
              animate={{ 
                scale: [1, 1.1, 1],
                transition: { duration: 0.3, repeat: 1 }
              }}
              className={cn(
                "text-5xl font-black mb-2 drop-shadow-lg",
                isReward ? "text-yellow-500" : isHabit ? "text-green-500" : "text-red-500"
              )}
            >
              {title}
            </motion.h2>
            <p className="text-xl font-bold text-on-surface/70">{subtitle}</p>
            
            {stars > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-2 mt-4"
              >
                <Star className="text-yellow-400 fill-current" size={24} />
                <span className="text-2xl font-black text-yellow-500">+{stars}</span>
              </motion.div>
            )}
          </motion.div>

          {/* 背景星星装饰 */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`bg-star-${i}`}
              initial={{ 
                opacity: 0,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight
              }}
              animate={{ 
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0.5]
              }}
              transition={{ 
                duration: 0.6,
                delay: Math.random() * 0.3,
                ease: "easeOut"
              }}
              className="absolute"
            >
              <Star className="text-yellow-300/40 fill-current" size={12 + Math.random() * 16} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
