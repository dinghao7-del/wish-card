#!/usr/bin/env python3
"""
为 i18n/index.ts 添加缺失的翻译键
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
    print(f'已备份到: {backup_path}')
    return backup_path

def read_file():
    """读取文件"""
    with open(I18N_FILE, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(content):
    """写入文件"""
    with open(I18N_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print('文件已更新')

def find_insertion_point(content, lang_code, after_key):
    """
    查找插入点：在指定语言的 after_key 之后插入新内容
    after_key 应该是 translation 对象中的一个顶级键，如 'feedback' 或 'contact_us'
    """
    # 找到语言对象的开始
    lang_pattern = rf"'{re.escape(lang_code}':\s*\{{"
    lang_match = re.search(lang_pattern, content)
    if not lang_match:
        print(f'警告: 找不到语言 {lang_code}')
        return -1
    
    # 找到 translation: { 的开始
    trans_pattern = r"translation:\s*\{"
    # 从语言对象开始后搜索
    search_start = lang_match.end()
    trans_match = re.search(trans_pattern, content[search_start:])
    if not trans_match:
        print(f'警告: 找不到 {lang_code} 的 translation 对象')
        return -1
    
    # translation: { 的绝对位置
    trans_start = search_start + trans_match.end()
    
    # 找到 after_key 的位置，在它之后插入
    # after_key 应该是 translation 对象中的一个键
    after_pattern = rf"'{re.escape(after_key)}':\s*\{{"
    after_match = re.search(after_pattern, content[trans_start:])
    if not after_match:
        print(f'警告: 找不到 {lang_code} 的 {after_key} 键')
        return -1
    
    # 找到 after_key 对象的结束位置
    after_start = trans_start + after_match.start()
    after_end = find_object_end(content, after_start + len(after_match.group()))
    
    return after_end

def find_object_end(content, start_pos):
    """
    从 start_pos 开始，找到对象的结束位置（匹配的 }）
    """
    depth = 0
    in_string = False
    string_char = None
    i = start_pos
    
    while i < len(content):
        char = content[i]
        
        if in_string:
            if char == '\\':
                i += 2
                continue
            if char == string_char:
                in_string = False
            i += 1
            continue
        
        if char in ['"', "'"]:
            in_string = True
            string_char = char
        elif char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return i + 1  # 返回 } 之后的位置
        elif char == '\n' and content[i:i+2] == '//':
            # 跳过注释
            while i < len(content) and content[i] != '\n':
                i += 1
            continue
        
        i += 1
    
    return -1

def add_welcome_and_auth(content, lang_code, welcome_text, auth_text):
    """
    为指定语言添加 welcome 和 auth_callback 翻译
    在 feedback 对象之后插入
    """
    # 在 feedback 对象之后插入
    insert_pos = find_insertion_point(content, lang_code, 'feedback')
    
    if insert_pos < 0:
        print(f'无法为 {lang_code} 找到插入点')
        return content
    
    # 在 insert_pos 处插入新内容
    before = content[:insert_pos]
    after = content[insert_pos:]
    
    # 确保换行和缩进正确
    insert_text = f",\n      'welcome': {welcome_text},\n      'auth_callback': {auth_text}"
    
    result = before + insert_text + after
    print(f'已为 {lang_code} 添加 welcome 和 auth_callback 翻译')
    
    return result

def main():
    print('开始添加缺失的翻译键...')
    
    # 备份
    backup_file()
    
    # 读取
    content = read_file()
    
    # 日语翻译 (简略版本，实际需要完整的翻译文本)
    ja_welcome = """{
        'title': 'WishCard',
        'subtitle': '努力で幸せを開こう 🌱',
        'tagline': '成長の一歩一歩を記録',
        'skip': 'スキップ',
        'skip_error': 'スキップ失敗、再試行をお願いします',
        'guest_name': 'お母さん',
        'guest_mode': '先に見学（ゲストモード）',
        'network_error': 'ネットワーク接続失敗、サーバーに接続できません',
        'network_error_verify': 'ネットワーク接続失敗、サーバーに接続できません',
        'register': {
          'title': '登録へようこそ',
          'subtitle': '保護者のみ管理者として登録できます 🌱'
        },
        'login': {
          'title': 'ログインへようこそ',
          'subtitle': 'アカウントとパスワードを入力して今日の願いを開いて 🌱'
        },
        'otp': {
          'phone_email': '電話番号またはメール'
        },
        'my_family': '{0}の家庭',
        'no_account': 'アカウントがない？登録 →'
      }"""
    
    ja_auth = """{
        'no_valid_info': '有効な認証情報が見つかりません',
        'verify_failed': '認証失敗',
        'verifying': '認証中...',
        'verify_success': '認証成功！',
        'back_to_login': 'ログインに戻る'
      }"""
    
    # 为日语添加
    content = add_welcome_and_auth(content, 'ja-JP', ja_welcome, ja_auth)
    
    # 写入
    write_file(content)
    
    print('\n完成！请检查文件语法。')

if __name__ == '__main__':
    main()
