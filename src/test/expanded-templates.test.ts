import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALL_REWARD_TEMPLATES,
  ALL_TASK_TEMPLATES,
  REWARD_CATEGORIES,
  TASK_CATEGORIES,
} from '../lib/templates';
import { PLAN_SCENES } from '../lib/planTemplates';

const publicRoot = join(process.cwd(), 'public');

describe('expanded family template library', () => {
  it('covers age-group task templates and gamified study templates', () => {
    expect(ALL_TASK_TEMPLATES.length).toBeGreaterThanOrEqual(150);

    const ageGroups = Array.from(new Set(
      ALL_TASK_TEMPLATES.map(template => template.ageGroup).filter(Boolean)
    ));

    expect(ageGroups).toEqual(expect.arrayContaining([
      '2-3岁',
      '3-4岁',
      '4-5岁',
      '5-6岁',
      '6-8岁',
      '9-12岁',
      '13-15岁',
      '6-15岁',
    ]));

    expect(TASK_CATEGORIES.map(category => category.label)).toEqual(expect.arrayContaining([
      '2-3岁启蒙',
      '5-6岁幼小衔接',
      '6-8岁学习启动',
      '9-12岁自主成长',
      '13-15岁初中自主',
      '积分学习法',
    ]));

    expect(ALL_TASK_TEMPLATES.map(template => template.title)).toEqual(expect.arrayContaining([
      '勇气提问者',
      '错题猎人',
      '古神的赞许',
      '负循环破盾',
      '复盘开宝箱',
    ]));
  });

  it('expands reward templates with playful wish-card names', () => {
    expect(ALL_REWARD_TEMPLATES.length).toBeGreaterThanOrEqual(60);
    expect(REWARD_CATEGORIES.map(category => category.label)).toContain('星愿副本');

    expect(ALL_REWARD_TEMPLATES.map(template => template.name)).toEqual(expect.arrayContaining([
      '星愿补给箱',
      '错题猎人宝箱',
      '妈妈菜单权',
      '爸爸陪玩30分',
      '大愿望存钱罐',
    ]));
  });

  it('adds schedule plan scenes for key child development stages', () => {
    expect(PLAN_SCENES.map(scene => scene.name)).toEqual(expect.arrayContaining([
      '2-3岁启蒙日程',
      '3-5岁幼儿园日程',
      '5-6岁幼小衔接日程',
      '6-8岁学习启动日程',
      '9-12岁自主成长日程',
      '13-15岁初中自主日程',
    ]));

    expect(new Set(PLAN_SCENES.map(scene => scene.id)).size).toBe(PLAN_SCENES.length);
  });

  it('uses existing local image assets for generated template icons', () => {
    const imageRefs = [
      ...ALL_TASK_TEMPLATES.map(template => template.icon),
      ...ALL_REWARD_TEMPLATES.map(template => template.icon),
    ].filter(icon => icon.startsWith('/'));

    const missing = imageRefs.filter(icon => !existsSync(join(publicRoot, icon)));

    expect(missing).toEqual([]);
  });
});
