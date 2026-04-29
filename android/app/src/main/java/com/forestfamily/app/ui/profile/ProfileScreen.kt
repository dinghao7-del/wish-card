package com.forestfamily.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.forestfamily.app.data.model.Member
import com.forestfamily.app.data.model.MemberRole
import com.forestfamily.app.ui.components.*
import com.forestfamily.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onNavigateToSettings: () -> Unit,
    onLogout: () -> Unit
) {
    // TODO: 从 ViewModel 获取真实数据
    var currentMember by remember { 
        mutableStateOf(Member(
            id = "member-1",
            name = "小明",
            avatar = "👦",
            role = MemberRole.CHILD,
            stars = 85
        ))
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("个人中心", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "设置")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            // 用户信息卡片
            ForestCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // 头像
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(
                                if (currentMember.role == MemberRole.PARENT) 
                                    ParentColor.copy(alpha = 0.2f) 
                                else ChildColor.copy(alpha = 0.2f)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = currentMember.avatar ?: currentMember.name.firstOrNull()?.toString() ?: "?",
                            fontSize = 36.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (currentMember.role == MemberRole.PARENT) ParentColor else ChildColor
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = currentMember.name,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (currentMember.role == MemberRole.PARENT) Icons.Default.Person else Icons.Default.ChildCare,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = if (currentMember.role == MemberRole.PARENT) ParentColor else ChildColor
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (currentMember.role == MemberRole.PARENT) "家长" else "孩子",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    // 星星数
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = StarGold,
                            modifier = Modifier.size(32.dp)
                        )
                        Text(
                            text = currentMember.stars.toString(),
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = StarGold
                        )
                        Text(
                            text = "星星",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // 功能菜单
            Text(
                text = "功能",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            ProfileMenuItem(
                icon = Icons.Default.History,
                title = "星星记录",
                subtitle = "查看星星收支明细",
                onClick = { }
            )

            ProfileMenuItem(
                icon = Icons.Default.CardGiftcard,
                title = "我的兑换",
                subtitle = "查看已兑换的奖励",
                onClick = { }
            )

            ProfileMenuItem(
                icon = Icons.Default.PieChart,
                title = "数据统计",
                subtitle = "查看任务和习惯完成情况",
                onClick = { }
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "设置",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            ProfileMenuItem(
                icon = Icons.Default.Person,
                title = "编辑资料",
                subtitle = "修改昵称、头像",
                onClick = { }
            )

            ProfileMenuItem(
                icon = Icons.Default.FamilyRestroom,
                title = "家庭设置",
                subtitle = "管理家庭成员",
                onClick = { }
            )

            ProfileMenuItem(
                icon = Icons.Default.Notifications,
                title = "通知设置",
                subtitle = "管理提醒通知",
                onClick = { }
            )

            ProfileMenuItem(
                icon = Icons.Default.Settings,
                title = "应用设置",
                subtitle = "主题、语言等",
                onClick = onNavigateToSettings
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 登出按钮
            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Icon(Icons.Default.Logout, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("退出登录")
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun ProfileMenuItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodyLarge
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("设置") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text("应用设置页面")
            Text("主题、语言等设置将在此页面实现")
        }
    }
}
