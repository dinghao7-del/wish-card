/**
 * ConfettiExplosion - 纸屑爆炸动画组件
 * 用于成功/庆祝场景
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    rotation: number;
    velocityX: number;
    velocityY: number;
    rotationSpeed: number;
    shape: 'circle' | 'square' | 'strip';
}

interface ConfettiExplosionProps {
    /** 触发计数器/时间戳（非零时触发） */
    active?: number | boolean;
    /** 持续时间 (ms) */
    duration?: number;
    /** 粒子数量 */
    particleCount?: number;
    /** 触发位置 */
    origin?: { x: number; y: number };
}

const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

function generateParticles(count: number, centerX: number, centerY: number): Particle[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: centerX,
        y: centerY,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        velocityX: (Math.random() - 0.5) * 400,
        velocityY: -(Math.random() * 300 + 200),
        rotationSpeed: (Math.random() - 0.5) * 720,
        shape: (['circle', 'square', 'strip'] as const)[Math.floor(Math.random() * 3)],
    }));
}

export function ConfettiExplosion({
    active = false,
    duration = 2000,
    particleCount = 50,
    origin = { x: 50, y: 50 },
}: ConfettiExplosionProps) {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!active) {
            setIsVisible(false);
            return;
        }

        // 如果 active 是数字（时间戳），确保每次变化都能触发
        const shouldTrigger = typeof active === 'number' ? active > 0 : active;

        if (!shouldTrigger) {
            setIsVisible(false);
            return;
        }

        const newParticles = generateParticles(
            particleCount,
            origin.x,
            origin.y
        );

        setParticles(newParticles);
        setIsVisible(true);

        const timer = setTimeout(() => setIsVisible(false), duration);
        return () => clearTimeout(timer);
    }, [active, particleCount, duration, origin.x, origin.y]);

    if (!isVisible || particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
            {particles.map(particle => (
                <motion.div
                    key={particle.id}
                    className="absolute"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height:
                            particle.shape === 'strip' ? particle.size * 3 : particle.size,
                        backgroundColor: particle.color,
                        borderRadius: particle.shape === 'circle' ? '50%' : 2,
                    }}
                    initial={{
                        x: 0,
                        y: 0,
                        rotate: particle.rotation,
                        opacity: 1,
                        scale: 1,
                    }}
                    animate={{
                        x: particle.velocityX,
                        y: particle.velocityY,
                        rotate: particle.rotation + particle.rotationSpeed,
                        opacity: 0,
                        scale: 0.5,
                    }}
                    transition={{
                        duration: duration / 1000,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    );
}

export default ConfettiExplosion;
