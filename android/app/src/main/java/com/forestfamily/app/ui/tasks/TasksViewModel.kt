package com.forestfamily.app.ui.tasks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forestfamily.app.data.model.*
import com.forestfamily.app.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TasksViewModel @Inject constructor(
    private val taskRepository: TaskRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TasksUiState())
    val uiState: StateFlow<TasksUiState> = _uiState.asStateFlow()

    private val _currentFamilyId = MutableStateFlow<String?>(null)
    private val _currentTask = MutableStateFlow<Task?>(null)
    val currentTask: StateFlow<Task?> = _currentTask.asStateFlow()

    init {
        loadMockTasks()
    }

    private fun loadMockTasks() {
        viewModelScope.launch {
            _uiState.value = TasksUiState(isLoading = true)
            
            val mockTasks = listOf(
                Task(
                    id = "1",
                    title = "整理房间",
                    description = "把玩具收进箱子里",
                    starAmount = 5,
                    icon = "🧹",
                    status = TaskStatus.PENDING,
                    assigneeIds = listOf("member-1")
                ),
                Task(
                    id = "2",
                    title = "完成作业",
                    description = "数学练习册第10页",
                    starAmount = 10,
                    icon = "📚",
                    status = TaskStatus.PENDING,
                    assigneeIds = listOf("member-1")
                ),
                Task(
                    id = "3",
                    title = "帮忙洗碗",
                    description = "晚饭后帮助收拾碗筷",
                    starAmount = 3,
                    icon = "🍽️",
                    status = TaskStatus.IN_PROGRESS,
                    assigneeIds = listOf("member-1")
                )
            )
            
            _uiState.value = TasksUiState(
                isLoading = false,
                tasks = mockTasks,
                filteredTasks = mockTasks
            )
        }
    }

    fun loadTasks(familyId: String) {
        _currentFamilyId.value = familyId
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            taskRepository.getTasksByFamilyId(familyId)
                .onSuccess { tasks ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        tasks = tasks,
                        filteredTasks = filterTasks(tasks, _uiState.value.filterType)
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message
                    )
                }
        }
    }

    fun loadTask(taskId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            val task = taskRepository.getTaskById(taskId)
            _currentTask.value = task
            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun setFilter(filterType: TaskFilterType) {
        _uiState.value = _uiState.value.copy(
            filterType = filterType,
            filteredTasks = filterTasks(_uiState.value.tasks, filterType)
        )
    }

    private fun filterTasks(tasks: List<Task>, filter: TaskFilterType): List<Task> {
        return when (filter) {
            TaskFilterType.ALL -> tasks
            TaskFilterType.PENDING -> tasks.filter { it.status == TaskStatus.PENDING }
            TaskFilterType.IN_PROGRESS -> tasks.filter { it.status == TaskStatus.IN_PROGRESS }
            TaskFilterType.REVIEWING -> tasks.filter { it.status == TaskStatus.REVIEWING }
            TaskFilterType.COMPLETED -> tasks.filter { it.completed }
        }
    }

    fun createTask(
        title: String,
        description: String,
        starAmount: Int,
        icon: String,
        priority: TaskPriority,
        assigneeIds: List<String>,
        familyId: String,
        dueDate: String? = null
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            try {
                val task = taskRepository.createTask(
                    title = title,
                    description = description,
                    starAmount = starAmount,
                    icon = icon,
                    priority = priority,
                    assigneeIds = assigneeIds,
                    familyId = familyId,
                    dueDate = dueDate
                )
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    taskCreated = true
                )
                loadTasks(familyId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message
                )
            }
        }
    }

    fun updateTask(
        taskId: String,
        title: String,
        description: String,
        starAmount: Int,
        priority: TaskPriority
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            try {
                taskRepository.updateTask(
                    taskId = taskId,
                    title = title,
                    description = description,
                    starAmount = starAmount,
                    priority = priority
                )
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    taskUpdated = true
                )
                loadTask(taskId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message
                )
            }
        }
    }

    fun completeTask(taskId: String) {
        viewModelScope.launch {
            try {
                taskRepository.completeTask(taskId)
                loadTasks(_currentFamilyId.value ?: return@launch)
            } catch (_: Exception) {
                // Handle error silently for now
            }
        }
    }

    fun startTask(taskId: String) {
        viewModelScope.launch {
            try {
                taskRepository.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS)
                loadTasks(_currentFamilyId.value ?: return@launch)
            } catch (_: Exception) {
                // Handle error silently for now
            }
        }
    }

    fun submitForReview(taskId: String) {
        viewModelScope.launch {
            try {
                taskRepository.updateTaskStatus(taskId, TaskStatus.REVIEWING)
                loadTasks(_currentFamilyId.value ?: return@launch)
            } catch (_: Exception) {
                // Handle error silently for now
            }
        }
    }

    fun approveTask(taskId: String) {
        viewModelScope.launch {
            try {
                taskRepository.approveTask(taskId)
                loadTasks(_currentFamilyId.value ?: return@launch)
            } catch (_: Exception) {
                // Handle error silently for now
            }
        }
    }

    fun deleteTask(taskId: String) {
        viewModelScope.launch {
            taskRepository.deleteTask(taskId)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(taskDeleted = true)
                    loadTasks(_currentFamilyId.value ?: return@launch)
                }
        }
    }

    fun resetState() {
        _uiState.value = _uiState.value.copy(
            taskCreated = false,
            taskUpdated = false,
            taskDeleted = false,
            error = null
        )
    }
}

data class TasksUiState(
    val isLoading: Boolean = false,
    val tasks: List<Task> = emptyList(),
    val filteredTasks: List<Task> = emptyList(),
    val filterType: TaskFilterType = TaskFilterType.ALL,
    val taskCreated: Boolean = false,
    val taskUpdated: Boolean = false,
    val taskDeleted: Boolean = false,
    val error: String? = null
)

enum class TaskFilterType(val label: String) {
    ALL("全部"),
    PENDING("待开始"),
    IN_PROGRESS("进行中"),
    REVIEWING("待审核"),
    COMPLETED("已完成")
}
