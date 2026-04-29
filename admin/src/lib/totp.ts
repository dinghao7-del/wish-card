import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const ISSUER = '愿望卡管理后台';

/**
 * 生成 TOTP Secret
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * 生成 otpauth:// URI
 */
export function generateOtpAuthUri(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

/**
 * 生成 QR Code Data URL
 */
export async function generateQRCode(otpAuthUri: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUri, {
    width: 256,
    margin: 2,
  });
}

/**
 * 验证 TOTP 码
 */
export function verifyToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}
