/**
 * StarBurst - 星星爆发动画组件
 * 用于获得星星时的视觉反馈（使用 SVG 图标，不用 emoji）
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';

interface StarBurstProps {
    /** 触发计数器（每次递增触发一次） */
    trigger?: number;
    /** 粒子数量 */
    count?: number;
}

interface StarParticle {
    id: number;
    angle: number;
    distance: number;
    delay: number;
    size: number;
}

/** 星星 SVG 图标 */
function StarIcon({ size, className }: { size: number; className?: string }) {
    return (
        <Star
            size={size}
            className={className}
            fill="#FBC02D"
            stroke="#FBC02D"
            strokeWidth={1}
        />
    );
}

export function StarBurst({
    trigger = 0,
    count = 8,
}: StarBurstProps) {
    // 使用 key 机制：trigger 变化时强制重置
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (trigger > 0) {
            setIsActive(true);
            // 动画播完后自动消失
            const duration = 1400; // ms
            const timer = setTimeout(() => setIsActive(false), duration);
            return () => clearTimeout(timer);
        }
        // 当 trigger 回到 0 时也关闭
        if (trigger === 0) setIsActive(false);
    }, [trigger]);

    if (!isActive) return null;

    const stars: StarParticle[] = Array.from({ length: count }, (_, i) => ({
        id: i,
        angle: (360 / count) * i + Math.random() * 30 - 15,
        distance: 60 + Math.random() * 80,
        delay: Math.random() * 0.12,
        size: 16 + Math.random() * 10,
    }));

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 pointer-events-none z-[9997] overflow-hidden"
                aria-hidden="true"
            >
                {stars.map(star => (
                    <motion.div
                        key={`${star.id}-${trigger}`}
                        className="absolute left-1/2 top-1/3"
                        style={{ transform: 'translate(-50%, -50%)' }}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                        animate={{
                            x: [
                                0,
                                Math.cos((star.angle * Math.PI) / 180) * star.distance,
                                Math.cos((star.angle * Math.PI) / 180) * star.distance * 1.5,
                            ],
                            y: [
                                0,
                                Math.sin((star.angle * Math.PI) / 180) * star.distance + 20,
                                Math.sin((star.angle * Math.PI) / 180) * star.distance * 1.5 + 40,
                            ],
                            scale: [0, 1.4, 0],
                            opacity: [0, 1, 0],
                        }}
                        transition={{ duration: 0.95, delay: star.delay, ease: ['easeOut', 'easeIn'] }}
                        exit={{ opacity: 0 }}
                    >
                        <StarIcon size={star.size} />
                    </motion.div>
                ))}
            </div>
        </AnimatePresence>
    );
}

export default StarBurst;
