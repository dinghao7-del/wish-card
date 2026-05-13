package com.forestfamily.app

import android.os.Bundle
import android.webkit.WebView
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 启用 WebView 调试（仅 Debug 构建，防止 Release 版本暴露调试接口）
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        
        // 初始化认证管理器（离线模式）
        ClerkAuthManager.getInstance().initialize(this)
    }
    
    override fun onResume() {
        super.onResume()
        
        // 禁用系统字体大小缩放（修复三星/MIUI/EMUI 系统字体设置导致的布局走形）
        // 必须在 bridge 初始化后执行
        bridge?.webView?.settings?.textZoom = 100
    }

    /**
     * 重写返回键行为：
     * 1. 优先让 WebView 消费（触发 JS 层的 backButton 事件）
     * 2. WebView 无法消费时（无历史记录）才走系统默认逻辑
     */
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (bridge != null) {
            super.onBackPressed()
        } else {
            moveTaskToBack(true)
        }
    }
}
