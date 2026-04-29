#!/usr/bin/env python3
"""
翻译辅助脚本 - 为 i18n/index.ts 添加缺失的翻译键
使用方法: python3 scripts/add_translations.py
"""

import re
import os
import shutil
from datetime import datetime

I18N_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n', 'index.ts')

def backup_file():
    """备份原文件"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = I18N_FILE + f'.backup-{timestamp}'
    shutil.copy2(I18N_FILE, backup_path)
    print(f'已备份原文件到: {backup_path}')
    return backup_path

def read_file():
    """读取文件内容"""
    with open(I18N_FILE, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(content):
    """写回文件"""
    with open(I18N_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print('文件已更新')

def add_translations_for_language(content, lang_code, welcome_translations, auth_callback_translations):
    """
    为指定语言添加 welcome 和 auth_callback 翻译
    
    Args:
        content: 文件内容
        lang_code: 语言代码 (如 'ja-JP', 'ko-KR')
        welcome_translations: welcome 对象的翻译文本
        auth_callback_translations: auth_callback 对象的翻译文本
    
    Returns:
        更新后的内容
    """
    # 查找该语言的 'guest': { 位置
    # 在该位置之前插入 welcome 和 auth_callback
    pattern = rf"('{re.escape(lang_code)}':\s*\{{[\s\S]*?)(\s*'guest':\s*\{{)"
    match = re.search(pattern, content)
    
    if not match:
        print(f'警告: 找不到 {lang_code} 的 guest 对象位置')
        return content
    
    # 在 'guest': { 之前插入新的翻译对象
    insert_pos = match.start() + len(match.group(1))
    before = content[:insert_pos]
    after = content[insert_pos:]
    
    # 组装要插入的文本
    insert_text = f"\n      'welcome': {welcome_translations},\n      'auth_callback': {auth_callback_translations},"
    
    updated_content = before + insert_text + after
    print(f'已为 {lang_code} 添加 welcome 和 auth_callback 翻译')
    
    return updated_content

def main():
    print('开始添加缺失的翻译键...')
    
    # 备份
    backup_file()
    
    # 读取内容
    content = read_file()
    
    # ===== 日语翻译 =====
    ja_welcome = {
        'title': 'WishCard',
        'subtitle': '努力で幸せを開こう 🌱',
        'tagline': '成長の一歩一歩を記録',
        'skip': 'スキップ',
        'skip_error': 'スキップ失敗、再試行をお願いします',
        'guest_name': 'お母さん',
        'guest_mode': '先に見学（ゲストモード）',
        'network_error': 'ネットワーク接続失敗、サーバーに接続できません。ネットワークを確認してから再試行するか、先にゲストモードを使用してください',
        'network_error_verify': 'ネットワーク接続失敗、サーバーに接続できません。ネットワークを確認してから再試行してください',
        'register': {
            'title': '登録へようこそ',
            'subtitle': '保護者のみ管理者として登録できます 🌱',
            'error_nickname': 'ニックネームを入力してください',
            'error_password': 'パスワードを入力してください',
            'error_mismatch': '入力したパスワードが一致しません 🍃',
            'error_password_length': 'パスワードは少なくとも6文字が必要です',
            'nickname': '管理者ニックネーム',
            'nickname_placeholder': '例：お母さん',
            'password': 'ログインパスワード',
            'password_placeholder': '管理者パスワードを入力',
            'confirm_password': 'パスワード確認',
            'confirm_password_placeholder': 'もう一度パスワードを入力',
            'submit': 'アカウント登録'
        },
        'login': {
            'title': 'ログインへようこそ',
            'subtitle': 'アカウントとパスワードを入力して今日の願いを開いて 🌱',
            'error_empty': 'アカウントを入力してください',
            'error_password': 'パスワードを入力してください',
            'error_invalid': 'ユーザー名またはパスワードが正しくありません、確認してください 🍃',
            'username': 'アカウント',
            'username_placeholder': 'メールまたはニックネーム',
            'password': 'パスワード',
            'password_placeholder': '管理者パスワード',
            'submit': 'ログイン',
            'has_account': 'アカウントをお持ちですか？ログイン →',
            'no_account': 'アカウントがない？登録 →'
        },
        'otp': {
            'phone_email': '電話番号またはメール',
            'placeholder': '電話番号またはメール',
            'error_empty': '電話番号またはメールを入力してください',
            'error_send': '認証コードの送信に失敗しました',
            'code_sent': '認証コードを{0}に送信しました',
            'verify_title': '認証コードを入力',
            'verify_subtitle': '認証コードを{0}に送信しました',
            'code_placeholder': '認証コードを入力してください',
            'error_no_code': '認証コードを入力してください',
            'error_verify': '認証失敗',
            'verify': '認証',
            'send': 'コード送信',
            'resend': '再送信'
        },
        'my_family': '{0}の家庭',
        'no_account': 'アカウントがない？登録 →'
    }
    
    ja_auth_callback = {
        'no_valid_info': '有効な認証情報が見つかりません',
        'verify_failed': '認証失敗',
        'default_parent': '保護者',
        'family_name': '{0}の家庭',
        'create_user_failed': 'ユーザーデータの作成に失敗しました',
        'verifying': '認証中...',
        'please_wait': '少々お待ちください、メール認証を完了しています',
        'verify_success': '認証成功！',
        'redirecting': 'ホームページにジャンプ中...',
        'verify_failed_title': '認証失敗',
        'back_to_login': 'ログインに戻る'
    }
    
    # 将 Python dict 转换为 TypeScript 对象字符串
    def dict_to_ts(obj, indent=6):
        """将 Python dict 转换为 TypeScript 对象字符串"""
        if isinstance(obj, str):
            # 转义单引号
            escaped = obj.replace("'", "\\'")
            return f"'{escaped}'"
        elif isinstance(obj, dict):
            lines = []
            for key, value in obj.items():
                lines.append(f"{' ' * indent}'{key}': {dict_to_ts(value, indent + 2)}")
            return '{\n' + ',\n'.join(lines) + f"\n{' ' * (indent - 2)}" + '}'
        else:
            return str(obj)
    
    ja_welcome_ts = dict_to_ts(ja_welcome)
    ja_auth_callback_ts = dict_to_ts(ja_auth_callback)
    
    # 添加日语翻译
    content = add_translations_for_language(content, 'ja-JP', ja_welcome_ts, ja_auth_callback_ts)
    
    # 写回文件
    write_file(content)
    
    print('\n翻译添加完成！')
    print('请运行 TypeScript 检查: cd /Users/zerone/WorkBuddy/20260420104543 && npx tsc --noEmit --skipLibCheck')

if __name__ == '__main__':
    main()
