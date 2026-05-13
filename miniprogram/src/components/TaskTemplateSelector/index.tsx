/**
 * 任务模板选择器 - 小程序版
 * 支持搜索、分类切换、网格展示
 */
import { View, Text, Input, ScrollView, Image } from '@tarojs/components';
import { useState, useMemo } from 'react';
import { getCategoriesByType, TASK_TEMPLATES, type TaskTemplate } from '@/lib/templates';
import { MINI_UI_COLORS } from '@/utils/uiTokens';
import Icon from '../Icon';
import './index.scss';

interface TaskTemplateSelectorProps {
  visible: boolean;
  mode: 'task' | 'habit';
  onSelect: (template: TaskTemplate) => void;
  onClose: () => void;
}

export default function TaskTemplateSelector({ visible, mode, onSelect, onClose }: TaskTemplateSelectorProps) {
  if (!visible) return null;

  const categories = useMemo(() => getCategoriesByType(mode), [mode]);
  const [activeTab, setActiveTab] = useState<string>(categories[0]?.id || '学习');
  const [searchQuery, setSearchQuery] = useState('');

  const currentTemplates = useMemo(() => {
    // 用 activeTab (category id) 从模板列表中过滤
    return TASK_TEMPLATES.filter(t => t.category === activeTab);
  }, [activeTab, mode]);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return currentTemplates;
    const q = searchQuery.toLowerCase();
    let results = (currentTemplates || []).filter(t => t.title.includes(q));
    if (results.length === 0) {
      // 全分类搜索：直接从所有模板中搜索
      results = TASK_TEMPLATES.filter(t => t.title.includes(q));
    }
    return results;
  }, [currentTemplates, searchQuery, mode]);

  const handleSelect = (template: TaskTemplate) => {
    onSelect(template);
    onClose();
  };

  const stopPropagation = (e: any) => { e.stopPropagation(); };

  return (
    <View className="tts-mask" onClick={onClose}>
      <View className="tts-container" onClick={stopPropagation}>
        {/* Header */}
        <View className="tts-header">
          <View className="tts-header-spacer" />
          <Text className="tts-title">选择模板</Text>
          <View className="tts-close-btn" onClick={onClose}>
            <Icon name="x" size={36} color={MINI_UI_COLORS.onSurfaceVariant} />
          </View>
        </View>

        <View className="tts-body">
          {/* 搜索框 */}
          <View className="tts-search-row">
            <View className="tts-search-box">
              <Icon name="search" size={28} color={MINI_UI_COLORS.outlineVariant} />
              <Input
                className="tts-search-input"
                placeholder="搜索模板"
                value={searchQuery}
                onInput={(e) => setSearchQuery(e.detail.value)}
              />
            </View>
          </View>

          {/* 分类 Tabs */}
          {!searchQuery.trim() && (
            <ScrollView className="tts-tabs-scroll" scrollX>
              <View className="tts-tabs">
                {categories.map(cat => (
                  <View
                    key={cat.id}
                    className={`tts-tab ${activeTab === cat.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(cat.id)}
                  >
                    <Text className="tts-tab-label">{cat.label}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* 模板网格 */}
          <ScrollView className="tts-grid-scroll" scrollY>
            <View className="tts-grid">
              {filteredTemplates.map(template => (
                <View
                  key={template.id}
                  className="tts-template-card"
                  onClick={() => handleSelect(template)}
                >
                  <View className="tts-icon-area">
                    <Image className="tts-icon-img" src={template.icon} mode="aspectFit" />
                  </View>
                  <Text className="tts-name">{template.title}</Text>
                  <View className="tts-stars">
                    <Icon name="star" size={18} color={template.defaultStars >= 0 ? MINI_UI_COLORS.reward : MINI_UI_COLORS.danger} />
                    <Text className={`tts-stars-val ${template.defaultStars >= 0 ? '' : 'negative'}`}>
                      {template.defaultStars > 0 ? `+${template.defaultStars}` : template.defaultStars}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            {filteredTemplates.length === 0 && (
              <View className="tts-empty">
                <Text className="tts-empty-text">没有找到匹配的模板</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
