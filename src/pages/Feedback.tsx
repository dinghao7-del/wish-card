import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Phone, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

export function Feedback() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const CATEGORIES = [
    t('feedback.categories.member'),
    t('feedback.categories.feedback'),
    t('feedback.categories.suggestion'),
    t('feedback.categories.service'),
    t('feedback.categories.bug'),
    t('feedback.categories.other')
  ];

  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.length < 10) {
      alert(t('feedback.error_min_length'));
      return;
    }
    // Simulate submission
    setTimeout(() => {
      setIsSubmitted(true);
    }, 800);
  };

  if (isSubmitted) {
    return (
      <div className="px-6 min-h-screen bg-[#FDFCF9] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-[#E8F5E9] rounded-[2.5rem] flex items-center justify-center text-[#2E8B57] mb-8 shadow-lg shadow-green-100">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-on-surface mb-2 tracking-tight">{t('feedback.success_title')}</h2>
        <p className="text-on-surface-variant font-medium max-w-[240px] mx-auto text-sm">
          {t('feedback.success_desc')}
        </p>
        <button 
          onClick={() => navigate('/profile')}
          className="mt-12 px-12 py-4 bg-[#2E8B57] text-white rounded-full font-black text-lg shadow-xl shadow-green-200 active:scale-95 transition-transform"
        >
          {t('feedback.back_home')}
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pb-32 min-h-screen bg-[#FDFCF9] animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex justify-between items-center py-6 sticky top-0 bg-[#FDFCF9]/80 backdrop-blur-xl z-40 -mx-6 px-6">
        <button 
          onClick={() => navigate(-1)} 
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-[#E8E7E0]/30 shadow-sm text-on-surface-variant hover:bg-surface-container transition-all active:scale-95"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-black text-xl tracking-tight text-on-surface">{t('feedback.title')}</h1>
        <button className="text-on-surface-variant text-sm font-bold opacity-60">{t('feedback.my_feedback')}</button>
      </header>

      <div className="mt-8 space-y-10">
        {/* Category Selection */}
        <section className="space-y-4">
          <h3 className="text-lg font-black text-on-surface pl-1">{t('feedback.category')}</h3>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "py-3 rounded-2xl text-[13px] font-bold border transition-all active:scale-95",
                  selectedCategory === cat 
                    ? "bg-[#E8F5E9] text-[#2E8B57] border-[#2E8B57]/30 shadow-sm" 
                    : "bg-white text-on-surface-variant border-[#E8E7E0]/60"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Feedback Content */}
        <section className="space-y-4">
          <h3 className="text-lg font-black text-on-surface pl-1">{t('feedback.content')}</h3>
          <div className="relative bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-[#E8E7E0]/30">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('feedback.placeholder')}
              className="w-full min-h-[160px] bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/30 leading-relaxed resize-none"
            />
          </div>
        </section>

        {/* Media Upload */}
        <section className="space-y-4">
          <h3 className="text-lg font-black text-on-surface pl-1">{t('feedback.media')}</h3>
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-[#E8E7E0]/30">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs"
                >✕</button>
              </div>
            ))}
            {images.length < 4 && (
              <label className="w-24 h-24 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant/40 border-2 border-dashed border-outline-variant/30 cursor-pointer hover:bg-surface-container-highest transition-colors active:scale-95">
                <Camera size={28} />
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    Array.from(files).slice(0, 4 - images.length).forEach(file => {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setImages(prev => [...prev, ev.target!.result as string]);
                        }
                      };
                      reader.readAsDataURL(file);
                    });
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
        </section>

        {/* Contact info */}
        <section className="space-y-4">
          <h3 className="text-lg font-black text-on-surface pl-1">{t('feedback.contact')}</h3>
          <div className="relative bg-white rounded-[2rem] px-6 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-[#E8E7E0]/30 flex items-center gap-4 group focus-within:border-primary/30 transition-all">
            <Phone size={20} className="text-on-surface-variant/40 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('feedback.contact_placeholder')}
              className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-on-surface placeholder:text-on-surface-variant/30"
            />
          </div>
        </section>
      </div>

      {/* Primary Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDFCF9] via-[#FDFCF9] to-transparent z-40">
        <div className="max-w-md mx-auto">
          <button 
            onClick={handleSubmit}
            className="w-full py-5 bg-[#7FFF7F] hover:bg-[#66FF66] text-[#1B5E20] font-black text-lg rounded-[2rem] shadow-[0_15px_35px_rgba(127,255,127,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {t('feedback.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
