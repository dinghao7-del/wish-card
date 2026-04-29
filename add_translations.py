#!/usr/bin/env python3
"""
脚本：为 i18n/index.ts 添加缺失的翻译键
用法：python3 add_translations.py
"""

import re

# 读取原文件
with open('src/i18n/index.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 为每种语言定义需要添加的 welcome 和 auth_callback 翻译键
new_translations = {
    'en-US': {
        'welcome': """
        'title': 'WishCard',
        'subtitle': 'Unlock Happiness with Effort 🌱',
        'tagline': 'Record Every Step of Growth',
        'skip': 'Skip',
        'skip_error': 'Skip failed, please retry',
        'guest_name': 'Mom',
        'guest_mode': 'Explore First (Guest Mode)',
        'network_error': 'Network connection failed. Please check your network and retry, or use Guest Mode first',
        'network_error_verify': 'Network connection failed. Please check your network and retry',
        'register': {
          'title': 'Welcome to Register',
          'subtitle': 'Only parents can register as admin 🌱',
          'error_nickname': 'Please enter nickname',
          'error_password': 'Please enter password',
          'error_mismatch': 'Passwords do not match 🍃',
          'error_password_length': 'Password must be at least 6 characters',
          'nickname': 'Admin Nickname',
          'nickname_placeholder': 'e.g. Mom',
          'password': 'Login Password',
          'password_placeholder': 'Enter admin password',
          'confirm_password': 'Confirm Password',
          'confirm_password_placeholder': 'Enter password again',
          'submit': 'Register Account'
        },
        'login': {
          'title': 'Welcome to Login',
          'subtitle': "Enter account and password to start today's wishes 🌱",
          'error_empty': 'Please enter account',
          'error_password': 'Please enter password',
          'error_invalid': 'Username or password is incorrect, please check 🍃',
          'username': 'Account',
          'username_placeholder': 'Email or Nickname',
          'password': 'Password',
          'password_placeholder': 'Admin password',
          'submit': 'Login Account',
          'has_account': 'Already have an account? Login →'
        },
        'otp': {
          'phone_email': 'Phone or Email',
          'placeholder': 'Phone or Email',
          'error_empty': 'Please enter phone or email',
          'error_send': 'Failed to send verification code',
          'code_sent': 'Verification code sent to {0}',
          'verify_title': 'Enter Verification Code',
          'verify_subtitle': 'Verification code sent to {0}',
          'code_placeholder': 'Please enter verification code',
          'error_no_code': 'Please enter verification code',
          'error_verify': 'Verification failed',
          'verify': 'Verify',
          'send': 'Send Code',
          'resend': 'Resend'
        },
        'my_family': '{0}\\'s Family',
        'no_account': 'No account? Register →'
      },
      'auth_callback': {
        'no_valid_info': 'No valid verification information found',
        'verify_failed': 'Verification failed',
        'default_parent': 'Parent',
        'family_name': '{0}\\'s Family',
        'create_user_failed': 'Failed to create user data',
        'verifying': 'Verifying...',
        'please_wait': 'Please wait, completing email verification',
        'verify_success': 'Verification Successful!',
        'redirecting': 'Redirecting to home page...',
        'verify_failed_title': 'Verification Failed',
        'back_to_login': 'Back to Login'
      },
"""
    }
}

print("这个脚本需要更复杂的实现来处理 TypeScript 对象格式")
print("建议手动编辑或使用专门的工具")
