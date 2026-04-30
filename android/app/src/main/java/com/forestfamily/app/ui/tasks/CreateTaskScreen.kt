package com.forestfamily.app.ui.tasks

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.forestfamily.app.ui.theme.Primary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateTaskScreen(
    onTaskCreated: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: TasksViewModel = hiltViewModel()
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var starAmount by remember { mutableStateOf("5") }
    var selectedIcon by remember { mutableStateOf("📝") }

    val icons = listOf("📝", "📚", "🧹", "🍽️", "🛏️", "🐕", "🚿", "📖", "✏️", "🎸", "🏃", "🎮")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("创建任务") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = "关闭")
                    }
                },
                actions = {
                    TextButton(
                        onClick = onTaskCreated,
                        enabled = title.isNotBlank()
                    ) {
                        Text("保存", color = Primary)
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
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // 任务名称
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("任务名称") },
                placeholder = { Text("例如：整理房间") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // 任务描述
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("任务描述（可选）") },
                placeholder = { Text("详细说明任务要求...") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 5
            )

            // 选择图标
            Column {
                Text(
                    text = "选择图标",
                    style = MaterialTheme.typography.labelLarge
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    icons.take(6).forEach { icon ->
                        FilterChip(
                            selected = selectedIcon == icon,
                            onClick = { selectedIcon = icon },
                            label = { Text(icon) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    icons.drop(6).forEach { icon ->
                        FilterChip(
                            selected = selectedIcon == icon,
                            onClick = { selectedIcon = icon },
                            label = { Text(icon) }
                        )
                    }
                }
            }

            // 星星奖励
            Column {
                Text(
                    text = "星星奖励",
                    style = MaterialTheme.typography.labelLarge
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = starAmount,
                    onValueChange = { starAmount = it.filter { c -> c.isDigit() } },
                    label = { Text("奖励星星数量") },
                    leadingIcon = { Icon(Icons.Default.Star, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
            }

            // 分配给
            Column {
                Text(
                    text = "分配给（可选）",
                    style = MaterialTheme.typography.labelLarge
                )
                Spacer(modifier = Modifier.height(8.dp))
                // TODO: 添加成员选择器
                OutlinedTextField(
                    value = "",
                    onValueChange = { },
                    label = { Text("选择家庭成员") },
                    trailingIcon = {
                        IconButton(onClick = { /* 显示成员选择器 */ }) {
                            Icon(Icons.Default.PersonAdd, contentDescription = "添加成员")
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    readOnly = true,
                    enabled = false
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // 创建按钮
            Button(
                onClick = onTaskCreated,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = title.isNotBlank()
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("创建任务", fontSize = MaterialTheme.typography.titleMedium.fontSize)
            }
        }
    }
}
