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
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 pointer-events-none overflow-hidden"
          style={{
            background: isReward 
              ? 'radial-gradient(circle at center, rgba(255,215,0,0.24) 0%, rgba(255,255,255,0.82) 70%)'
              : isHabit
              ? 'radial-gradient(circle at center, rgba(76,175,80,0.24) 0%, rgba(255,255,255,0.82) 70%)'
              : 'radial-gradient(circle at center, rgba(244,67,54,0.24) 0%, rgba(255,255,255,0.82) 70%)'
          }}
        >
          <div className="relative z-10 flex w-full max-w-[20rem] flex-col items-center justify-center gap-5 rounded-[2rem] bg-surface/90 px-5 py-6 text-center shadow-2xl backdrop-blur-md">
          {/* 中心爆发效果 */}
          <div className="relative flex h-36 w-36 shrink-0 items-center justify-center sm:h-40 sm:w-40">
            {/* 外圈脉冲 */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ 
                scale: [0, 2.5, 3],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn(
                "absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-32 sm:w-32",
                isReward ? "bg-yellow-400/30" : isHabit ? "bg-green-400/30" : "bg-red-400/30"
              )}
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
                "relative z-10 flex h-28 w-28 items-center justify-center rounded-full shadow-2xl sm:h-32 sm:w-32",
                isReward ? "bg-gradient-to-br from-yellow-400 to-orange-500" :
                isHabit ? "bg-gradient-to-br from-green-400 to-emerald-600" :
                "bg-gradient-to-br from-red-400 to-pink-600"
              )}
            >
              {isReward ? (
                <Trophy size={56} className="text-white drop-shadow-lg sm:size-16" strokeWidth={2.5} />
              ) : isHabit ? (
                <CheckCircle2 size={56} className="text-white drop-shadow-lg sm:size-16" strokeWidth={2.5} />
              ) : (
                <Zap size={56} className="text-white drop-shadow-lg sm:size-16" strokeWidth={2.5} />
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
                  className="absolute left-1/2 top-1/2 -ml-2 -mt-2"
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
              className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 sm:h-32 sm:w-32"
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
            className="flex w-full flex-col items-center text-center"
          >
            <motion.h2
              className={cn(
                "max-w-full break-words text-3xl font-black leading-tight drop-shadow-lg sm:text-5xl",
                isReward ? "text-yellow-500" : isHabit ? "text-green-500" : "text-red-500"
              )}
            >
              {title}
            </motion.h2>
            <p className="mt-2 max-w-full break-words px-2 text-sm font-bold leading-relaxed text-on-surface/70 sm:text-xl">{subtitle}</p>
            
            {stars > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-full bg-surface/90 px-4 py-2 shadow-lg"
              >
                <Star className="text-yellow-400 fill-current" size={24} />
                <span className="text-xl font-black text-yellow-500 sm:text-2xl">
                  {isReward ? `消耗 ${stars}` : `+${stars}`}
                </span>
              </motion.div>
            )}
          </motion.div>
          </div>

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
