import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Download, Check, X, AlertTriangle } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import * as api from '../lib/api';

export function Import() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { familyId, currentUser } = useFamily();
  const [status, setStatus] = useState<'loading' | 'confirm' | 'success' | 'error'>('loading');
  const [importData, setImportData] = useState<api.ImportData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(dataParam)));
        setImportData(decoded);
        setStatus('confirm');
      } catch (err) {
        setStatus('error');
        setError(t('import.error_parsing'));
      }
    } else {
      setStatus('error');
      setError(t('import.error_not_found'));
    }
  }, [searchParams]);

  const handleConfirmImport = async () => {
    if (!importData || !familyId || !currentUser) return;
    
    try {
      await api.bulkImport(familyId, importData, currentUser.id);
      setStatus('success');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.message || t('import.error_saving'));
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-white dark:bg-surface-container rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        {status === 'loading' && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-black text-on-surface">{t('import.parsing')}</h2>
          </div>
        )}

        {status === 'confirm' && (
          <div className="p-8 space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Download size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black text-on-surface mb-2">{t('import.found_title')}</h2>
              <p className="text-sm text-on-surface-variant/60 font-bold">{t('import.found_subtitle')}</p>
            </div>
            
            <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-6 space-y-4 border border-slate-100 dark:border-white/5">
              <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">{t('import.items_title')}</div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'members', label: t('import.members'), exists: !!importData.members },
                  { id: 'tasks', label: t('import.tasks'), exists: !!importData.tasks },
                  { id: 'rewards', label: t('import.rewards'), exists: !!importData.rewards },
                  { id: 'history', label: t('import.history'), exists: !!importData.history }
                ].filter(i => i.exists).map(item => (
                  <div key={item.id} className="flex items-center gap-3 text-on-surface font-black text-sm">
                    <div className="w-6 h-6 rounded-lg bg-primary text-on-primary flex items-center justify-center">
                      <Check size={14} strokeWidth={4} />
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleConfirmImport}
                className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black text-base shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                {t('import.confirm_button')}
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full py-4 bg-surface-container text-on-surface-variant/60 font-black rounded-2xl active:scale-95 transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
            
            <p className="text-[10px] text-on-surface-variant/30 font-bold leading-relaxed text-center px-4">
              {t('import.warning')}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black text-emerald-600 mb-2">{t('import.success_title')}</h2>
            <p className="text-on-surface-variant font-bold">{t('import.success_subtitle')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-12">
            <div className="w-20 h-20 bg-error/10 text-error rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-error mb-2">{t('import.error_title')}</h2>
            <p className="text-on-surface-variant font-bold mb-6">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 bg-primary text-on-primary rounded-2xl font-black shadow-lg shadow-primary/25 active:scale-95 transition-all"
            >
              {t('import.back_home')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
