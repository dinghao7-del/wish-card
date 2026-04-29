package com.forestfamily.app.ui.habits

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
import com.forestfamily.app.data.model.HabitFrequency
import com.forestfamily.app.ui.theme.ForestGreen
import com.forestfamily.app.ui.theme.StarGold

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateHabitScreen(
    onHabitCreated: () -> Unit,
    onNavigateBack: () -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var frequency by remember { mutableStateOf(HabitFrequency.DAILY) }
    var starAmount by remember { mutableStateOf("5") }
    var targetCount by remember { mutableStateOf("1") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("创建习惯") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = "关闭")
                    }
                },
                actions = {
                    TextButton(
                        onClick = onHabitCreated,
                        enabled = title.isNotBlank()
                    ) {
                        Text("保存", color = ForestGreen)
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
            // 习惯名称
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("习惯名称") },
                placeholder = { Text("例如：每天阅读") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // 习惯描述
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("习惯描述（可选）") },
                placeholder = { Text("详细说明这个习惯...") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 4
            )

            // 频率选择
            Column {
                Text(
                    text = "打卡频率",
                    style = MaterialTheme.typography.labelLarge
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    HabitFrequency.entries.forEach { freq ->
                        FilterChip(
                            selected = frequency == freq,
                            onClick = { frequency = freq },
                            label = {
                                Text(
                                    when (freq) {
                                        HabitFrequency.DAILY -> "每天"
                                        HabitFrequency.WEEKLY -> "每周"
                                        HabitFrequency.CUSTOM -> "自定义"
                                    }
                                )
                            },
                            leadingIcon = {
                                if (frequency == freq) {
                                    Icon(
                                        Icons.Default.Check,
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        )
                    }
                }
            }

            // 目标次数
            Column {
                Text(
                    text = "目标次数",
                    style = MaterialTheme.typography.labelLarge
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = targetCount,
                    onValueChange = { targetCount = it.filter { c -> c.isDigit() } },
                    label = { Text("每周/每天完成次数") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
            }

            // 星星奖励
            Column {
                Text(
                    text = "完成奖励",
                    style = MaterialTheme.typography.labelLarge
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = starAmount,
                    onValueChange = { starAmount = it.filter { c -> c.isDigit() } },
                    label = { Text("每次完成奖励星星") },
                    leadingIcon = { Icon(Icons.Default.Star, contentDescription = null, tint = StarGold) },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // 创建按钮
            Button(
                onClick = onHabitCreated,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = title.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = StarGold)
            ) {
                Icon(Icons.Default.Loop, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("创建习惯", fontSize = MaterialTheme.typography.titleMedium.fontSize)
            }
        }
    }
}
