// Forest Family - 跨平台统一字体系统 (iOS)
// 与Web (Tailwind CSS)、微信小程序、Android 保持完全一致

import UIKit

extension UIFont {
    // MARK: - Font Family Names
    static let fontSansName = "Inter"
    static let fontDisplayName = "PlusJakartaSans"
    static let fontHandwrittenName = "LongCang"
    static let fontArtisticName = "ZCOOLXiaoWei"
    
    // MARK: - Font Sizes (pt) - 与 DESIGN_TOKENS.md 一致
    static let fontSizeH1: CGFloat = 36
    static let fontSizeH2: CGFloat = 30
    static let fontSizeH3: CGFloat = 24
    static let fontSizeH4: CGFloat = 20
    static let fontSizeBodyLarge: CGFloat = 18
    static let fontSizeBodyMedium: CGFloat = 16
    static let fontSizeBodySmall: CGFloat = 14
    static let fontSizeCaption: CGFloat = 12
    
    // MARK: - Font Weights
    static let weightRegular: UIFont.Weight = .regular
    static let weightMedium: UIFont.Weight = .medium
    static let weightSemibold: UIFont.Weight = .semibold
    static let weightBold: UIFont.Weight = .bold
    
    // MARK: - Convenience Methods (System Fonts)
    static func h1(weight: UIFont.Weight = .bold) -> UIFont {
        return UIFont.systemFont(ofSize: fontSizeH1, weight: weight)
    }
    
    static func h2(weight: UIFont.Weight = .bold) -> UIFont {
        return UIFont.systemFont(ofSize: fontSizeH2, weight: weight)
    }
    
    static func h3(weight: UIFont.Weight = .semibold) -> UIFont {
        return UIFont.systemFont(ofSize: fontSizeH3, weight: weight)
    }
    
    static func h4(weight: UIFont.Weight = .semibold) -> UIFont {
        return UIFont.systemFont(ofSize: fontSizeH4, weight: weight)
    }
    
    static func bodyLarge(weight: UIFont.Weight = .regular) -> UIFont {
        return UIFont.systemFont(ofSize: fontSizeBodyLarge, weight: weight)
    }
    
    static func bodyMedium(weight: UIFont.Weight = .regular) -> UIFont {
        return UIFont.systemFont(ofSize: fontSizeBodyMedium, weight: weight)
    }
    
    static func bodySmall(weight: UIFont.Weight = .regular) -> UIFont {
        return UIFont.systemFont(ofSize: fontSizeBodySmall, weight: weight)
    }
    
    static func caption(weight: UIFont.Weight = .regular) -> UIFont {
        return UIFont.systemFont(ofSize: fontSizeCaption, weight: weight)
    }
}

// MARK: - UIFontDescriptor Extension (for custom fonts)
extension UIFontDescriptor {
    static func fontSans(ofSize size: CGFloat, weight: UIFont.Weight = .regular) -> UIFont {
        return UIFont(name: UIFont.fontSansName, size: size) ?? UIFont.systemFont(ofSize: size, weight: weight)
    }
    
    static func fontDisplay(ofSize size: CGFloat, weight: UIFont.Weight = .bold) -> UIFont {
        return UIFont(name: UIFont.fontDisplayName, size: size) ?? UIFont.systemFont(ofSize: size, weight: weight)
    }
}
