package com.forestfamily.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * 家庭数据模型
 */
@Serializable
data class Family(
    val id: String = "",
    val name: String = "",
    @SerialName("invite_code") val inviteCode: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

/**
 * 家庭成员数据模型
 */
@Serializable
data class Member(
    val id: String = "",
    @SerialName("family_id") val familyId: String? = null,
    val name: String = "",
    val avatar: String? = null,
    val role: MemberRole = MemberRole.CHILD,
    val stars: Int = 0,
    val color: String? = null,
    val pin: String? = null,
    val password: String? = null,
    @SerialName("user_id") val userId: String? = null,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
enum class MemberRole {
    @SerialName("parent") PARENT,
    @SerialName("child") CHILD
}

/**
 * 任务数据模型
 */
@Serializable
data class Task(
    val id: String = "",
    @SerialName("family_id") val familyId: String? = null,
    val title: String = "",
    val description: String? = null,
    @SerialName("star_amount") val starAmount: Int = 0,
    @SerialName("assignee_ids") val assigneeIds: List<String> = emptyList(),
    @SerialName("creator_id") val creatorId: String? = null,
    val status: TaskStatus = TaskStatus.PENDING,
    val priority: TaskPriority = TaskPriority.MEDIUM,
    @SerialName("is_habit") val isHabit: Boolean = false,
    @SerialName("target_count") val targetCount: Int = 1,
    @SerialName("current_count") val currentCount: Int = 0,
    val completed: Boolean = false,
    @SerialName("completed_at") val completedAt: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    val icon: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
enum class TaskStatus {
    @SerialName("pending") PENDING,
    @SerialName("in_progress") IN_PROGRESS,
    @SerialName("reviewing") REVIEWING,
    @SerialName("completed") COMPLETED
}

@Serializable
enum class TaskPriority {
    @SerialName("low") LOW,
    @SerialName("medium") MEDIUM,
    @SerialName("high") HIGH;
    
    val label: String get() = when (this) {
        LOW -> "低"
        MEDIUM -> "中"
        HIGH -> "高"
    }
}

/**
 * 习惯数据模型
 */
@Serializable
data class Habit(
    val id: String = "",
    @SerialName("family_id") val familyId: String? = null,
    val title: String = "",
    val description: String? = null,
    val frequency: HabitFrequency = HabitFrequency.DAILY,
    @SerialName("star_amount") val starAmount: Int = 0,
    @SerialName("assignee_ids") val assigneeIds: List<String> = emptyList(),
    @SerialName("creator_id") val creatorId: String? = null,
    val icon: String? = null,
    @SerialName("current_count") val currentCount: Int = 0,
    @SerialName("target_count") val targetCount: Int = 1,
    @SerialName("last_completed_date") val lastCompletedDate: String? = null,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
enum class HabitFrequency {
    @SerialName("daily") DAILY,
    @SerialName("weekly") WEEKLY,
    @SerialName("custom") CUSTOM
}

/**
 * 奖励数据模型
 */
@Serializable
data class Reward(
    val id: String = "",
    @SerialName("family_id") val familyId: String? = null,
    val title: String = "",
    val description: String? = null,
    @SerialName("star_cost") val starCost: Int = 0,
    val icon: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val category: String? = null,
    val stock: Int? = null,
    val status: RewardStatus = RewardStatus.AVAILABLE,
    @SerialName("creator_id") val creatorId: String? = null,
    @SerialName("redeemed_by") val redeemedBy: String? = null,
    @SerialName("redeemed_at") val redeemedAt: String? = null,
    @SerialName("is_active") val isActive: Boolean = true,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
enum class RewardStatus {
    @SerialName("available") AVAILABLE,
    @SerialName("pending_approval") PENDING_APPROVAL,
    @SerialName("redeemed") REDEEMED
}

/**
 * 兑换记录
 */
@Serializable
data class Redemption(
    val id: String = "",
    @SerialName("reward_id") val rewardId: String = "",
    @SerialName("member_id") val memberId: String = "",
    val status: RedemptionStatus = RedemptionStatus.PENDING,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
enum class RedemptionStatus {
    @SerialName("pending") PENDING,
    @SerialName("approved") APPROVED,
    @SerialName("rejected") REJECTED
}

/**
 * 星星交易记录
 */
@Serializable
data class StarTransaction(
    val id: String = "",
    @SerialName("family_id") val familyId: String? = null,
    @SerialName("member_id") val memberId: String = "",
    val amount: Int = 0,
    val type: TransactionType = TransactionType.EARN,
    val reason: String = "",
    @SerialName("related_task_id") val relatedTaskId: String? = null,
    @SerialName("related_habit_id") val relatedHabitId: String? = null,
    @SerialName("related_reward_id") val relatedRewardId: String? = null,
    @SerialName("created_at") val createdAt: String = ""
)

@Serializable
enum class TransactionType {
    @SerialName("earn") EARN,
    @SerialName("spend") SPEND
}

/**
 * 四象限任务分类
 */
enum class Quadrant(val priority: Int) {
    Q1_IMPORTANT_URGENT(1),    // 重要且紧急
    Q2_IMPORTANT_NOT_URGENT(2), // 重要不紧急
    Q3_NOT_IMPORTANT_URGENT(3), // 不重要但紧急
    Q4_NOT_IMPORTANT_NOT_URGENT(4) // 不重要不紧急
}

/**
 * 登录状态
 */
sealed class AuthState {
    object Loading : AuthState()
    object Unauthenticated : AuthState()
    data class Authenticated(val member: Member, val family: Family) : AuthState()
    data class Error(val message: String) : AuthState()
}
