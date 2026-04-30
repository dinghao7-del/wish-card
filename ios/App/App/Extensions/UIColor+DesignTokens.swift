// Forest Family - 跨平台统一设计Token (iOS)
// 与Web (Tailwind CSS)、微信小程序、Android 保持完全一致

import UIKit

extension UIColor {
    // MARK: - Primary Colors (动态颜色 - 自动适配Light/Dark模式)
    static let primary = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#81d67a") : UIColor(hex: "#006e1c")
    }
    
    static let primaryContainer = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#008126") : UIColor(hex: "#4caf50")
    }
    
    static let primaryDark = UIColor(hex: "#005a15")
    
    // MARK: - Secondary Colors (动态颜色)
    static let secondary = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#f0e269") : UIColor(hex: "#686000")
    }
    
    static let secondaryContainer = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#3f4a3c") : UIColor(hex: "#f0e269")
    }
    
    static let secondaryDark = UIColor(hex: "#4a4400")
    
    // MARK: - Background & Surface (动态颜色)
    static let background = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#1b1c1a") : UIColor(hex: "#fbf9f5")
    }
    
    static let surface = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#1b1c1a") : UIColor(hex: "#fbf9f5")
    }
    
    static let surfaceContainerLow = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#242522") : UIColor(hex: "#f5f3ef")
    }
    
    static let surfaceContainer = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#2b2c29") : UIColor(hex: "#efeeea")
    }
    
    static let surfaceContainerHigh = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#31322f") : UIColor(hex: "#eae8e4")
    }
    
    static let surfaceContainerHighest = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#373834") : UIColor(hex: "#e4e2de")
    }
    
    // MARK: - Text Colors (动态颜色)
    static let textPrimary = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#e4e2de") : UIColor(hex: "#1b1c1a")
    }
    
    static let textSecondary = UIColor { traitCollection in
        traitCollection.userInterfaceStyle == .dark ?
        UIColor(hex: "#becab9") : UIColor(hex: "#3f4a3c")
    }
    
    static let textOnPrimary = UIColor.white
    
    // MARK: - Outline Colors
    static let outline = UIColor(hex: "#6f7a6b")
    static let outlineVariant = UIColor(hex: "#becab9")
    
    // MARK: - Quadrant Colors (固定颜色，不随模式变化)
    static let q1Red = UIColor(hex: "#E57373")
    static let q2Blue = UIColor(hex: "#64B5F6")
    static let q3Yellow = UIColor(hex: "#FFD54F")
    static let q4Gray = UIColor(hex: "#90A4AE")
    
    // MARK: - Status Colors (固定颜色)
    static let statusPending = UIColor(hex: "#FFB74D")
    static let statusInProgress = UIColor(hex: "#4FC3F7")
    static let statusReviewing = UIColor(hex: "#BA68C8")
    static let statusCompleted = UIColor(hex: "#81C784")
}

// MARK: - Hex Color Initializer
extension UIColor {
    convenience init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            red: CGFloat(r) / 255,
            green: CGFloat(g) / 255,
            blue: CGFloat(b) / 255,
            alpha: CGFloat(a) / 255
        )
    }
}

// MARK: - SwiftUI Color Extension
import SwiftUI

extension Color {
    static let primaryToken = Color(UIColor.primary)
    static let primaryContainerToken = Color(UIColor.primaryContainer)
    static let secondaryToken = Color(UIColor.secondary)
    static let secondaryContainerToken = Color(UIColor.secondaryContainer)
    static let backgroundToken = Color(UIColor.background)
    static let surfaceToken = Color(UIColor.surface)
    
    // 建议添加更多 Token
    static let textPrimaryToken = Color(UIColor.textPrimary)
    static let textSecondaryToken = Color(UIColor.textSecondary)
}
