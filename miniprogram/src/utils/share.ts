import Taro from '@tarojs/taro';
import { shareTracking } from './analytics';
import { APP_NAME } from '@/lib/appMeta';

/**
 * 创建分享卡片配置
 * @param params 分享参数
 */
export const createShareCard = (params: {
  title: string;
  path: string;
  imageUrl?: string;
  taskId?: string;
}) => {
  // 获取当前用户信息
  const userInfo = Taro.getStorageSync('userInfo') || {};
  const inviterId = userInfo.id || '';
  
  return {
    title: params.title,
    path: `${params.path}?inviter=${inviterId}&taskId=${params.taskId || ''}&from=share`,
    imageUrl: params.imageUrl || '/assets/share/default-card.png',
  };
};

/**
 * 首页分享钩子
 */
export const useHomeShare = () => {
  return {
    onShareAppMessage() {
      return createShareCard({
        title: `来${APP_NAME}，把家庭日程和愿望一起安排好`,
        path: '/pages/home/index',
        imageUrl: '/assets/share/invite-family.png',
      });
    },
    
    onShareTimeline() {
      return {
        title: `${APP_NAME} - 家庭日程与心愿管家`,
        query: `inviter=${Taro.getStorageSync('userInfo')?.id || ''}`,
        imageUrl: '/assets/share/moments.png',
      };
    },
  };
};

/**
 * 任务分享钩子
 */
export const useTaskShare = (task: any) => {
  return {
    onShareAppMessage() {
      if (!task) return createShareCard({
        title: `${APP_NAME} - 家庭任务管理`,
        path: '/pages/home/index',
      });
      
      return createShareCard({
        title: `✅ 我完成了任务「${task.title}」！`,
        path: '/pages/tasks/detail/index',
        taskId: task.id,
        imageUrl: '/assets/share/task-complete.png',
      });
    },
  };
};

/**
 * 处理邀请链接
 * 当用户通过分享链接进入时，记录邀请关系
 */
export const handleInvite = async (inviterId: string) => {
  if (!inviterId) return;
  
  const currentUser = Taro.getStorageSync('userInfo');
  if (!currentUser || currentUser.id === inviterId) return;
  
  try {
    // 记录邀请关系（需要后端支持）
    await Taro.request({
      url: `${process.env.API_BASE}/api/invitations`,
      method: 'POST',
      data: {
        inviter_id: inviterId,
        invitee_id: currentUser.id,
      },
    });
    
    // 给邀请人发送奖励（后端处理）
    console.log('[Share] 邀请关系已记录', { inviterId, inviteeId: currentUser.id });
  } catch (err) {
    console.error('[Share] 记录邀请关系失败', err);
  }
};

/**
 * 生成分享卡片图片
 * 用于将任务完成情况生成精美的分享卡片
 */
export const generateShareCard = async (params: {
  title: string;
  subtitle?: string;
  avatar?: string;
  bgColor?: string;
}) => {
  // 使用 Canvas 生成分享卡片
  // 这是一个示例，需要根据实际需求实现
  console.log('[Share] 生成分享卡片', params);
  
  // 返回临时文件路径
  return '/assets/share/default-card.png';
};
