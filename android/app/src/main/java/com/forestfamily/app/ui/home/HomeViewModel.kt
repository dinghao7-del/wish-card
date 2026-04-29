package com.forestfamily.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forestfamily.app.data.model.*
import com.forestfamily.app.data.repository.FamilyRepository
import com.forestfamily.app.data.repository.TaskRepository
import com.forestfamily.app.data.repository.RewardRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val familyRepository: FamilyRepository,
    private val taskRepository: TaskRepository,
    private val rewardRepository: RewardRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _currentMember = MutableStateFlow<Member?>(null)
    val currentMember: StateFlow<Member?> = _currentMember.asStateFlow()

    private val _currentFamily = MutableStateFlow<Family?>(null)
    val currentFamily: StateFlow<Family?> = _currentFamily.asStateFlow()

    private val _familyMembers = MutableStateFlow<List<Member>>(emptyList())
    val familyMembers: StateFlow<List<Member>> = _familyMembers.asStateFlow()

    // 四象限任务统计 (String keys for Compose)
    private val _quadrantStats = MutableStateFlow<Map<String, Int>>(emptyMap())
    val quadrantStats: StateFlow<Map<String, Int>> = _quadrantStats.asStateFlow()

    init {
        loadMockData()
    }

    private fun loadMockData() {
        viewModelScope.launch {
            _uiState.value = HomeUiState(isLoading = true)
            
            // 模拟数据加载
            _currentMember.value = Member(
                id = "member-1",
                name = "小明",
                avatar = "👦",
                role = MemberRole.CHILD,
                stars = 85
            )
            
            _currentFamily.value = Family(
                id = "family-1",
                name = "幸福的一家"
            )
            
            // 模拟家庭成员
            _familyMembers.value = listOf(
                Member(id = "member-1", name = "小明", avatar = "👦", stars = 85, role = MemberRole.CHILD),
                Member(id = "member-2", name = "爸爸", avatar = "👨", stars = 120, role = MemberRole.PARENT),
                Member(id = "member-3", name = "妈妈", avatar = "👩", stars = 95, role = MemberRole.PARENT)
            )

            // 加载任务
            loadTasks()
            
            // 加载习惯
            loadHabits()
            
            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun loadTasks() {
        viewModelScope.launch {
            // 使用模拟任务数据
            val mockTasks = listOf(
                Task(id = "1", title = "整理房间", description = "收拾玩具和衣服", starAmount = 10, status = TaskStatus.PENDING),
                Task(id = "2", title = "完成作业", description = "数学和语文", starAmount = 15, status = TaskStatus.PENDING),
                Task(id = "3", title = "刷牙洗脸", description = "早晚各一次", starAmount = 5, status = TaskStatus.COMPLETED)
            )
            
            val quadrantMap = mockTasks.groupBy { task ->
                when {
                    task.status == TaskStatus.PENDING && task.starAmount > 10 -> "Q1"
                    task.status == TaskStatus.PENDING -> "Q2"
                    task.status == TaskStatus.IN_PROGRESS -> "Q3"
                    else -> "Q4"
                }
            }.mapValues { it.value.size }
            
            _quadrantStats.value = quadrantMap
            _uiState.value = _uiState.value.copy(
                todayTasks = mockTasks.filter { it.status == TaskStatus.PENDING || it.status == TaskStatus.REVIEWING },
                pendingTasks = mockTasks.filter { !it.completed },
                todayCompletedCount = mockTasks.count { it.completed }
            )
        }
    }

    fun loadHabits() {
        viewModelScope.launch {
            val mockHabits = listOf(
                Habit(id = "1", title = "阅读", starAmount = 5, currentCount = 1, targetCount = 1),
                Habit(id = "2", title = "运动", starAmount = 10, currentCount = 0, targetCount = 1)
            )
            _uiState.value = _uiState.value.copy(
                habits = mockHabits,
                todayHabitProgress = mockHabits.count { it.currentCount > 0 }
            )
        }
    }

    fun completeTask(taskId: String) {
        viewModelScope.launch {
            try {
                val currentTasks = _uiState.value.todayTasks.toMutableList()
                val taskIndex = currentTasks.indexOfFirst { it.id == taskId }
                if (taskIndex != -1) {
                    val task = currentTasks[taskIndex]
                    currentTasks[taskIndex] = task.copy(completed = true)
                    _uiState.value = _uiState.value.copy(todayTasks = currentTasks)
                }
                
                // 更新星星数
                _currentMember.value?.let { member ->
                    val task = _uiState.value.todayTasks.find { it.id == taskId }
                    _currentMember.value = member.copy(stars = member.stars + (task?.starAmount ?: 5))
                }
            } catch (_: Exception) {
                // Handle error silently
            }
        }
    }
}

data class HomeUiState(
    val isLoading: Boolean = false,
    val todayTasks: List<Task> = emptyList(),
    val pendingTasks: List<Task> = emptyList(),
    val todayCompletedCount: Int = 0,
    val habits: List<Habit> = emptyList(),
    val todayHabitProgress: Int = 0,
    val error: String? = null
)
