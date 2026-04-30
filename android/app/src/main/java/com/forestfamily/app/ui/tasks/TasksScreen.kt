package com.forestfamily.app.ui.tasks

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import androidx.hilt.navigation.compose.hiltViewModel
import com.forestfamily.app.data.model.Task
import com.forestfamily.app.data.model.TaskStatus
import com.forestfamily.app.ui.components.*
import com.forestfamily.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TasksScreen(
    onNavigateToCreateTask: () -> Unit,
    onNavigateToTaskDetail: (String) -> Unit,
    viewModel: TasksViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("任务列表", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { /* 筛选 */ }) {
                        Icon(Icons.Default.FilterList, contentDescription = "筛选")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNavigateToCreateTask,
                containerColor = Primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "新建任务")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // 筛选标签
            LazyRow(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(TaskFilterType.entries) { filter ->
                    FilterChip(
                        selected = uiState.filterType == filter,
                        onClick = { viewModel.setFilter(filter) },
                        label = { Text(filter.label) }
                    )
                }
            }

            if (uiState.isLoading) {
                LoadingView()
            } else if (uiState.filteredTasks.isEmpty()) {
                EmptyStateView(
                    icon = {
                        Icon(
                            Icons.Default.Assignment,
                            contentDescription = null,
                            modifier = Modifier.size(80.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    },
                    title = "暂无任务",
                    subtitle = "点击右下角按钮创建新任务"
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.filteredTasks) { task ->
                        TaskListCard(
                            task = task,
                            onClick = { onNavigateToTaskDetail(task.id) },
                            onComplete = { viewModel.completeTask(task.id) },
                            onDelete = { viewModel.deleteTask(task.id) }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TaskListCard(
    task: Task,
    onClick: () -> Unit,
    onComplete: () -> Unit,
    onDelete: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    val statusColor = when (task.status) {
        TaskStatus.PENDING -> StatusPending
        TaskStatus.IN_PROGRESS -> StatusInProgress
        TaskStatus.REVIEWING -> StatusReviewing
        TaskStatus.COMPLETED -> StatusCompleted
    }

    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 状态指示
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(
                            if (task.completed) Primary.copy(alpha = 0.2f)
                            else statusColor.copy(alpha = 0.2f)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (task.completed) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                        contentDescription = null,
                        tint = if (task.completed) Primary else statusColor
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        task.icon?.let { icon ->
                            Text(text = icon, fontSize = 20.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            text = task.title,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    if (!task.description.isNullOrBlank()) {
                        Text(
                            text = task.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 2
                        )
                    }
                }

                // 更多菜单
                Box {
                    IconButton(onClick = { showMenu = true }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "更多")
                    }
                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false }
                    ) {
                        if (!task.completed) {
                            DropdownMenuItem(
                                text = { Text("标记完成") },
                                onClick = {
                                    onComplete()
                                    showMenu = false
                                },
                                leadingIcon = { Icon(Icons.Default.Check, null) }
                            )
                        }
                        DropdownMenuItem(
                            text = { Text("删除") },
                            onClick = {
                                onDelete()
                                showMenu = false
                            },
                            leadingIcon = { Icon(Icons.Default.Delete, null) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusChip(
                    text = when (task.status) {
                        TaskStatus.PENDING -> "待开始"
                        TaskStatus.IN_PROGRESS -> "进行中"
                        TaskStatus.REVIEWING -> "待审核"
                        TaskStatus.COMPLETED -> "已完成"
                    },
                    color = statusColor
                )

                StarCounter(stars = task.starAmount, showIcon = true, iconSize = 18)
            }
        }
    }
}
