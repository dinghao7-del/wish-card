package com.forestfamily.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.forestfamily.app.data.model.Member
import com.forestfamily.app.data.model.MemberRole
import com.forestfamily.app.ui.theme.ChildColor
import com.forestfamily.app.ui.theme.Primary
import com.forestfamily.app.ui.theme.ParentColor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SelectMemberScreen(
    onMemberSelected: () -> Unit,
    onAddMember: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val family by viewModel.currentFamily.collectAsState()
    val members by viewModel.familyMembers.collectAsState()
    
    var showAddDialog by remember { mutableStateOf(false) }

    LaunchedEffect(family) {
        family?.let { viewModel.loadFamilyMembers(it.id) }
    }

    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Authenticated) {
            onMemberSelected()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("选择角色") }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = Primary
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = "添加成员")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp)
        ) {
            // 家庭信息
            family?.let { fam ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = Primary.copy(alpha = 0.1f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Home,
                            contentDescription = null,
                            tint = Primary,
                            modifier = Modifier.size(40.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = fam.name,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "${members.size} 位家庭成员",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "选择您的角色",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (members.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.PersonAdd,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "还没有家庭成员",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "点击下方按钮添加",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(members) { member ->
                        MemberCard(
                            member = member,
                            onClick = { viewModel.selectMember(member) }
                        )
                    }
                }
            }
        }
    }

    // 添加成员对话框
    if (showAddDialog) {
        AddMemberDialog(
            onDismiss = { showAddDialog = false },
            onConfirm = { name, role ->
                viewModel.addMember(name, role)
                showAddDialog = false
            }
        )
    }
}

@Composable
private fun MemberCard(
    member: Member,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 头像
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(
                        if (member.role == MemberRole.PARENT) ParentColor.copy(alpha = 0.2f)
                        else ChildColor.copy(alpha = 0.2f)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = member.avatar ?: member.name.firstOrNull()?.toString() ?: "?",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (member.role == MemberRole.PARENT) ParentColor else ChildColor
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = member.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (member.role == MemberRole.PARENT) Icons.Default.Person else Icons.Default.ChildCare,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = if (member.role == MemberRole.PARENT) ParentColor else ChildColor
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (member.role == MemberRole.PARENT) "家长" else "孩子",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
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
private fun AddMemberDialog(
    onDismiss: () -> Unit,
    onConfirm: (name: String, role: MemberRole) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var selectedRole by remember { mutableStateOf(MemberRole.CHILD) }
    
    val avatars = listOf("👶", "👧", "👦", "👨", "👩", "🧒", "👴", "👵", "🧑", "👱")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("添加家庭成员") },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("姓名") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "角色",
                    style = MaterialTheme.typography.labelMedium
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = selectedRole == MemberRole.PARENT,
                        onClick = { selectedRole = MemberRole.PARENT },
                        label = { Text("家长") },
                        leadingIcon = {
                            if (selectedRole == MemberRole.PARENT) {
                                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                            }
                        }
                    )
                    FilterChip(
                        selected = selectedRole == MemberRole.CHILD,
                        onClick = { selectedRole = MemberRole.CHILD },
                        label = { Text("孩子") },
                        leadingIcon = {
                            if (selectedRole == MemberRole.CHILD) {
                                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                            }
                        }
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(name, selectedRole) },
                enabled = name.isNotBlank()
            ) {
                Text("添加")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("取消")
            }
        }
    )
}
