package com.forestfamily.app.data.repository

import com.forestfamily.app.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FamilyRepository @Inject constructor() {

    private val _mockFamily = MutableStateFlow<Family?>(null)
    val mockFamily: Flow<Family?> = _mockFamily.asStateFlow()

    // ==================== 家庭相关 ====================

    suspend fun createFamily(name: String): Family {
        val family = Family(
            id = java.util.UUID.randomUUID().toString(),
            name = name,
            inviteCode = generateInviteCode(),
            createdAt = java.time.Instant.now().toString()
        )
        _mockFamily.value = family
        return family
    }

    suspend fun getFamilyByInviteCode(inviteCode: String): Family? {
        return _mockFamily.value
    }

    suspend fun getFamilyById(familyId: String): Family? {
        return _mockFamily.value
    }

    suspend fun updateFamily(familyId: String, updates: Map<String, Any>): Family {
        val current = _mockFamily.value ?: throw Exception("Family not found")
        val updated = current.copy(name = updates["name"] as? String ?: current.name)
        _mockFamily.value = updated
        return updated
    }

    // ==================== 成员相关 ====================

    private val _mockMembers = MutableStateFlow<List<Member>>(emptyList())

    suspend fun addMember(
        familyId: String,
        name: String,
        role: MemberRole,
        avatar: String = "👶",
        color: String = "#4CAF50",
        userId: String? = null
    ): Member {
        val member = Member(
            id = java.util.UUID.randomUUID().toString(),
            familyId = familyId,
            name = name,
            avatar = avatar,
            role = role,
            color = color,
            userId = userId,
            createdAt = java.time.Instant.now().toString()
        )
        _mockMembers.value = _mockMembers.value + member
        return member
    }

    suspend fun getMemberById(memberId: String): Member? {
        return _mockMembers.value.find { it.id == memberId }
    }

    suspend fun getMemberByUserId(userId: String): Member? {
        return _mockMembers.value.find { it.userId == userId }
    }

    suspend fun getMembersByFamilyId(familyId: String): Result<List<Member>> = runCatching {
        _mockMembers.value.filter { it.familyId == familyId }
    }

    suspend fun updateMemberStars(memberId: String, stars: Int): Result<Unit> = runCatching {
        val updatedMembers = _mockMembers.value.map {
            if (it.id == memberId) it.copy(stars = stars) else it
        }
        _mockMembers.value = updatedMembers
    }

    suspend fun updateMember(
        memberId: String,
        updates: Map<String, Any>
    ): Member {
        val member = _mockMembers.value.find { it.id == memberId }
            ?: throw Exception("Member not found")
        val updated = member.copy(
            name = updates["name"] as? String ?: member.name,
            avatar = updates["avatar"] as? String ?: member.avatar,
            color = updates["color"] as? String ?: member.color
        )
        _mockMembers.value = _mockMembers.value.map {
            if (it.id == memberId) updated else it
        }
        return updated
    }

    suspend fun deleteMember(memberId: String): Result<Unit> = runCatching {
        _mockMembers.value = _mockMembers.value.filter { it.id != memberId }
    }

    @Suppress("UNUSED")
    fun subscribeToMembers(familyId: String): Flow<List<Member>> = _mockMembers

    private fun generateInviteCode(): String {
        return (('A'..'Z') + ('0'..'9')).shuffled().take(6).joinToString("")
    }
}
