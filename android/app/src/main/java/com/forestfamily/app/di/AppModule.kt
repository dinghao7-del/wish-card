package com.forestfamily.app.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.forestfamily.app.data.repository.FamilyRepository
import com.forestfamily.app.data.repository.RewardRepository
import com.forestfamily.app.data.repository.TaskRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "forest_family_prefs")

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
        return context.dataStore
    }

    @Provides
    @Singleton
    fun provideFamilyRepository(): FamilyRepository = FamilyRepository()

    @Provides
    @Singleton
    fun provideTaskRepository(): TaskRepository = TaskRepository()

    @Provides
    @Singleton
    fun provideRewardRepository(): RewardRepository = RewardRepository()
}
