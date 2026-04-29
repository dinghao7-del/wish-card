const fs = require('fs');
const path = require('path');

// 读取当前的 i18n/index.ts 文件
const filePath = path.join(__dirname, '..', 'src', 'i18n', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 为日语添加缺失的 welcome 和 auth_callback 翻译键
const jaTranslations = `
      'welcome': {
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

// 查找日语部分的 'guest': { 并插入 welcome 和 auth_callback
const jaGuestMatch = content.match(/('ko-KR':\s*\{[\s\S]*?)(\s*'guest':\s*\{)/);
if (jaGuestMatch) {
  console.log('Found Korean guest section, need to find Japanese section...');
}

// 更精确的方法：找到日语部分的 'profile': { 之前插入
// 让我先找到日语对象的位置
const jaPattern = /('ja-JP':\s*\{[\s\S]*?)(\s*'guest':\s*\{)/;
const jaMatch = content.match(jaPattern);

if (jaMatch) {
  console.log('Found Japanese guest section at position:', jaMatch.index);
  // 在 'guest': { 之前插入翻译
  const insertPosition = jaMatch.index + jaMatch[1].length;
  const beforeInsert = content.substring(0, insertPosition);
  const afterInsert = content.substring(insertPosition);
  
  content = beforeInsert + jaTranslations + '\n      ' + afterInsert;
  console.log('Added Japanese translations');
} else {
  console.log('Could not find Japanese section, trying alternative approach...');
}

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');
console.log('Translation update script completed!');
