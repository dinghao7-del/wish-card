package com.forestfamily.app.ui.rewards

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.forestfamily.app.ui.theme.Primary
import com.forestfamily.app.ui.theme.Secondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateRewardScreen(
    onRewardCreated: () -> Unit,
    onNavigateBack: () -> Unit
) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var starCost by remember { mutableStateOf("10") }
    var category by remember { mutableStateOf("") }
    var selectedIcon by remember { mutableStateOf("🎁") }

    val icons = listOf("🎁", "🎮", "🍦", "📚", "🌳", "🎬", "🛒", "🎯", "⚽", "🎨", "🎵", "🧸")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("添加奖励") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = "关闭")
                    }
                },
                actions = {
                    TextButton(
                        onClick = onRewardCreated,
                        enabled = name.isNotBlank()
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
            // 奖励名称
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("奖励名称") },
                placeholder = { Text("例如：半小时游戏时间") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // 奖励描述
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("奖励描述（可选）") },
                placeholder = { Text("详细描述这个奖励...") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 4
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

            // 分类
            OutlinedTextField(
                value = category,
                onValueChange = { category = it },
                label = { Text("分类（可选）") },
                placeholder = { Text("例如：娱乐、美食、学习") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // 所需星星
            Column {
                Text(
                    text = "所需星星",
                    style = MaterialTheme.typography.labelLarge
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = starCost,
                    onValueChange = { starCost = it.filter { c -> c.isDigit() } },
                    label = { Text("兑换所需星星数量") },
                    leadingIcon = { Icon(Icons.Default.Star, contentDescription = null, tint = Secondary) },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // 创建按钮
            Button(
                onClick = onRewardCreated,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = name.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = Secondary)
            ) {
                Icon(Icons.Default.EmojiEvents, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("添加奖励", fontSize = MaterialTheme.typography.titleMedium.fontSize)
            }
        }
    }
}
