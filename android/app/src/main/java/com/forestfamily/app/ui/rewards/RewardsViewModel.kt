package com.forestfamily.app.ui.rewards

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.forestfamily.app.data.model.*
import com.forestfamily.app.data.repository.RewardRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RewardsViewModel @Inject constructor(
    private val rewardRepository: RewardRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RewardsUiState())
    val uiState: StateFlow<RewardsUiState> = _uiState.asStateFlow()

    private val _currentMember = MutableStateFlow<Member?>(null)
    val currentMember: StateFlow<Member?> = _currentMember.asStateFlow()

    init {
        loadMockRewards()
    }

    private fun loadMockRewards() {
        viewModelScope.launch {
            _uiState.value = RewardsUiState(isLoading = true)

            _currentMember.value = Member(
                id = "member-1",
                name = "小明",
                stars = 85
            )

            val mockRewards = listOf(
                Reward(
                    id = "1",
                    title = "半小时游戏时间",
                    description = "可以自由玩半小时游戏",
                    starCost = 20,
                    icon = "🎮",
                    category = "娱乐"
                ),
                Reward(
                    id = "2",
                    title = "冰淇淋一个",
                    description = "可以选择喜欢的口味",
                    starCost = 15,
                    icon = "🍦",
                    category = "美食"
                ),
                Reward(
                    id = "3",
                    title = "买一本新书",
                    description = "可以挑选一本想看的书",
                    starCost = 50,
                    icon = "📚",
                    category = "学习"
                ),
                Reward(
                    id = "4",
                    title = "周末去公园玩",
                    description = "和家长一起去公园玩耍",
                    starCost = 30,
                    icon = "🌳",
                    category = "活动"
                )
            )

            _uiState.value = RewardsUiState(
                isLoading = false,
                rewards = mockRewards
            )
        }
    }

    fun redeemReward(rewardId: String) {
        val member = _currentMember.value ?: return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRedeeming = true)
            
            try {
                rewardRepository.createRedemption(rewardId, member.id)
                _uiState.value = _uiState.value.copy(
                    isRedeeming = false,
                    message = "兑换成功，等待家长审批！"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isRedeeming = false,
                    error = e.message
                )
            }
        }
    }
}

data class RewardsUiState(
    val isLoading: Boolean = false,
    val rewards: List<Reward> = emptyList(),
    val isRedeeming: Boolean = false,
    val error: String? = null,
    val message: String? = null
)
