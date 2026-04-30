package com.forestfamily.app.ui.home

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.forestfamily.app.data.model.Member
import com.forestfamily.app.data.model.Task
import com.forestfamily.app.data.model.TaskStatus
import com.forestfamily.app.ui.components.StarCounter
import com.forestfamily.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToTasks: () -> Unit,
    onNavigateToHabits: () -> Unit,
    onNavigateToRewards: () -> Unit,
    onNavigateToTaskDetail: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val member by viewModel.currentMember.collectAsState()
    val members by viewModel.familyMembers.collectAsState()
    val quadrantStats by viewModel.quadrantStats.collectAsState()
    
    var bottomTab by remember { mutableStateOf("leaderboard") }

    Scaffold(
        topBar = {
            TopAppBar(
                modifier = Modifier.padding(horizontal = 8.dp),
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // 头像
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Primary.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = member?.avatar ?: member?.name?.firstOrNull()?.toString() ?: "?",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = Primary
                            )
                        }
                        
                        // AI 按钮
                        IconButton(
                            onClick = { /* AI 语音助手 */ },
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(SecondaryContainer)
                        ) {
                            Icon(
                                Icons.Default.Mic,
                                contentDescription = "AI 助手",
                                tint = Primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                },
                actions = {
                    // 星星数量
                    Surface(
                        shape = RoundedCornerShape(24.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = null,
                                tint = Secondary,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = (member?.stars ?: 0).toString(),
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp
                            )
                        }
                    }
                    
                    // 设置按钮
                    IconButton(onClick = { /* 设置 */ }) {
                        Icon(
                            Icons.Default.Settings,
                            contentDescription = "设置",
                            tint = Primary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 能量值卡片
            item {
                EnergyBalanceCard(
                    stars = member?.stars ?: 0,
                    title = "今日能量"
                )
            }
            
            // 快速操作
            item {
                QuickActionsSection(
                    onCreateTask = onNavigateToTasks,
                    onCreateReward = onNavigateToRewards,
                    onCalendar = { /* 日历 */ },
                    onPomodoro = { /* 番茄钟 */ }
                )
            }
            
            // 今日任务
            item {
                SectionHeader(
                    title = "今日任务",
                    count = uiState.todayTasks.size,
                    onViewAll = onNavigateToTasks
                )
            }
            
            if (uiState.todayTasks.isEmpty()) {
                item {
                    EmptyTasksCard(onCreateTask = onNavigateToTasks)
                }
            } else {
                items(uiState.todayTasks.take(4)) { task ->
                    HomeTaskCard(
                        task = task,
                        isAdmin = member?.role?.name == "PARENT",
                        onClick = { onNavigateToTaskDetail(task.id) },
                        onCheckIn = { viewModel.completeTask(task.id) }
                    )
                }
            }
            
            // 排行榜/象限分析
            item {
                LeaderboardSection(
                    members = members.sortedByDescending { it.stars },
                    selectedTab = bottomTab,
                    onTabChange = { bottomTab = it },
                    quadrantStats = quadrantStats,
                    onQuadrantClick = { /* 跳转象限分析 */ }
                )
            }
            
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
fun EnergyBalanceCard(
    stars: Int,
    title: String,
    subtitle: String = "继续加油哦！"
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp),
        shape = RoundedCornerShape(32.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            Color(0xFFA5D6A7),
                            Color(0xFF4CAF50),
                            Color(0xFF2E7D32)
                        )
                    )
                )
        ) {
            // 装饰元素 - 星星
            Icon(
                Icons.Default.Star,
                contentDescription = null,
                tint = Secondary.copy(alpha = 0.3f),
                modifier = Modifier
                    .size(48.dp)
                    .align(Alignment.TopStart)
                    .padding(16.dp)
            )
            
            // 装饰元素 - Sparkles
            Icon(
                Icons.Default.AutoAwesome,
                contentDescription = null,
                tint = Secondary.copy(alpha = 0.4f),
                modifier = Modifier
                    .size(64.dp)
                    .align(Alignment.BottomEnd)
                    .padding(16.dp)
            )
            
            // 主内容
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // 标题标签
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White.copy(alpha = 0.2f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = Secondary,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = title.uppercase(),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 2.sp,
                            color = Color.White
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // 星星数量
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = stars.toString(),
                        fontSize = 56.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                    Icon(
                        Icons.Default.Star,
                        contentDescription = null,
                        tint = Secondary,
                        modifier = Modifier.size(36.dp)
                    )
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // 副标题
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.Black.copy(alpha = 0.1f)
                ) {
                    Text(
                        text = subtitle,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            }
        }
    }
}

@Composable
fun QuickActionsSection(
    onCreateTask: () -> Unit,
    onCreateReward: () -> Unit,
    onCalendar: () -> Unit,
    onPomodoro: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        QuickActionButton(
            icon = Icons.Default.Add,
            label = "创建任务",
            backgroundColor = QuickActionYellow,
            iconColor = Color(0xFFF57C00),
            onClick = onCreateTask,
            modifier = Modifier.weight(1f)
        )
        QuickActionButton(
            icon = Icons.Default.Edit,
            label = "许愿",
            backgroundColor = QuickActionOrange,
            iconColor = Color(0xFFF57C00),
            onClick = onCreateReward,
            modifier = Modifier.weight(1f)
        )
        QuickActionButton(
            icon = Icons.Default.CalendarMonth,
            label = "日历",
            backgroundColor = QuickActionPurple,
            iconColor = Color(0xFF7B1FA2),
            onClick = onCalendar,
            modifier = Modifier.weight(1f)
        )
        QuickActionButton(
            icon = Icons.Default.Timer,
            label = "番茄钟",
            backgroundColor = QuickActionGreen,
            iconColor = Primary,
            onClick = onPomodoro,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
fun QuickActionButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    backgroundColor: Color,
    iconColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(backgroundColor),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = iconColor,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = label,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            maxLines = 1
        )
    }
}

