package com.forestfamily.app.ui.rewards

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.forestfamily.app.data.model.Reward
import com.forestfamily.app.data.model.RewardStatus
import com.forestfamily.app.ui.components.*
import com.forestfamily.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RewardsScreen(
    onNavigateToCreateReward: () -> Unit,
    onNavigateToRewardDetail: (String) -> Unit,
    viewModel: RewardsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val member by viewModel.currentMember.collectAsState()
    var showRedeemDialog by remember { mutableStateOf<Reward?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("奖励商店", fontWeight = FontWeight.Bold)
                        member?.let {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Star,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = Secondary
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "我的星星: ${it.stars}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { /* 排序 */ }) {
                        Icon(Icons.Default.Sort, contentDescription = "排序")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToCreateReward,
                containerColor = Primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "添加奖励")
            }
        }
    ) { padding ->
        if (uiState.isLoading) {
            LoadingView(modifier = Modifier.padding(padding))
        } else if (uiState.rewards.isEmpty()) {
            EmptyStateView(
                modifier = Modifier.padding(padding),
                icon = {
                    Icon(
                        Icons.Default.EmojiEvents,
                        contentDescription = null,
                        modifier = Modifier.size(80.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                title = "奖励商店空空的",
                subtitle = "点击右下角添加奖励吧"
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 分类标签
                item {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val categories = listOf("全部", "娱乐", "美食", "学习", "活动")
                        items(categories) { category ->
                            FilterChip(
                                selected = category == "全部",
                                onClick = { /* 筛选 */ },
                                label = { Text(category) }
                            )
                        }
                    }
                }

                items(uiState.rewards) { reward ->
                    RewardCard(
                        reward = reward,
                        memberStars = member?.stars ?: 0,
                        onClick = { onNavigateToRewardDetail(reward.id) },
                        onRedeem = { showRedeemDialog = reward }
                    )
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

    // 兑换对话框
    showRedeemDialog?.let { reward ->
        AlertDialog(
            onDismissRequest = { showRedeemDialog = null },
            icon = { Text(reward.icon ?: "🎁", fontSize = 48.sp) },
            title = { Text("确认兑换") },
            text = {
                Column {
                    Text("确定要兑换 \"${reward.title}\" 吗？")
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = Secondary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "将消耗 ${reward.starCost} 星星",
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.redeemReward(reward.id)
                        showRedeemDialog = null
                    }
                ) {
                    Text("确认兑换")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRedeemDialog = null }) {
                    Text("取消")
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RewardCard(
    reward: Reward,
    memberStars: Int,
    onClick: () -> Unit,
    onRedeem: () -> Unit
) {
    val canAfford = memberStars >= reward.starCost
    val isRedeemed = reward.status != RewardStatus.AVAILABLE

    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 奖励图标
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = reward.icon ?: "🎁",
                    fontSize = 32.sp
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = reward.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Medium,
                        textDecoration = if (isRedeemed) TextDecoration.LineThrough else null
                    )
                    if (isRedeemed) {
                        Spacer(modifier = Modifier.width(8.dp))
                        StatusChip(
                            text = when (reward.status) {
                                RewardStatus.PENDING_APPROVAL -> "待审批"
                                RewardStatus.REDEEMED -> "已兑换"
                                else -> ""
                            },
                            color = StatusReviewing
                        )
                    }
                }
                
                if (!reward.description.isNullOrBlank()) {
                    Text(
                        text = reward.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2
                    )
                }

                reward.category?.let { category ->
                    Text(
                        text = category,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // 兑换按钮
            if (!isRedeemed) {
                Button(
                    onClick = onRedeem,
                    enabled = canAfford,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Secondary
                    )
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = reward.starCost.toString(),
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                }
            }
        }
    }
}
