/**
 * 模板选择器（通用版 - 支持任务/习惯模板展示）
 * 对齐截图4: 选择模板弹窗 — 4列简洁网格 + 分类标签 + 自定义添加
 */
import { View, Text, Input, ScrollView, Image } from '@tarojs/components';
import { useState, useMemo } from 'react';
import Taro from '@tarojs/taro';
import { TASK_CATEGORIES, type TaskTemplate, getTaskTemplatesByCategory } from '@/lib/templates';
import Icon from '../Icon';
import './index.scss';

interface Props {
  visible: boolean;
  /** 已有哪些模板ID（用于标记已添加状态） */
  existingIds?: Set<string>;
  /** 点击模板卡片的回调 */
  onSelect?: (template: TaskTemplate) => void;
  onCustomAdd?: () => void;
  customAddText?: string;
  onClose: () => void;
}

export default function TemplatePicker({
  visible,
  existingIds = new Set(),
  onSelect,
  onCustomAdd,
  customAddText = '自定义添加',
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // 使用 TASK_CATEGORIES 中除 study/hobby 外的分类（生活、独立、表扬、批评）
  const displayCategories = useMemo(() => {
    return TASK_CATEGORIES.filter(c => ['life', 'independent', 'praise', 'critique'].includes(c.id));
  }, []);

  const currentCategory = displayCategories[activeTab];

  const filteredTemplates = useMemo(() => {
    let templates = currentCategory ? getTaskTemplatesByCategory(currentCategory.id) : [];
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    // 先搜当前分类
    let results = templates.filter(t => t.title.includes(q));
    if (results.length === 0) {
      // 跨分类搜索
      results = getTaskTemplatesByCategory().filter(t =>
        t.title.includes(q) && ['life', 'independent', 'praise', 'critique'].includes(t.category)
      );
    }
    return results;
  }, [activeTab, searchQuery]);

  const stopPropagation = (e: any) => { e.stopPropagation(); };

  if (!visible) return null;

  return (
    <View className="rts-mask" onClick={onClose}>
      <View className="rts-container" onClick={stopPropagation}>
        {/* ===== Header ===== */}
        <View className="rts-header">
          <Text className="rts-title">选择模板</Text>
          <View className="rts-close-btn" onClick={onClose}>
            <Icon name="x" size={40} color="#3f4a3c" />
          </View>
        </View>

        {/* ===== 搜索栏 + 自定义添加 ===== */}
        <View className="rts-search-row">
          <View className="rts-search-box">
            <Icon name="search" size={28} color="#bbb" />
            <Input
              className="rts-search-input"
              placeholder="搜索模板"
              value={searchQuery}
              onInput={(e) => setSearchQuery(e.detail.value)}
            />
          </View>
          <View className="rts-custom-add-btn" onClick={() => {
            if (onCustomAdd) {
              onCustomAdd();
              return;
            }
            Taro.showModal({
              title: '自定义添加',
              editable: true,
              placeholderText: '请输入名称...',
              success: (res: Taro.showModal.SuccessCallbackResult & { content?: string }) => {
                if (res.confirm && res.content?.trim() && onSelect) {
                  onSelect({
                    id: `custom_${Date.now()}`,
                    title: res.content.trim(),
                    icon: '',
                    category: currentCategory?.id || 'life',
                    defaultStars: 2,
                  });
                }
              },
            } as Taro.showModal.Option & { editable: boolean; placeholderText: string });
          }}>
            <Text className="rts-custom-add-text">{customAddText}</Text>
          </View>
        </View>

        {/* ===== 分类 Tabs（生活/独立/表扬/批评）===== */}
        {!searchQuery.trim() && (
          <ScrollView className="rts-tabs-scroll" scrollX>
            <View className="rts-tabs">
              {displayCategories.map((cat, index) => (
                <View
                  key={cat.id}
                  className={`rts-tab ${activeTab === index ? 'active' : ''}`}
                  onClick={() => setActiveTab(index)}
                >
                  <Text className="rts-tab-label">{cat.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ===== 4列模板网格 ===== */}
        <ScrollView className="rts-grid-scroll" scrollY>
          <View className="rts-grid">
            {filteredTemplates.map(tpl => {
              const isAdded = existingIds.has(tpl.id);
              return (
                <View
                  key={tpl.id}
                  className={`rts-card ${isAdded ? 'added' : ''}`}
                  onClick={() => !isAdded && onSelect?.(tpl)}
                >
                  {/* 图标区域 */}
                  <View className="rts-icon-area">
                    {tpl.icon ? (
                      <Image className="rts-icon-img" src={tpl.icon} mode="aspectFit" />
                    ) : (
                      <Text className="rts-icon-emoji">📋</Text>
                    )}
                  </View>
                  {/* 名称 */}
                  <Text className="rts-name">{tpl.title}</Text>
                  {/* 星星数 */}
                  <View className="rts-stars">
                    <Icon name="star" size={18} color="#F9A825" />
                    <Text className="rts-stars-num">+{(tpl.defaultStars * 10)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          {filteredTemplates.length === 0 && (
            <View className="rts-empty">
              <Icon name="searchX" size={64} color="#ccc" />
              <Text className="rts-empty-text">未找到相关模板</Text>
            </View>
          )}
        </ScrollView>

        {/* 底部安全区占位 */}
        <View style={{ height: 'env(safe-area-inset-bottom)' }} />
      </View>
    </View>
  );
}
