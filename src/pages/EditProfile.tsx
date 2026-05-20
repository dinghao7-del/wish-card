import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { Save, Camera, Lock, Eye, EyeOff, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Member } from '../types';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { BOY_AVATARS, GIRL_AVATARS, PARENT_AVATARS, GRANDPARENT_AVATARS } from '../lib/templates';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { showConfirm } from '../components/ConfirmDialog';
import { didChangeMemberCredential, getParentVerificationValue } from '../lib/sensitiveActions';
import { displayCredentialPlaceholder, hasStoredCredential, verifyMemberPinOrPassword } from '../lib/memberCredentials';
import { localeText } from '../lib/localeText';

export function EditProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser, members, updateMember } = useFamily();
  const { t, i18n } = useTranslation();
  const l = (copy: Parameters<typeof localeText>[1]) => localeText(i18n.language, copy);
  
  const memberToEdit = id ? members.find(m => m.id === id) : currentUser;

  const [formData, setFormData] = useState<Partial<Member>>({
    name: '',
    avatar: '',
    id: '',
    stars: 0,
    role: 'child',
    pin: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  const [usePinCode, setUsePinCode] = useState(!!memberToEdit?.pin);

  useEffect(() => {
    if (memberToEdit) {
      setFormData({
        name: memberToEdit.name,
        avatar: memberToEdit.avatar,
        id: memberToEdit.id,
        stars: memberToEdit.stars,
        role: memberToEdit.role,
        pin: displayCredentialPlaceholder(memberToEdit.pin),
        password: displayCredentialPlaceholder(memberToEdit.password)
      });
      setUsePinCode(hasStoredCredential(memberToEdit.pin));
    }
  }, [memberToEdit]);

  const isAdmin = currentUser?.role === 'parent';
  const canEditPin = isAdmin || currentUser?.id === memberToEdit?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!memberToEdit) return;

    const nextPin = formData.pin === displayCredentialPlaceholder(memberToEdit.pin) ? memberToEdit.pin : formData.pin;
    const nextPassword = formData.password === displayCredentialPlaceholder(memberToEdit.password) ? memberToEdit.password : formData.password;
    const updatedMember = usePinCode
      ? { ...memberToEdit, ...formData, pin: nextPin, password: '' } as Member
      : { ...memberToEdit, ...formData, pin: '', password: nextPassword } as Member;

    if (didChangeMemberCredential(memberToEdit, updatedMember)) {
      const verificationValue = getParentVerificationValue(currentUser);
      const confirmed = await showConfirm({
        title: localeText(i18n.language, { 'zh-CN': '家长二次确认', 'en-US': 'Parent confirmation', 'ja-JP': '保護者の再確認', 'ko-KR': '부모 재확인', 'es-ES': 'Confirmación parental', 'fr-FR': 'Confirmation parentale' }),
        message: localeText(i18n.language, {
          'zh-CN': `正在修改「${memberToEdit.name}」的 PIN 或密码。为了保护家庭数据，请再次确认。`,
          'en-US': `You are changing the PIN or password for ${memberToEdit.name}. Please confirm again to protect family data.`,
          'ja-JP': `${memberToEdit.name} のPINまたはパスワードを変更します。家族データを守るため、もう一度確認してください。`,
          'ko-KR': `${memberToEdit.name}의 PIN 또는 비밀번호를 변경합니다. 가족 데이터를 보호하기 위해 다시 확인해주세요.`,
          'es-ES': `Vas a cambiar el PIN o la contraseña de ${memberToEdit.name}. Confirma de nuevo para proteger los datos familiares.`,
          'fr-FR': `Vous modifiez le PIN ou le mot de passe de ${memberToEdit.name}. Confirmez à nouveau pour protéger les données familiales.`,
        }),
        type: 'warning',
        confirmText: localeText(i18n.language, { 'zh-CN': '保存', 'en-US': 'Save', 'ja-JP': '保存', 'ko-KR': '저장', 'es-ES': 'Guardar', 'fr-FR': 'Enregistrer' }),
        verificationValue: verificationValue || undefined,
        verificationMatcher: currentUser?.role === 'parent'
          ? (input) => verifyMemberPinOrPassword(currentUser, input) !== null
          : undefined,
        verificationLabel: verificationValue ? localeText(i18n.language, { 'zh-CN': '输入当前家长 PIN 或密码', 'en-US': 'Enter current parent PIN or password', 'ja-JP': '現在の保護者PINまたはパスワードを入力', 'ko-KR': '현재 부모 PIN 또는 비밀번호 입력', 'es-ES': 'Introduce el PIN o contraseña parental actual', 'fr-FR': 'Saisir le PIN ou mot de passe parent actuel' }) : undefined,
        verificationPlaceholder: verificationValue ? localeText(i18n.language, { 'zh-CN': 'PIN 或密码', 'en-US': 'PIN or password', 'ja-JP': 'PINまたはパスワード', 'ko-KR': 'PIN 또는 비밀번호', 'es-ES': 'PIN o contraseña', 'fr-FR': 'PIN ou mot de passe' }) : undefined,
      });
      if (!confirmed) return;
    }

    if (usePinCode) {
      // PIN码模式：只清理数据
      updateMember(updatedMember);
      navigate(-1);
    } else {
      // 系统密码模式
      if (memberToEdit?.role === 'parent' && !hasStoredCredential(updatedMember.password)) {
        setError(t('edit_profile.error_password_required', '管理员账号必须保留登录密码 🔐'));
        return;
      }
      updateMember(updatedMember);
      navigate(-1);
    }
  };

  if (!memberToEdit) return null;

  return (
    <div className="ui-profile-subpage ui-edit-profile-page px-5 sm:px-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen bg-background">
      <TopAppBar
        title={id
          ? t('edit_profile.edit_name', localeText(i18n.language, { 'zh-CN': `编辑 ${memberToEdit.name}`, 'en-US': `Edit ${memberToEdit.name}`, 'ja-JP': `${memberToEdit.name}を編集`, 'ko-KR': `${memberToEdit.name} 편집`, 'es-ES': `Editar ${memberToEdit.name}`, 'fr-FR': `Modifier ${memberToEdit.name}` }), { name: memberToEdit.name })
          : t('edit_profile.title', localeText(i18n.language, { 'zh-CN': '编辑个人信息', 'en-US': 'Edit Profile', 'ja-JP': 'プロフィール編集', 'ko-KR': '프로필 편집', 'es-ES': 'Editar perfil', 'fr-FR': 'Modifier le profil' }))}
        backTo="/profile"
      />

      <form onSubmit={handleSubmit} className="ui-edit-profile-form space-y-4 mt-4">
        <div className="ui-edit-profile-avatar-wrap flex flex-col items-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAvatarSelectorOpen(true)}
            className="relative cursor-pointer group"
          >
            <div className="ui-edit-profile-avatar w-24 h-24 sm:w-28 sm:h-28 rounded-[1.75rem] overflow-hidden border-4 border-surface shadow-lg group-hover:shadow-primary/20 transition-all bg-slate-50">
              {formData.avatar && (
                <img 
                  src={formData.avatar} 
                  alt="Avatar" 
                  className="w-full h-full object-contain" 
                />
              )}
            </div>
            <div className="absolute inset-0 bg-black/20 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
              <Camera size={32} />
            </div>
          </motion.div>
          <button 
            type="button"
            onClick={() => setIsAvatarSelectorOpen(true)}
            className="ui-edit-profile-avatar-button text-primary font-black text-sm tracking-tight hover:opacity-80 transition-opacity mt-2"
          >
            {t('edit_profile.select_avatar', localeText(i18n.language, { 'zh-CN': '选择头像', 'en-US': 'Choose Avatar', 'ja-JP': 'アバターを選択', 'ko-KR': '아바타 선택', 'es-ES': 'Elegir avatar', 'fr-FR': 'Choisir un avatar' }))}
          </button>
        </div>

        <div className="ui-profile-form-panel ui-edit-profile-panel space-y-4 bg-surface-container-low p-5 sm:p-6 rounded-[1.75rem] shadow-sm border border-outline-variant/10">
          <div className="ui-edit-profile-field space-y-1.5">
            <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">{t('edit_profile.nickname', localeText(i18n.language, { 'zh-CN': '昵称', 'en-US': 'Nickname', 'ja-JP': 'ニックネーム', 'ko-KR': '닉네임', 'es-ES': 'Apodo', 'fr-FR': 'Surnom' }))}</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="ui-edit-profile-control w-full bg-surface-container-high rounded-[1.25rem] px-5 py-3.5 text-on-surface font-bold placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 border-2 border-transparent focus:border-primary/20 transition-all"
            />
          </div>

          {canEditPin && (
            <>
              {/* 管理员切换开关 */}
              {isAdmin && (
                <div className="ui-edit-profile-switch-row flex items-center justify-between bg-surface-container/50 rounded-[1.25rem] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-on-surface-variant" />
                    <span className="text-sm font-bold text-on-surface">
                      {usePinCode
                        ? t('edit_profile.user_pin', l({ 'zh-CN': '用户PIN码', 'en-US': 'User PIN', 'ja-JP': 'ユーザーPIN', 'ko-KR': '사용자 PIN', 'es-ES': 'PIN de usuario', 'fr-FR': 'PIN utilisateur' }))
                        : t('edit_profile.system_password', l({ 'zh-CN': '系统密码', 'en-US': 'Password', 'ja-JP': 'パスワード', 'ko-KR': '비밀번호', 'es-ES': 'Contraseña', 'fr-FR': 'Mot de passe' }))}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={usePinCode}
                    aria-label={usePinCode
                      ? t('edit_profile.user_pin', l({ 'zh-CN': '用户PIN码', 'en-US': 'User PIN', 'ja-JP': 'ユーザーPIN', 'ko-KR': '사용자 PIN', 'es-ES': 'PIN de usuario', 'fr-FR': 'PIN utilisateur' }))
                      : t('edit_profile.system_password', l({ 'zh-CN': '系统密码', 'en-US': 'Password', 'ja-JP': 'パスワード', 'ko-KR': '비밀번호', 'es-ES': 'Contraseña', 'fr-FR': 'Mot de passe' }))}
                    onClick={() => setUsePinCode(!usePinCode)}
                    className={cn(
                      "ui-standard-switch relative inline-flex h-6 min-h-6 w-11 min-w-11 shrink-0 items-center overflow-hidden rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/25",
                      usePinCode ? "bg-primary" : "bg-surface-container-highest"
                    )}
                  >
                    <span className="ui-standard-switch-thumb pointer-events-none h-5 w-5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              )}

              {usePinCode ? (
                <>
                  <div className="ui-edit-profile-field space-y-1.5">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">{t('edit_profile.input_pin', l({ 'zh-CN': '输入PIN码', 'en-US': 'Enter PIN', 'ja-JP': 'PINを入力', 'ko-KR': 'PIN 입력', 'es-ES': 'Introduce PIN', 'fr-FR': 'Saisir le PIN' }))}</label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={formData.pin}
                      placeholder={t('edit_profile.pin_placeholder', l({ 'zh-CN': '设置4位数字密码', 'en-US': 'Set a 4-digit PIN', 'ja-JP': '4桁のPINを設定', 'ko-KR': '4자리 PIN 설정', 'es-ES': 'Define un PIN de 4 dígitos', 'fr-FR': 'Définir un PIN à 4 chiffres' }))}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                        setFormData({ ...formData, pin: val });
                      }}
                      className="ui-edit-profile-control w-full bg-surface-container-high border-2 border-transparent rounded-[1.25rem] px-5 py-3.5 font-black focus:border-primary/20 transition-all tracking-[0.5em] text-center"
                    />
                  </div>

                  <div className="ui-edit-profile-field space-y-1.5">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">{t('edit_profile.confirm_pin', l({ 'zh-CN': '确认PIN码', 'en-US': 'Confirm PIN', 'ja-JP': 'PINを確認', 'ko-KR': 'PIN 확인', 'es-ES': 'Confirmar PIN', 'fr-FR': 'Confirmer le PIN' }))}</label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder={t('edit_profile.confirm_pin_placeholder', l({ 'zh-CN': '再次输入PIN码', 'en-US': 'Enter PIN again', 'ja-JP': 'PINをもう一度入力', 'ko-KR': 'PIN 다시 입력', 'es-ES': 'Introduce el PIN otra vez', 'fr-FR': 'Saisir à nouveau le PIN' }))}
                      className="ui-edit-profile-control w-full bg-surface-container-high border-2 border-transparent rounded-[1.25rem] px-5 py-3.5 font-black focus:border-primary/20 transition-all tracking-[0.5em] text-center"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="ui-edit-profile-field space-y-1.5">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2 flex items-center justify-between">
                      <span>{t('edit_profile.change_password', l({ 'zh-CN': '修改密码', 'en-US': 'Change Password', 'ja-JP': 'パスワード変更', 'ko-KR': '비밀번호 변경', 'es-ES': 'Cambiar contraseña', 'fr-FR': 'Changer le mot de passe' }))} {memberToEdit.role === 'parent' && <span className="text-red-500 text-[10px] ml-1">{t('edit_profile.password_required', l({ 'zh-CN': '(必填)', 'en-US': '(required)', 'ja-JP': '（必須）', 'ko-KR': '(필수)', 'es-ES': '(obligatorio)', 'fr-FR': '(requis)' }))}</span>}</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        placeholder={memberToEdit.role === 'parent'
                          ? t('edit_profile.password_placeholder_parent', l({ 'zh-CN': '设置管理员密码', 'en-US': 'Set admin password', 'ja-JP': '管理者パスワードを設定', 'ko-KR': '관리자 비밀번호 설정', 'es-ES': 'Define contraseña de admin', 'fr-FR': 'Définir le mot de passe admin' }))
                          : t('edit_profile.password_placeholder_child', l({ 'zh-CN': '选填：登录密码', 'en-US': 'Optional login password', 'ja-JP': '任意：ログインパスワード', 'ko-KR': '선택: 로그인 비밀번호', 'es-ES': 'Opcional: contraseña de acceso', 'fr-FR': 'Facultatif : mot de passe' }))}
                        className="ui-edit-profile-control w-full bg-surface-container-high rounded-[1.25rem] px-5 py-3.5 text-on-surface font-bold placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 border-2 border-transparent focus:border-primary/20 transition-all pr-12"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="ui-edit-profile-field space-y-1.5">
                    <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2">{t('edit_profile.confirm_password', l({ 'zh-CN': '确认密码', 'en-US': 'Confirm Password', 'ja-JP': 'パスワード確認', 'ko-KR': '비밀번호 확인', 'es-ES': 'Confirmar contraseña', 'fr-FR': 'Confirmer le mot de passe' }))}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder={t('edit_profile.confirm_password_placeholder', l({ 'zh-CN': '再次输入密码', 'en-US': 'Enter password again', 'ja-JP': 'パスワードをもう一度入力', 'ko-KR': '비밀번호 다시 입력', 'es-ES': 'Introduce la contraseña otra vez', 'fr-FR': 'Saisir à nouveau le mot de passe' }))}
                        className="ui-edit-profile-control w-full bg-surface-container-high rounded-[1.25rem] px-5 py-3.5 text-on-surface font-bold placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 border-2 border-transparent focus:border-primary/20 transition-all pr-12"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-red-500 text-sm font-bold bg-red-500/10 py-3 rounded-2xl border border-red-500/20"
          >
            {error}
          </motion.div>
        )}

        <button 
          type="submit"
          className="ui-edit-profile-submit w-full bg-primary text-white font-black py-3.5 rounded-[1.5rem] flex items-center justify-center gap-2.5 shadow-lg shadow-primary/15 active:scale-95 transition-transform"
        >
          <Save size={24} />
          <span>{t('edit_profile.save', l({ 'zh-CN': '保存修改', 'en-US': 'Save Changes', 'ja-JP': '変更を保存', 'ko-KR': '변경 저장', 'es-ES': 'Guardar cambios', 'fr-FR': 'Enregistrer' }))}</span>
        </button>
      </form>

      {/* Avatar Selector Bottom Sheet */}
      <AnimatePresence>
        {isAvatarSelectorOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAvatarSelectorOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-background rounded-t-[3rem] z-[70] shadow-2xl overflow-hidden border-t border-outline-variant/10"
            >
              <div className="p-8 flex flex-col h-[70vh]">
                <header className="flex items-center justify-between mb-8">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight">{t('edit_profile.avatar_title', l({ 'zh-CN': '选择头像', 'en-US': 'Choose Avatar', 'ja-JP': 'アバターを選択', 'ko-KR': '아바타 선택', 'es-ES': 'Elegir avatar', 'fr-FR': 'Choisir un avatar' }))}</h2>
                    <p className="text-xs text-on-surface-variant font-bold tracking-widest uppercase">{t('edit_profile.avatar_subtitle', l({ 'zh-CN': '共 {{count}} 款精选头像', 'en-US': '{{count}} avatar options', 'ja-JP': '{{count}}個のアバター', 'ko-KR': '아바타 {{count}}개', 'es-ES': '{{count}} opciones de avatar', 'fr-FR': '{{count}} avatars disponibles' }), { count: BOY_AVATARS.length + GIRL_AVATARS.length + PARENT_AVATARS.length + GRANDPARENT_AVATARS.length })}</p>
                  </div>
                  <button 
                    onClick={() => setIsAvatarSelectorOpen(false)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
                  >
                    <X size={24} />
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
                  <div className="space-y-6">
                    {/* Boys Section */}
                    <div>
                      <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-500 rounded-full" />
                        {t('edit_profile.section_boys', l({ 'zh-CN': '男孩', 'en-US': 'Boys', 'ja-JP': '男の子', 'ko-KR': '남아', 'es-ES': 'Niños', 'fr-FR': 'Garçons' }))} ({BOY_AVATARS.length})
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {BOY_AVATARS.map((avatar) => (
                          <motion.button
                            key={avatar.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setFormData({ ...formData, avatar: avatar.src });
                              setIsAvatarSelectorOpen(false);
                            }}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border-3 transition-all shadow-sm flex flex-col items-center",
                              formData.avatar === avatar.src ? "border-primary bg-primary/5 scale-105" : "border-surface-container-low hover:border-primary/30"
                            )}
                          >
                            <img 
                              src={avatar.src} 
                              alt={avatar.name} 
                              className="w-full h-full object-cover" 
                            />
                            {formData.avatar === avatar.src && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                                <div className="bg-primary text-white rounded-full p-1 shadow-lg">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Girls Section */}
                    <div>
                      <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-pink-500 rounded-full" />
                        {t('edit_profile.section_girls', l({ 'zh-CN': '女孩', 'en-US': 'Girls', 'ja-JP': '女の子', 'ko-KR': '여아', 'es-ES': 'Niñas', 'fr-FR': 'Filles' }))} ({GIRL_AVATARS.length})
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {GIRL_AVATARS.map((avatar) => (
                          <motion.button
                            key={avatar.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setFormData({ ...formData, avatar: avatar.src });
                              setIsAvatarSelectorOpen(false);
                            }}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border-3 transition-all shadow-sm flex flex-col items-center",
                              formData.avatar === avatar.src ? "border-primary bg-primary/5 scale-105" : "border-surface-container-low hover:border-primary/30"
                            )}
                          >
                            <img 
                              src={avatar.src} 
                              alt={avatar.name} 
                              className="w-full h-full object-cover" 
                            />
                            {formData.avatar === avatar.src && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                                <div className="bg-primary text-white rounded-full p-1 shadow-lg">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Parents Section */}
                    <div>
                      <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-green-500 rounded-full" />
                        {t('edit_profile.section_parents', l({ 'zh-CN': '父母', 'en-US': 'Parents', 'ja-JP': '保護者', 'ko-KR': '부모', 'es-ES': 'Padres', 'fr-FR': 'Parents' }))} ({PARENT_AVATARS.length})
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {PARENT_AVATARS.map((avatar) => (
                          <motion.button
                            key={avatar.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setFormData({ ...formData, avatar: avatar.src });
                              setIsAvatarSelectorOpen(false);
                            }}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border-3 transition-all shadow-sm flex flex-col items-center",
                              formData.avatar === avatar.src ? "border-primary bg-primary/5 scale-105" : "border-surface-container-low hover:border-primary/30"
                            )}
                          >
                            <img 
                              src={avatar.src} 
                              alt={avatar.name} 
                              className="w-full h-full object-cover" 
                            />
                            {formData.avatar === avatar.src && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                                <div className="bg-primary text-white rounded-full p-1 shadow-lg">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Grandparents Section */}
                    <div>
                      <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-orange-500 rounded-full" />
                        {t('edit_profile.section_grandparents', l({ 'zh-CN': '爷爷奶奶', 'en-US': 'Grandparents', 'ja-JP': '祖父母', 'ko-KR': '조부모', 'es-ES': 'Abuelos', 'fr-FR': 'Grands-parents' }))} ({GRANDPARENT_AVATARS.length})
                      </h3>
                      <div className="grid grid-cols-5 gap-2">
                        {GRANDPARENT_AVATARS.map((avatar) => (
                          <motion.button
                            key={avatar.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setFormData({ ...formData, avatar: avatar.src });
                              setIsAvatarSelectorOpen(false);
                            }}
                            className={cn(
                              "relative aspect-square rounded-xl overflow-hidden border-3 transition-all shadow-sm flex flex-col items-center",
                              formData.avatar === avatar.src ? "border-primary bg-primary/5 scale-105" : "border-surface-container-low hover:border-primary/30"
                            )}
                          >
                            <img 
                              src={avatar.src} 
                              alt={avatar.name} 
                              className="w-full h-full object-cover" 
                            />
                            {formData.avatar === avatar.src && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center pointer-events-none">
                                <div className="bg-primary text-white rounded-full p-1 shadow-lg">
                                  <Check size={12} strokeWidth={4} />
                                </div>
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
