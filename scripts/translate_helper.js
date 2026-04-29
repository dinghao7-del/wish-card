/**
 * 翻译辅助脚本 - 为 i18n/index.ts 添加缺失的翻译键
 * 使用方法: node scripts/translate_helper.js
 */

const fs = require('fs');
const path = require('path');

const I18N_FILE = path.join(__dirname, '..', 'src', 'i18n', 'index.ts');

// 备份原文件
function backupFile() {
  const backupPath = I18N_FILE + '.backup-' + Date.now();
  fs.copyFileSync(I18N_FILE, backupPath);
  console.log(`已备份原文件到: ${backupPath}`);
  return backupPath;
}

// 读取文件内容
function readFile() {
  return fs.readFileSync(I18N_FILE, 'utf8');
}

// 写回文件
function writeFile(content) {
  fs.writeFileSync(I18N_FILE, content, 'utf8');
  console.log('文件已更新');
}

// 为指定语言添加 welcome 和 auth_callback 翻译
function addTranslationsForLanguage(content, langCode, translations) {
  // 查找该语言的 'guest': { 位置（这是 welcome 对象应该插入的位置）
  const guestPattern = new RegExp(`('${langCode}':\\s*\\{[\\s\\S]*?)(\\s*'guest':\\s*\\{)`);
  const match = content.match(guestPattern);
  
  if (!match) {
    console.log(`警告: 找不到 ${langCode} 的 guest 对象位置`);
    return content;
  }
  
  // 在 'guest': { 之前插入新的翻译对象
  const insertPos = match.index + match[1].length;
  const before = content.substring(0, insertPos);
  const after = content.substring(insertPos);
  
  const translatedContent = before + translations + '\n      ' + after;
  console.log(`已为 ${langCode} 添加翻译`);
  
  return translatedContent;
}

// 主函数
function main() {
  console.log('开始添加缺失的翻译键...');
  
  // 备份
  backupFile();
  
  // 读取内容
  let content = readFile();
  
  // 日语翻译
  const jaTranslations = `      'welcome': {
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
      },
      'auth_callback': {
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
      },`;
  
  // 添加日语翻译
  content = addTranslationsForLanguage(content, 'ja-JP', jaTranslations);
  
  // 写回文件
  writeFile(content);
  
  console.log('翻译添加完成！请运行 TypeScript 检查: npx tsc --noEmit --skipLibCheck');
}

main();
