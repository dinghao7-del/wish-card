/**
 * TaskTemplates 任务模板库页面
 * 使用 templates.ts 中真实的 PNG 图标数据，对齐原版截图版式
 */
import { View, Text, ScrollView, Input, Image } from '@tarojs/components';
import { useState, useMemo } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import Icon from '@/components/Icon';
import { MINI_UI_COLORS } from '@/utils/uiTokens';
import {
  TASK_TEMPLATES,
  TASK_CATEGORIES,
  getTaskTemplatesByCategory,
  type TaskTemplate,
} from '@/lib/templates';
import './index.scss';

// 分类映射：将 templates.ts 分类 ID 映射到中文标签
const CATEGORY_LABELS: Record<string, string> = {
  study: '学习',
  life: '家务责任',
  hobby: '爱好',
  independent: '自我管理',
  praise: '性格养成',
  critique: '批评',
};

export default function TaskTemplates() {
  const router = useRouter();
  const mode = (router.params?.mode || 'task') as 'task' | 'habit';
  const isHabitOnly = router.params?.habitOnly === '1';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);

  // 习惯专用分类: 只保留 生活 / 独立 / 表扬 / 批评
  const HABIT_CATEGORY_IDS = new Set(['life', 'independent', 'praise', 'critique']);

  // 根据 mode 筛选可用分类
  const allCategories = isHabitOnly
    ? TASK_CATEGORIES.filter(c => HABIT_CATEGORY_IDS.has(c.id))
    : TASK_CATEGORIES;

  // 页面标题
  const pageTitle = isHabitOnly ? '习惯模板库' : '任务模板库';

  // 筛选后的模板列表
  const filteredTemplates = useMemo(() => {
    let baseTemplates = TASK_TEMPLATES;
    // habitOnly 模式：基础数据只保留习惯相关分类的模板
    if (isHabitOnly) {
      baseTemplates = TASK_TEMPLATES.filter(t => HABIT_CATEGORY_IDS.has(t.category));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return baseTemplates.filter(t => t.title.includes(q));
    }
    const cat = allCategories[activeCategoryIdx];
    if (!cat) return [];
    // 如果选中了"全部"（第一个分类），返回过滤后的所有模板
    if (activeCategoryIdx === 0) return baseTemplates;
    return baseTemplates.filter(t => t.category === cat.id);
  }, [searchQuery, activeCategoryIdx, isHabitOnly]);

  const handleSelect = (template: TaskTemplate) => {
    Taro.setStorageSync('pending_template_selection', JSON.stringify({
      template: {
        title: template.title,
        description: template.title,
        category: template.category,
        stars: template.defaultStars,
        icon: template.icon,
      },
      fromMode: mode,
    }));
    Taro.navigateBack();
  };

  return (
    <View className="templates-page">
      {/* Header */}
      <View className="tpl-header">
        <View className="tpl-header-left" onClick={() => Taro.navigateBack()}>
          <Icon name="chevronLeft" size={40} color={MINI_UI_COLORS.onSurface} />
        </View>
        <Text className="tpl-title">{pageTitle}</Text>
        <View style={{ width: '80rpx' }} />
      </View>

      {/* Search Row */}
      <View className="tpl-search-row">
        <View className="tpl-search-box">
          <Icon name="search" size={28} color={MINI_UI_COLORS.muted} />
          <Input
            className="tpl-search-input"
            value={searchQuery}
            placeholder="搜索模板"
            onInput={(e) => setSearchQuery(e.detail.value)}
          />
        </View>
        <View
          className="tpl-custom-btn"
          onClick={() =>
            Taro.navigateTo({ url: `/pages/tasks/create/index?mode=${mode}&custom=1` })
          }
        >
          <Text className="tpl-custom-text">自定义任务</Text>
        </View>
      </View>

      {/* Category Pills — 用 View 包裹避免 scroll-view padding 警告 */}
      {!searchQuery.trim() && (
        <ScrollView className="cat-scroll" scrollX>
          <View className="cat-pills-wrap">
            {allCategories.map((cat, idx) => (
              <View
                key={cat.id}
                className={`cat-pill ${activeCategoryIdx === idx ? 'active' : ''}`}
                onClick={() => setActiveCategoryIdx(idx)}
              >
                <Text className={`cat-pill-label ${activeCategoryIdx === idx ? 'active' : ''}`}>
                  {CATEGORY_LABELS[cat.id] || cat.label}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Template List — 用 View 包裹 padding 避免 scroll-view padding 警告 */}
      <ScrollView className="tpl-body-scroll" scrollY>
        <View className="tpl-list-wrap">
          <View className="template-list">
            {filteredTemplates.map(tpl => (
              <View
                key={tpl.id}
                className="template-card"
                onClick={() => handleSelect(tpl)}
              >
                {/* 图标区域 — 使用 PNG 图片 */}
                <View className="tpl-icon-wrap">
                  <Image
                    className="tpl-icon-img"
                    src={tpl.icon}
                    mode="aspectFit"
                    onError={() => {
                      (tpl as any).__imgErr = true;
                    }}
                  />
                  {(tpl as any).__imgErr && (
                    <Text className="tpl-icon-emoji">📋</Text>
                  )}
                </View>

                {/* 信息区 */}
                <View className="tpl-info">
                  <View className="tpl-title-row">
                    <Text className="tpl-name">{tpl.title}</Text>
                    <View className={`freq-tag ${tpl.defaultStars >= 4 ? 'weekly' : 'daily'}`}>
                      <Text>{tpl.defaultStars >= 4 ? '每周' : '每天'}</Text>
                    </View>
                  </View>
                  <Text className="tpl-desc">{tpl.title}</Text>
                </View>

                {/* 右侧星星 + 选择按钮 */}
                <View className="tpl-right">
                  <View className="stars-badge">
                    <Icon name="star" size={20} color={MINI_UI_COLORS.rewardDeep} />
                    <Text className="stars-num">{tpl.defaultStars}</Text>
                  </View>
                  <View className="select-btn">
                    <Icon name="plus" size={30} color={MINI_UI_COLORS.primary} />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {filteredTemplates.length === 0 && (
            <View className="empty-state">
              <Icon name="searchX" size={64} color={MINI_UI_COLORS.outlineVariant} />
              <Text className="empty-text">没有匹配的模板</Text>
            </View>
          )}
        </View>
        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
