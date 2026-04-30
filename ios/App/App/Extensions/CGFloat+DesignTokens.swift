// Forest Family - 跨平台统一样距和圆角系统 (iOS)
// 与Web (Tailwind CSS)、微信小程序、Android 保持完全一致

import UIKit

extension CGFloat {
    // MARK: - Spacing System (pt) - 与 DESIGN_TOKENS.md 一致
    static let spacing1: CGFloat = 4
    static let spacing2: CGFloat = 8
    static let spacing3: CGFloat = 12
    static let spacing4: CGFloat = 16
    static let spacing5: CGFloat = 20
    static let spacing6: CGFloat = 24
    static let spacing8: CGFloat = 32
    static let spacing10: CGFloat = 40
    static let spacing12: CGFloat = 48
    static let spacing16: CGFloat = 64
    
    // MARK: - Border Radius System (pt) - 与 DESIGN_TOKENS.md 一致
    static let radiusSM: CGFloat = 4
    static let radiusMD: CGFloat = 8
    static let radiusLG: CGFloat = 12
    static let radiusXL: CGFloat = 16
    static let radius2XL: CGFloat = 24
    static let radiusFull: CGFloat = 9999
}

// MARK: - UIView Extension (方便的间距和圆角设置)
extension UIView {
    // Spacing helpers
    func addPadding(_ insets: UIEdgeInsets) {
        // 为AutoLayout添加内边距的辅助方法
    }
    
    // Border radius helpers
    func setCornerRadius(_ radius: CGFloat) {
        self.layer.cornerRadius = radius
        self.clipsToBounds = true
    }
    
    func setRoundedFull() {
        self.layer.cornerRadius = self.frame.height / 2
        self.clipsToBounds = true
    }
}

// MARK: - UIButton Extension (统一样式)
extension UIButton {
    func applyPrimaryStyle() {
        self.backgroundColor = UIColor.primary
        self.setTitleColor(.white, for: .normal)
        self.layer.cornerRadius = CGFloat.radiusFull
        self.contentEdgeInsets = UIEdgeInsets(top: 12, left: 24, bottom: 12, right: 24)
        self.titleLabel?.font = UIFont.bodyMedium(weight: .semibold)
    }
    
    func applySecondaryStyle() {
        self.backgroundColor = .clear
        self.setTitleColor(UIColor.primary, for: .normal)
        self.layer.borderWidth = 2
        self.layer.borderColor = UIColor.primary.cgColor
        self.layer.cornerRadius = CGFloat.radiusFull
        self.contentEdgeInsets = UIEdgeInsets(top: 12, left: 24, bottom: 12, right: 24)
        self.titleLabel?.font = UIFont.bodyMedium(weight: .semibold)
    }
}

// MARK: - UIView Extension (统一卡片样式)
extension UIView {
    func applyCardStyle() {
        self.backgroundColor = UIColor.background
        self.layer.cornerRadius = CGFloat.radius2XL
        self.layer.shadowColor = UIColor.black.cgColor
        self.layer.shadowOpacity = 0.05
        self.layer.shadowOffset = CGSize(width: 0, height: 2)
        self.layer.shadowRadius = 8
    }
}
