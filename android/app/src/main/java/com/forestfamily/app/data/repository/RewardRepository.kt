package com.forestfamily.app.data.repository

import com.forestfamily.app.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.channels.awaitClose
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RewardRepository @Inject constructor() {

    private val _rewards = MutableStateFlow<List<Reward>>(emptyList())
    private val _redemptions = MutableStateFlow<List<Redemption>>(emptyList())

    // ==================== 奖励相关 ====================

    suspend fun createReward(
        familyId: String,
        title: String,
        description: String?,
        starCost: Int,
        icon: String = "🎁",
        stock: Int = -1
    ): Reward {
        val reward = Reward(
            id = java.util.UUID.randomUUID().toString(),
            familyId = familyId,
            title = title,
            description = description,
            starCost = starCost,
            icon = icon,
            stock = stock,
            isActive = true,
            createdAt = java.time.Instant.now().toString()
        )
        _rewards.value = _rewards.value + reward
        return reward
    }

    suspend fun getRewardsByFamilyId(familyId: String): Result<List<Reward>> = runCatching {
        _rewards.value.filter { it.familyId == familyId && it.isActive }
    }

    suspend fun getRewardById(rewardId: String): Reward? {
        return _rewards.value.find { it.id == rewardId }
    }

    suspend fun updateReward(
        rewardId: String,
        title: String? = null,
        description: String? = null,
        starCost: Int? = null,
        stock: Int? = null
    ): Reward {
        val reward = _rewards.value.find { it.id == rewardId }
            ?: throw Exception("Reward not found")
        val updated = reward.copy(
            title = title ?: reward.title,
            description = description ?: reward.description,
            starCost = starCost ?: reward.starCost,
            stock = stock ?: reward.stock
        )
        _rewards.value = _rewards.value.map { if (it.id == rewardId) updated else it }
        return updated
    }

    suspend fun deleteReward(rewardId: String): Result<Unit> = runCatching {
        _rewards.value = _rewards.value.map {
            if (it.id == rewardId) it.copy(isActive = false) else it
        }
    }

    // ==================== 兑换相关 ====================

    suspend fun createRedemption(
        rewardId: String,
        memberId: String
    ): Redemption {
        val reward = _rewards.value.find { it.id == rewardId }
            ?: throw Exception("Reward not found")
        
        val redemption = Redemption(
            id = java.util.UUID.randomUUID().toString(),
            rewardId = rewardId,
            memberId = memberId,
            createdAt = java.time.Instant.now().toString()
        )
        _redemptions.value = _redemptions.value + redemption
        return redemption
    }

    suspend fun getRedemptionsByFamilyId(familyId: String): Result<List<Redemption>> = runCatching {
        val familyRewards = _rewards.value.filter { it.familyId == familyId }.map { it.id }.toSet()
        _redemptions.value.filter { it.rewardId in familyRewards }
    }

    suspend fun getRedemptionsByMemberId(memberId: String): Result<List<Redemption>> = runCatching {
        _redemptions.value.filter { it.memberId == memberId }
    }

    suspend fun updateRedemptionStatus(redemptionId: String, status: RedemptionStatus): Redemption {
        val redemption = _redemptions.value.find { it.id == redemptionId }
            ?: throw Exception("Redemption not found")
        val updated = redemption.copy(status = status)
        _redemptions.value = _redemptions.value.map { if (it.id == redemptionId) updated else it }
        return updated
    }

    suspend fun approveRedemption(redemptionId: String): Redemption {
        return updateRedemptionStatus(redemptionId, RedemptionStatus.APPROVED)
    }

    suspend fun rejectRedemption(redemptionId: String): Redemption {
        return updateRedemptionStatus(redemptionId, RedemptionStatus.REJECTED)
    }

    // ==================== 实时订阅 ====================

    fun subscribeToRewards(familyId: String): Flow<Reward> = callbackFlow {
        awaitClose { }
    }
}
