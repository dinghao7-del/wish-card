package com.forestfamily.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.forestfamily.app.ui.auth.*
import com.forestfamily.app.ui.home.HomeScreen
import com.forestfamily.app.ui.habits.*
import com.forestfamily.app.ui.profile.ProfileScreen
import com.forestfamily.app.ui.profile.AppSettingsScreen
import com.forestfamily.app.ui.rewards.*
import com.forestfamily.app.ui.tasks.*

@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.Welcome.route
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    
    // 底部导航是否显示
    val showBottomBar = currentDestination?.route in BottomNavItem.entries.map { it.route }
    
    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    BottomNavItem.entries.forEach { item ->
                        NavigationBarItem(
                            icon = { Icon(item.icon, contentDescription = item.title) },
                            label = { Text(item.title) },
                            selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding)
        ) {
            // 认证流程
            composable(Screen.Welcome.route) {
                WelcomeScreen(
                    onNavigateToLogin = { navController.navigate(Screen.Login.route) },
                    onNavigateToCreateFamily = { navController.navigate(Screen.CreateFamily.route) },
                    onNavigateToJoinFamily = { navController.navigate(Screen.JoinFamily.route) }
                )
            }
            
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.SelectMember.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToRegister = { navController.navigate(Screen.Register.route) },
                    onNavigateToCreateFamily = {
                        navController.navigate(Screen.CreateFamily.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateToJoinFamily = {
                        navController.navigate(Screen.JoinFamily.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                )
            }
            
            composable(Screen.Register.route) {
                RegisterScreen(
                    onRegisterSuccess = {
                        navController.navigate(Screen.CreateFamily.route) {
                            popUpTo(Screen.Register.route) { inclusive = true }
                        }
                    },
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToLogin = {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.Register.route) { inclusive = true }
                        }
                    }
                )
            }
            
            composable(Screen.CreateFamily.route) {
                CreateFamilyScreen(
                    onFamilyCreated = {
                        navController.navigate(Screen.SelectMember.route) {
                            popUpTo(Screen.CreateFamily.route) { inclusive = true }
                        }
                    },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable(Screen.JoinFamily.route) {
                JoinFamilyScreen(
                    onFamilyJoined = {
                        navController.navigate(Screen.SelectMember.route) {
                            popUpTo(Screen.JoinFamily.route) { inclusive = true }
                        }
                    },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable(Screen.SelectMember.route) {
                SelectMemberScreen(
                    onMemberSelected = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.SelectMember.route) { inclusive = true }
                        }
                    },
                    onAddMember = {
                        navController.navigate(Screen.CreateFamily.route)
                    }
                )
            }
            
            // 主页面
            composable(Screen.Home.route) {
                HomeScreen(
                    onNavigateToTasks = { navController.navigate(Screen.Tasks.route) },
                    onNavigateToHabits = { navController.navigate(Screen.Habits.route) },
                    onNavigateToRewards = { navController.navigate(Screen.Rewards.route) },
                    onNavigateToTaskDetail = { taskId -> 
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    }
                )
            }
            
            composable(Screen.Tasks.route) {
                TasksScreen(
                    onNavigateToCreateTask = { navController.navigate(Screen.CreateTask.route) },
                    onNavigateToTaskDetail = { taskId -> 
                        navController.navigate(Screen.TaskDetail.createRoute(taskId))
                    }
                )
            }
            
            composable(Screen.Habits.route) {
                HabitsScreen(
                    onNavigateToCreateHabit = { navController.navigate(Screen.CreateHabit.route) },
                    onNavigateToHabitDetail = { habitId -> 
                        navController.navigate(Screen.HabitDetail.createRoute(habitId))
                    }
                )
            }
            
            composable(Screen.Rewards.route) {
                RewardsScreen(
                    onNavigateToCreateReward = { navController.navigate(Screen.CreateReward.route) },
                    onNavigateToRewardDetail = { rewardId -> 
                        navController.navigate(Screen.RewardDetail.createRoute(rewardId))
                    }
                )
            }
            
            composable(Screen.Profile.route) {
                ProfileScreen(
                    onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                    onLogout = {
                        navController.navigate(Screen.Welcome.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }
            
            // 详情页
            composable(
                route = Screen.TaskDetail.route,
                arguments = listOf(navArgument("taskId") { type = NavType.StringType })
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getString("taskId") ?: ""
                TaskDetailScreen(
                    taskId = taskId,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable(Screen.CreateTask.route) {
                CreateTaskScreen(
                    onTaskCreated = { navController.popBackStack() },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable(
                route = Screen.EditTask.route,
                arguments = listOf(navArgument("taskId") { type = NavType.StringType })
            ) { backStackEntry ->
                val taskId = backStackEntry.arguments?.getString("taskId") ?: ""
                EditTaskScreen(
                    taskId = taskId,
                    onTaskUpdated = { navController.popBackStack() },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable(Screen.CreateHabit.route) {
                CreateHabitScreen(
                    onHabitCreated = { navController.popBackStack() },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable(Screen.CreateReward.route) {
                CreateRewardScreen(
                    onRewardCreated = { navController.popBackStack() },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            
            composable(Screen.Settings.route) {
                AppSettingsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}
