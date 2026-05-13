package com.forestfamily.app

import android.content.Context
import android.util.Log

/**
 * 简化的认证管理器（不依赖 Clerk SDK）
 * Clerk SDK 需要 Firebase/Google Services 配置，暂时禁用
 */
class ClerkAuthManager private constructor() {

    companion object {
        @Volatile
        private var instance: ClerkAuthManager? = null

        fun getInstance(): ClerkAuthManager {
            return instance ?: synchronized(this) {
                instance ?: ClerkAuthManager().also { instance = it }
            }
        }
    }

    fun initialize(context: Context) {
        Log.d("ClerkAuthManager", "认证管理器初始化（离线模式）")
    }

    fun isSignedIn(): Boolean {
        return false  // 离线模式默认未登录
    }

    fun getUserId(): String? {
        return null
    }

    fun getUserEmail(): String? {
        return null
    }

    fun getUserName(): String? {
        return null
    }

    suspend fun getToken(): String? {
        return null
    }

    suspend fun signOut() {
        // 离线模式无需操作
    }

    fun getAuthState(): Map<String, Any?> {
        return mapOf(
            "isSignedIn" to false,
            "userId" to null,
            "email" to null,
            "name" to null,
            "offlineMode" to true
        )
    }
}
