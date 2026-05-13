/**
 * 图片处理工具集
 * 统一管理用户上传图片的校验、压缩、格式化
 *
 * 规则：
 * - 最大文件大小: 2MB
 * - 最大像素: 1200px (长边)
 * - 输出格式: JPEG (quality=0.8)
 * - 支持格式: image/jpeg, image/png, image/webp, image/gif
 */

export interface ImageProcessOptions {
  /** 最大文件大小 (bytes), 默认 2MB */
  maxSize?: number;
  /** 最大像素宽度/高度, 默认 1200 */
  maxDimension?: number;
  /** JPEG 输出质量 0-1, 默认 0.8 */
  quality?: number;
  /** 允许的 MIME 类型列表, 默认常见图片格式 */
  acceptTypes?: string[];
}

export interface ProcessResult {
  success: boolean;
  dataUrl?: string;       // 压缩后的 DataURL (JPEG base64)
  file?: File;            // 压缩后的 File 对象
  originalSize?: number;  // 原始大小 (bytes)
  processedSize?: number; // 处理后大小 (bytes)
  error?: string;
  width?: number;
  height?: number;
}

const DEFAULT_OPTIONS: ImageProcessOptions = {
  maxSize: 2 * 1024 * 1024,   // 2MB
  maxDimension: 1200,
  quality: 0.8,
  acceptTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

/**
 * 校验图片文件是否符合要求
 * 返回错误信息或 null (通过)
 */
export function validateImageFile(file: File, options?: Partial<ImageProcessOptions>): string | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 格式检查
  if (!opts.acceptTypes!.includes(file.type)) {
    return `不支持 ${file.type} 格式，请上传 JPG/PNG/WebP/GIF 图片`;
  }

  // 大小检查
  if (file.size > opts.maxSize!) {
    const mb = (opts.maxSize! / 1024 / 1024).toFixed(0);
    return `图片太大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，请控制在 ${mb}MB 以内`;
  }

  return null;
}

/**
 * 核心方法：处理用户上传的图片文件
 * 流程: 校验 → 加载 → 缩放 → 压缩 → 输出 DataURL + File
 */
export function processImageFile(
  file: File,
  options?: Partial<ImageProcessOptions>
): Promise<ProcessResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  return new Promise((resolve) => {
    // Step 1: 格式/大小校验
    const validationError = validateImageFile(file, options);
    if (validationError) {
      resolve({ success: false, error: validationError });
      return;
    }

    // Step 2: 通过 FileReader 读取为 DataURL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      // Step 3: 用 Canvas 加载并压缩
      const img = new Image();
      img.onload = () => {
        const { width, height } = calculateDimensions(img.width, img.height, opts.maxDimension!);

        // Canvas 绘制 + 导出
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({ success: false, error: 'Canvas 初始化失败' });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 导出为 JPEG (质量可控)
        const outputDataUrl = canvas.toDataURL('image/jpeg', opts.quality);
        const processedSize = Math.round((outputDataUrl.length - 22) * 3 / 4); // base64 近似

        // 转换回 File 对象
        const blob = dataUrlToFile(outputDataUrl, `compressed_${Date.now()}.jpg`, 'image/jpeg');

        resolve({
          success: true,
          dataUrl: outputDataUrl,
          file: blob,
          originalSize,
          processedSize,
          width,
          height,
        });
      };

      img.onerror = () => resolve({ success: false, error: '图片加载失败' });
      img.src = dataUrl;
    };

    reader.onerror = () => resolve({ success: false, error: '文件读取失败' });
    reader.readAsDataURL(file);
  });
}

/**
 * 从 input 元素直接获取并处理图片
 * 使用方式:
 *   const result = await processImageFromInput(event.target.files[0]);
 */
export async function processImageFromInput(
  file: File | undefined | null,
  options?: Partial<ImageProcessOptions>
): Promise<ProcessResult> {
  if (!file) {
    return { success: false, error: '未选择文件' };
  }
  return processImageFile(file, options);
}

/**
 * 计算保持宽高比的缩放尺寸
 */
function calculateDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxDim: number
): { width: number; height: number } {
  if (naturalWidth <= maxDim && naturalHeight <= maxDim) {
    return { width: naturalWidth, height: naturalHeight };
  }

  const ratio = Math.min(maxDim / naturalWidth, maxDim / naturalHeight);
  return {
    width: Math.round(naturalWidth * ratio),
    height: Math.round(naturalHeight * ratio),
  };
}

/**
 * DataURL 转 File 对象
 */
function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): File {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], fileName, { type: mimeType });
}

/**
 * 格式化文件大小显示
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
