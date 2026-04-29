package com.forestfamily.app.data.repository

import com.forestfamily.app.data.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.channels.awaitClose
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TaskRepository @Inject constructor() {

    private val _tasks = MutableStateFlow<List<Task>>(emptyList())

    // ==================== 任务相关 ====================

    suspend fun createTask(
        familyId: String,
        title: String,
        description: String?,
        starAmount: Int,
        assigneeIds: List<String>,
        createdBy: String,
        isHabit: Boolean = false,
        icon: String? = null,
        targetCount: Int = 1,
        priority: TaskPriority = TaskPriority.MEDIUM,
        dueDate: String? = null
    ): Task {
        val task = Task(
            id = java.util.UUID.randomUUID().toString(),
            familyId = familyId,
            title = title,
            description = description,
            starAmount = starAmount,
            assigneeIds = assigneeIds,
            creatorId = createdBy,
            priority = priority,
            isHabit = isHabit,
            icon = icon ?: "📝",
            targetCount = targetCount,
            dueDate = dueDate,
            createdAt = java.time.Instant.now().toString()
        )
        _tasks.value = _tasks.value + task
        return task
    }

    suspend fun createTask(
        title: String,
        description: String,
        starAmount: Int,
        icon: String,
        priority: TaskPriority,
        assigneeIds: List<String>,
        familyId: String,
        dueDate: String? = null
    ): Task {
        return createTask(
            familyId = familyId,
            title = title,
            description = description,
            starAmount = starAmount,
            assigneeIds = assigneeIds,
            createdBy = "",
            icon = icon,
            priority = priority,
            dueDate = dueDate
        )
    }

    suspend fun getTaskById(taskId: String): Task? {
        return _tasks.value.find { it.id == taskId }
    }

    suspend fun getTasksByFamilyId(familyId: String, includeCompleted: Boolean = false): Result<List<Task>> = runCatching {
        val tasks = _tasks.value.filter { it.familyId == familyId }
        if (includeCompleted) {
            tasks
        } else {
            tasks.filter { !it.completed }
        }
    }

    suspend fun getTasksByAssignee(memberId: String): Result<List<Task>> = runCatching {
        _tasks.value.filter { memberId in it.assigneeIds }
    }

    suspend fun updateTask(
        taskId: String,
        title: String? = null,
        description: String? = null,
        starAmount: Int? = null,
        priority: TaskPriority? = null,
        dueDate: String? = null
    ): Task {
        val task = _tasks.value.find { it.id == taskId }
            ?: throw Exception("Task not found")
        val updated = task.copy(
            title = title ?: task.title,
            description = description ?: task.description,
            starAmount = starAmount ?: task.starAmount,
            priority = priority ?: task.priority,
            dueDate = dueDate ?: task.dueDate
        )
        _tasks.value = _tasks.value.map { if (it.id == taskId) updated else it }
        return updated
    }

    suspend fun updateTaskStatus(taskId: String, status: TaskStatus): Task {
        return updateTask(taskId).let { task ->
            val updated = task.copy(status = status)
            _tasks.value = _tasks.value.map { if (it.id == taskId) updated else it }
            updated
        }
    }

    suspend fun completeTask(taskId: String): Task {
        val task = _tasks.value.find { it.id == taskId }
            ?: throw Exception("Task not found")
        val updated = task.copy(
            completed = true,
            completedAt = java.time.Instant.now().toString(),
            status = TaskStatus.COMPLETED
        )
        _tasks.value = _tasks.value.map { if (it.id == taskId) updated else it }
        return updated
    }

    suspend fun deleteTask(taskId: String): Result<Unit> = runCatching {
        _tasks.value = _tasks.value.filter { it.id != taskId }
    }

    suspend fun approveTask(taskId: String): Task {
        return completeTask(taskId)
    }

    // ==================== 习惯相关 ====================

    private val _habits = MutableStateFlow<List<Habit>>(emptyList())

    suspend fun createHabit(
        familyId: String,
        title: String,
        description: String?,
        frequency: HabitFrequency,
        starAmount: Int,
        assigneeIds: List<String>,
        createdBy: String,
        targetCount: Int = 1,
        icon: String = "✨"
    ): Habit {
        val habit = Habit(
            id = java.util.UUID.randomUUID().toString(),
            familyId = familyId,
            title = title,
            description = description,
            frequency = frequency,
            starAmount = starAmount,
            assigneeIds = assigneeIds,
            creatorId = createdBy,
            icon = icon,
            targetCount = targetCount,
            createdAt = java.time.Instant.now().toString()
        )
        _habits.value = _habits.value + habit
        return habit
    }

    suspend fun getHabitsByFamilyId(familyId: String): Result<List<Habit>> = runCatching {
        _habits.value.filter { it.familyId == familyId && it.isActive }
    }

    suspend fun getHabitsByAssignee(memberId: String): Result<List<Habit>> = runCatching {
        _habits.value.filter { memberId in it.assigneeIds && it.isActive }
    }

    suspend fun completeHabit(habitId: String): Habit {
        val habit = _habits.value.find { it.id == habitId }
            ?: throw Exception("Habit not found")
        val updated = habit.copy(
            currentCount = habit.currentCount + 1,
            lastCompletedDate = java.time.LocalDate.now().toString()
        )
        _habits.value = _habits.value.map { if (it.id == habitId) updated else it }
        return updated
    }

    suspend fun deleteHabit(habitId: String): Result<Unit> = runCatching {
        _habits.value = _habits.value.map {
            if (it.id == habitId) it.copy(isActive = false) else it
        }
    }

    // ==================== 实时订阅 ====================

    fun subscribeToTasks(familyId: String): Flow<Task> = callbackFlow {
        // 简化版本：暂不实现实时订阅
        awaitClose { }
    }
}
