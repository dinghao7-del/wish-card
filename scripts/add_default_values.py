#!/usr/bin/env python3
"""
自动为代码中的 t('key') 添加默认值
将 t('key') 改为 t('key', 'key的中文翻译')
需要配合翻译键文件使用
"""
import re
import os

# 读取已有的翻译（从 i18n/index.ts 的中文部分）
def load_translations(i18n_file):
    translations = {}
    
    with open(i18n_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    in_chinese = False
    for line in lines:
        if "'zh-CN':" in line:
            in_chinese = True
            continue
        if in_chinese and "language:" in line:
            break
        if in_chinese:
            # 匹配 'key': 'value' 或 'key': "value"
            match = re.match(r"\s*'([^']+)'\s*:\s*['\"]([^'\"]*)['\"],\s*$", line)
            if match:
                key = match.group(1)
                value = match.group(2)
                translations[key] = value
    
    return translations

# 为文件中的 t('key') 添加默认值
def add_defaults_to_file(filepath, translations):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 匹配 t('key') 或 t("key") （没有第二个参数）
    pattern = r"t\(\s*['\"]([a-zA-Z_][a-zA-Z0-9_.:]+)['\"]\s*\)"
    
    def replace_match(match):
        key = match.group(1)
        if key in translations and translations[key]:
            # 有翻译，添加默认值
            return f"t('{key}', '{translations[key]}')"
        else:
            # 没有翻译，返回原样
            return match.group(0)
    
    new_content = re.sub(pattern, replace_match, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    src_dir = '/Users/zerone/WorkBuddy/20260420104543/src'
    i18n_file = '/Users/zerone/WorkBuddy/20260420104543/src/i18n/index.ts'
    
    print("📖 读取中文翻译...")
    translations = load_translations(i18n_file)
    print(f"✅ 找到 {len(translations)} 个翻译")
    
    print("\n🔧 为代码文件添加默认值...")
    modified = []
    
    for root, dirs, files in os.walk(src_dir):
        if 'i18n' in root:
            continue
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                filepath = os.path.join(root, file)
                try:
                    if add_defaults_to_file(filepath, translations):
                        modified.append(filepath.replace(src_dir + '/', ''))
                except Exception as e:
                    print(f"❌ 处理 {filepath} 失败: {e}")
    
    print(f"\n✅ 修改了 {len(modified)} 个文件：")
    for f in modified[:20]:
        print(f"  - {f}")
    if len(modified) > 20:
        print(f"  ... 还有 {len(modified) - 20} 个文件")

if __name__ == '__main__':
    main()
