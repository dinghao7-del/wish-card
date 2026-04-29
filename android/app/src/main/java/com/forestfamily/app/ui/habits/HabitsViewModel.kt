package com.forestfamily.app.ui.habits

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forestfamily.app.data.model.*
import com.forestfamily.app.data.repository.TaskRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HabitsViewModel @Inject constructor(
    private val taskRepository: TaskRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HabitsUiState())
    val uiState: StateFlow<HabitsUiState> = _uiState.asStateFlow()

    init {
        loadMockHabits()
    }

    private fun loadMockHabits() {
        viewModelScope.launch {
            _uiState.value = HabitsUiState(isLoading = true)

            val mockHabits = listOf(
                Habit(
                    id = "habit-1",
                    title = "每天阅读",
                    description = "阅读课外书籍30分钟",
                    frequency = HabitFrequency.DAILY,
                    starAmount = 5,
                    icon = "📚",
                    currentCount = 15,
                    targetCount = 30
                ),
                Habit(
                    id = "habit-2",
                    title = "整理书包",
                    description = "每天晚上整理好第二天要用的东西",
                    frequency = HabitFrequency.DAILY,
                    starAmount = 2,
                    icon = "🎒",
                    currentCount = 20,
                    targetCount = 30
                ),
                Habit(
                    id = "habit-3",
                    title = "洗碗",
                    description = "晚饭后帮助收拾碗筷",
                    frequency = HabitFrequency.DAILY,
                    starAmount = 3,
                    icon = "🍽️",
                    currentCount = 12,
                    targetCount = 30
                )
            )

            _uiState.value = HabitsUiState(
                isLoading = false,
                habits = mockHabits
            )
        }
    }

    fun completeHabit(habitId: String) {
        viewModelScope.launch {
            try {
                taskRepository.completeHabit(habitId)
                loadMockHabits()
            } catch (_: Exception) {
                // Handle error silently
            }
        }
    }

    fun deleteHabit(habitId: String) {
        viewModelScope.launch {
            taskRepository.deleteHabit(habitId)
                .onSuccess {
                    loadMockHabits()
                }
        }
    }
}

data class HabitsUiState(
    val isLoading: Boolean = false,
    val habits: List<Habit> = emptyList(),
    val error: String? = null
)
