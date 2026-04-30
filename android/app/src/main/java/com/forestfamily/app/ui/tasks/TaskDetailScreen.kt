package com.forestfamily.app.ui.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.forestfamily.app.ui.components.*
import com.forestfamily.app.ui.theme.Primary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskDetailScreen(
    taskId: String,
    onNavigateBack: () -> Unit
) {
    // TODO: 根据 taskId 加载任务详情
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("任务详情") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    IconButton(onClick = { /* 编辑 */ }) {
                        Icon(Icons.Default.Edit, contentDescription = "编辑")
                    }
                }
            )
        }
    ) { padding ->
        LoadingView(modifier = Modifier.padding(padding))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditTaskScreen(
    taskId: String,
    onTaskUpdated: () -> Unit,
    onNavigateBack: () -> Unit
) {
    // TODO: 根据 taskId 加载任务并编辑
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("编辑任务") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = "关闭")
                    }
                },
                actions = {
                    TextButton(onClick = onTaskUpdated) {
                        Text("保存", color = Primary)
                    }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            Text("编辑任务页面 - Task ID: $taskId")
        }
    }
}
