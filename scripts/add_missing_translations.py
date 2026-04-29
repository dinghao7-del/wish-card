#!/usr/bin/env python3
"""
自动提取代码中的翻译键并添加到 i18n/index.ts
"""
import re
import os

# 读取所有 .tsx 文件，提取有效的 t('key') 或 t("key") 中的 key
def extract_translation_keys(src_dir):
    keys = set()
    # 匹配 t('key') 或 t("key")，key 可以包含字母、数字、点、下划线、冒号
    pattern = r"t\(\s*['\"]([a-zA-Z_:][a-zA-Z0-9_.:]+)['\"]"
    
    for root, dirs, files in os.walk(src_dir):
        # 跳过 i18n 目录
        if 'i18n' in root:
            continue
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = re.findall(pattern, content)
                        for match in matches:
                            # 排除包含空格的匹配（错误的匹配）
                            if ' ' not in match:
                                keys.add(match)
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
    
    return keys

# 从 i18n/index.ts 中提取已有的键
def extract_existing_keys(i18n_file):
    keys = set()
    
    with open(i18n_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 匹配 'key': 模式（键名）
    pattern = r"'([^']+)':"
    matches = re.findall(pattern, content)
    keys.update(matches)
    
    return keys

def main():
    src_dir = '/Users/zerone/WorkBuddy/20260420104543/src'
    i18n_file = '/Users/zerone/WorkBuddy/20260420104543/src/i18n/index.ts'
    
    print("🔍 提取代码中的翻译键...")
    code_keys = extract_translation_keys(src_dir)
    print(f"✅ 找到 {len(code_keys)} 个翻译键")
    
    print("\n📖 读取已有的翻译键...")
    existing_keys = extract_existing_keys(i18n_file)
    print(f"✅ 找到 {len(existing_keys)} 个已有键")
    
    # 找出缺失的键
    missing = code_keys - existing_keys
    print(f"\n⚠️  缺失 {len(missing)} 个翻译键")
    
    if missing:
        print("\n缺失的键（前50个）：")
        for key in sorted(missing)[:50]:
            print(f"  - {key}")
        
        # 保存到文件
        output_file = '/Users/zerone/WorkBuddy/20260420104543/scripts/missing_keys.txt'
        with open(output_file, 'w', encoding='utf-8') as f:
            for key in sorted(missing):
                f.write(f"{key}\n")
        print(f"\n✅ 完整列表已保存到：{output_file}")
    else:
        print("\n✅ 所有翻译键都已存在！")

if __name__ == '__main__':
    main()
