package com.forestfamily.app.data.remote

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.forestfamily.app.BuildConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "forest_family_prefs")

/**
 * Supabase 客户端 - 简化版本
 * 注意：需要配置有效的 Supabase URL 和 Anon Key
 */
object SupabaseClient {
    
    val supabaseUrl: String = BuildConfig.SUPABASE_URL
    val supabaseKey: String = BuildConfig.SUPABASE_ANON_KEY
    
    // 标记是否已配置
    val isConfigured: Boolean
        get() = supabaseUrl.isNotBlank() && 
                 supabaseKey.isNotBlank() &&
                 !supabaseUrl.contains("placeholder")
}

/**
 * 应用偏好设置存储键
 */
object PrefsKeys {
    val MEMBER_ID = stringPreferencesKey("member_id")
    val FAMILY_ID = stringPreferencesKey("family_id")
    val USER_ID = stringPreferencesKey("user_id")
}

/**
 * 保存会话到 DataStore
 */
suspend fun DataStore<Preferences>.saveSession(userId: String, memberId: String, familyId: String) {
    edit { prefs ->
        prefs[PrefsKeys.USER_ID] = userId
        prefs[PrefsKeys.MEMBER_ID] = memberId
        prefs[PrefsKeys.FAMILY_ID] = familyId
    }
}

/**
 * 清除 DataStore 会话
 */
suspend fun DataStore<Preferences>.clearSession() {
    edit { prefs ->
        prefs.remove(PrefsKeys.USER_ID)
        prefs.remove(PrefsKeys.MEMBER_ID)
        prefs.remove(PrefsKeys.FAMILY_ID)
    }
}

/**
 * 从 DataStore 获取会话信息
 */
suspend fun DataStore<Preferences>.getSession(): SessionData? {
    val prefs = data.first()
    val userId = prefs[PrefsKeys.USER_ID]
    val memberId = prefs[PrefsKeys.MEMBER_ID]
    val familyId = prefs[PrefsKeys.FAMILY_ID]
    
    return if (userId != null && memberId != null && familyId != null) {
        SessionData(userId, memberId, familyId)
    } else {
        null
    }
}

data class SessionData(
    val userId: String,
    val memberId: String,
    val familyId: String
)