@Composable
fun SectionHeader(
    title: String,
    count: Int,
    onViewAll: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = title,
                fontSize = 20.sp,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onSurface
            )
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = QuickActionYellow
            ) {
                Text(
                    text = count.toString(),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFFF57C00)
                )
            }
        }
        TextButton(onClick = onViewAll) {
            Text(
                text = "查看全部",
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                color = Primary
            )
        }
    }
}

@Composable
fun HomeTaskCard(
    task: Task,
    isAdmin: Boolean,
    onClick: () -> Unit,
    onCheckIn: () -> Unit
) {
    val statusColor = when (task.status) {
        TaskStatus.PENDING -> StatusPending
        TaskStatus.IN_PROGRESS -> StatusInProgress
        TaskStatus.REVIEWING -> StatusReviewing
        TaskStatus.COMPLETED -> StatusCompleted
        else -> StatusPending
    }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 完成按钮
            IconButton(
                onClick = onCheckIn,
                modifier = Modifier.size(40.dp)
            ) {
                Icon(
                    if (task.completed) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                    contentDescription = "完成",
                    tint = if (task.completed) Primary else statusColor
                )
            }
            
            Spacer(modifier = Modifier.width(8.dp))
            
            // 图标
            task.icon?.let { icon ->
                Text(text = icon, fontSize = 20.sp)
                Spacer(modifier = Modifier.width(8.dp))
            }
            
            // 标题和描述
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = task.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (!task.description.isNullOrBlank()) {
                    Text(
                        text = task.description,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            
            // 星星
            StarCounter(stars = task.starAmount, showIcon = true, iconSize = 16)
        }
    }
}

@Composable
fun EmptyTasksCard(onCreateTask: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.TaskAlt,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "暂无任务",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            TextButton(onClick = onCreateTask) {
                Text("创建第一个任务", fontWeight = FontWeight.Black, color = Primary)
            }
        }
    }
}

@Composable
fun LeaderboardSection(
    members: List<Member>,
    selectedTab: String,
    onTabChange: (String) -> Unit,
    quadrantStats: Map<String, Int>,
    onQuadrantClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Tab 切换
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                TabButton(
                    text = "排行榜",
                    selected = selectedTab == "leaderboard",
                    onClick = { onTabChange("leaderboard") },
                    modifier = Modifier.weight(1f)
                )
                TabButton(
                    text = "四象限",
                    selected = selectedTab == "quadrant",
                    onClick = { onTabChange("quadrant") },
                    modifier = Modifier.weight(1f)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            if (selectedTab == "leaderboard") {
                // 排行榜视图
                LeaderboardView(members = members)
            } else {
                // 四象限视图
                QuadrantView(
                    stats = quadrantStats,
                    onClick = onQuadrantClick
                )
            }
        }
    }
}

@Composable
fun TabButton(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        color = if (selected) MaterialTheme.colorScheme.primary else Color.Transparent
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            fontSize = 12.sp,
            fontWeight = FontWeight.Black,
            color = if (selected) MaterialTheme.colorScheme.onPrimary 
                    else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
        )
    }
}

@Composable
fun LeaderboardView(members: List<Member>) {
    val sortedMembers = members.sortedByDescending { it.stars }.take(3)
    
    if (sortedMembers.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "暂无数据",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    } else {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.Bottom
        ) {
            sortedMembers.forEachIndexed { index, member ->
                val rank = index + 1
                val height = when (rank) {
                    1 -> 100.dp
                    2 -> 80.dp
                    else -> 60.dp
                }
                
                PodiumItem(
                    member = member,
                    rank = rank,
                    height = height,
                    onClick = { /* 查看成员详情 */ }
                )
            }
        }
    }
}

@Composable
fun PodiumItem(
    member: Member,
    rank: Int,
    height: androidx.compose.ui.unit.Dp,
    onClick: () -> Unit
) {
    val isFirst = rank == 1
    
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(80.dp)
    ) {
        // 排名徽章
        Box(
            modifier = Modifier
                .size(24.dp)
                .offset(y = (-8).dp)
                .shadow(4.dp, CircleShape)
                .clip(CircleShape)
                .background(if (isFirst) Secondary else Color(0xFFBDBDBD))
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = rank.toString(),
                fontSize = 10.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
            )
        }
        
        // 头像
        Box(
            modifier = Modifier
                .size(56.dp)
                .offset(y = (-12).dp)
                .shadow(4.dp, CircleShape)
                .clip(CircleShape)
                .background(
                    if (isFirst) Secondary.copy(alpha = 0.2f)
                    else MaterialTheme.colorScheme.surfaceVariant
                )
                .clickable(onClick = onClick),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = member.avatar ?: member.name.firstOrNull()?.toString() ?: "?",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = if (isFirst) Secondary else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        // 基座
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(height)
                .offset(y = (-12).dp),
            shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
            color = if (isFirst) Primary else MaterialTheme.colorScheme.surfaceVariant
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = member.name,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isFirst) Color.White.copy(alpha = 0.7f) 
                            else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = member.stars.toString(),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isFirst) Color.White else MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}

@Composable
fun QuadrantView(
    stats: Map<String, Int>,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Primary.copy(alpha = 0.1f))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.AutoAwesome,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = Primary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "四象限分析",
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "点击查看详细分析",
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )
        }
    }
}
