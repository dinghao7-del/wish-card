package com.forestfamily.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * 导航路由定义
 */
sealed class Screen(val route: String) {
    // 认证相关
    object Welcome : Screen("welcome")
    object Login : Screen("login")
    object Register : Screen("register")
    object CreateFamily : Screen("create_family")
    object JoinFamily : Screen("join_family")
    object SelectMember : Screen("select_member")
    
    // 主页面
    object Home : Screen("home")
    object Tasks : Screen("tasks")
    object Habits : Screen("habits")
    object Rewards : Screen("rewards")
    object Profile : Screen("profile")
    
    // 详情页
    object TaskDetail : Screen("task/{taskId}") {
        fun createRoute(taskId: String) = "task/$taskId"
    }
    object CreateTask : Screen("create_task")
    object EditTask : Screen("edit_task/{taskId}") {
        fun createRoute(taskId: String) = "edit_task/$taskId"
    }
    
    object HabitDetail : Screen("habit/{habitId}") {
        fun createRoute(habitId: String) = "habit/$habitId"
    }
    object CreateHabit : Screen("create_habit")
    
    object RewardDetail : Screen("reward/{rewardId}") {
        fun createRoute(rewardId: String) = "reward/$rewardId"
    }
    object CreateReward : Screen("create_reward")
    
    object MemberDetail : Screen("member/{memberId}") {
        fun createRoute(memberId: String) = "member/$memberId"
    }
    
    object Settings : Screen("settings")
}

/**
 * 底部导航项
 */
enum class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector
) {
    HOME("home", "首页", Icons.Default.Home),
    TASKS("tasks", "任务", Icons.Default.Assignment),
    HABITS("habits", "习惯", Icons.Default.CheckCircle),
    REWARDS("rewards", "奖励", Icons.Default.CardGiftcard),
    PROFILE("profile", "我的", Icons.Default.Person)
}

/**
 * 导航图标
 */
object NavIcons {
    val Add = Icons.Default.Add
    val Back = Icons.Default.ArrowBack
    val Star = Icons.Default.Star
    val Check = Icons.Default.Check
    val Delete = Icons.Default.Delete
    val Edit = Icons.Default.Edit
    val Settings = Icons.Default.Settings
    val Person = Icons.Default.Person
    val Group = Icons.Default.Group
    val Timer = Icons.Default.Timer
    val EmojiEvents = Icons.Default.EmojiEvents
}
