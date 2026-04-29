package com.forestfamily.app.ui.auth

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forestfamily.app.data.model.*
import com.forestfamily.app.data.remote.dataStore
import com.forestfamily.app.data.remote.saveSession
import com.forestfamily.app.data.remote.clearSession
import com.forestfamily.app.data.remote.getSession
import com.forestfamily.app.data.repository.FamilyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val familyRepository: FamilyRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private val _currentMember = MutableStateFlow<Member?>(null)
    val currentMember: StateFlow<Member?> = _currentMember.asStateFlow()

    private val _currentFamily = MutableStateFlow<Family?>(null)
    val currentFamily: StateFlow<Family?> = _currentFamily.asStateFlow()

    private val _familyMembers = MutableStateFlow<List<Member>>(emptyList())
    val familyMembers: StateFlow<List<Member>> = _familyMembers.asStateFlow()

    // Mock user for demo
    private var mockUserId: String? = null

    init {
        viewModelScope.launch {
            checkExistingSession()
        }
    }

    private suspend fun checkExistingSession() {
        _uiState.value = AuthUiState.Loading
        try {
            // 从 DataStore 获取保存的会话
            val savedSession = context.dataStore.getSession()
            if (savedSession != null) {
                mockUserId = savedSession.userId
                // 加载成员和家庭信息
                val member = familyRepository.getMemberById(savedSession.memberId)
                val family = familyRepository.getFamilyById(savedSession.familyId)
                if (member != null && family != null) {
                    _currentMember.value = member
                    _currentFamily.value = family
                    _familyMembers.value = familyRepository.getMembersByFamilyId(family.id).getOrNull() ?: emptyList()
                    _uiState.value = AuthUiState.Authenticated(member, family)
                    return
                }
            }
            _uiState.value = AuthUiState.Unauthenticated
        } catch (e: Exception) {
            _uiState.value = AuthUiState.Unauthenticated
        }
    }

    /**
     * 模拟登录
     */
    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                // 简单的验证
                if (email.isBlank() || password.length < 6) {
                    _uiState.value = AuthUiState.Error("邮箱或密码格式不正确")
                    return@launch
                }
                
                // 创建模拟用户ID
                mockUserId = java.util.UUID.randomUUID().toString()
                
                _uiState.value = AuthUiState.SignUpSuccess
                
            } catch (e: Exception) {
                _uiState.value = AuthUiState.Error(e.message ?: "登录失败")
            }
        }
    }

    /**
     * 模拟注册
     */
    fun signUp(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                if (email.isBlank() || password.length < 6) {
                    _uiState.value = AuthUiState.Error("邮箱或密码格式不正确")
                    return@launch
                }
                
                mockUserId = java.util.UUID.randomUUID().toString()
                _uiState.value = AuthUiState.SignUpSuccess
                
            } catch (e: Exception) {
                _uiState.value = AuthUiState.Error(e.message ?: "注册失败")
            }
        }
    }

    /**
     * 创建新家庭
     */
    fun createFamily(familyName: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                val family = familyRepository.createFamily(familyName)
                _currentFamily.value = family
                _uiState.value = AuthUiState.FamilyCreated(family)
            } catch (e: Exception) {
                _uiState.value = AuthUiState.Error(e.message ?: "创建家庭失败")
            }
        }
    }

    /**
     * 通过邀请码加入家庭
     */
    fun joinFamilyByInviteCode(inviteCode: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                val family = familyRepository.getFamilyByInviteCode(inviteCode)
                if (family != null) {
                    _currentFamily.value = family
                    _uiState.value = AuthUiState.FamilyJoined(family)
                } else {
                    _uiState.value = AuthUiState.Error("邀请码无效")
                }
            } catch (e: Exception) {
                _uiState.value = AuthUiState.Error(e.message ?: "加入家庭失败")
            }
        }
    }

    /**
     * 添加家庭成员
     */
    fun addMember(name: String, role: MemberRole, avatar: String = "👶") {
        val family = _currentFamily.value ?: return
        
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            try {
                val member = familyRepository.addMember(
                    familyId = family.id,
                    name = name,
                    role = role,
                    avatar = avatar,
                    userId = mockUserId
                )
                _currentMember.value = member
                _familyMembers.value = _familyMembers.value + member
                
                // 保存会话
                mockUserId?.let { 
                    context.dataStore.saveSession(it, member.id, family.id)
                }
                
                _uiState.value = AuthUiState.MemberAdded(member)
            } catch (e: Exception) {
                _uiState.value = AuthUiState.Error(e.message ?: "添加成员失败")
            }
        }
    }

    /**
     * 选择成员登录
     */
    fun selectMember(member: Member) {
        val family = _currentFamily.value ?: return
        
        viewModelScope.launch {
            _currentMember.value = member
            _uiState.value = AuthUiState.Authenticated(member, family)
            
            // 更新会话
            mockUserId?.let {
                context.dataStore.saveSession(it, member.id, family.id)
            }
        }
    }

    /**
     * 加载家庭成员列表
     */
    fun loadFamilyMembers(familyId: String) {
        viewModelScope.launch {
            try {
                val members = familyRepository.getMembersByFamilyId(familyId)
                _familyMembers.value = members.getOrNull() ?: emptyList()
            } catch (e: Exception) {
                // 忽略错误
            }
        }
    }

    /**
     * 登出
     */
    fun logout() {
        viewModelScope.launch {
            context.dataStore.clearSession()
            mockUserId = null
            _currentMember.value = null
            _currentFamily.value = null
            _familyMembers.value = emptyList()
            _uiState.value = AuthUiState.Unauthenticated
        }
    }

    /**
     * 重置状态
     */
    fun resetState() {
        _uiState.value = AuthUiState.Unauthenticated
    }
}

/**
 * 认证 UI 状态
 */
sealed class AuthUiState {
    object Idle : AuthUiState()
    object Loading : AuthUiState()
    object Unauthenticated : AuthUiState()
    object SignUpSuccess : AuthUiState()
    data class NeedsFamilySetup(val userId: String) : AuthUiState()
    data class FamilyCreated(val family: Family) : AuthUiState()
    data class FamilyJoined(val family: Family) : AuthUiState()
    data class MemberAdded(val member: Member) : AuthUiState()
    data class Authenticated(val member: Member, val family: Family) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}
