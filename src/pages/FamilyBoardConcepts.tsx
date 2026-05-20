import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudSun,
  Home,
  Mic2,
  Monitor,
  RefreshCw,
  Sparkles,
  Star,
  Tablet,
  Trophy,
  Users,
  Volume2,
  Wand2,
} from 'lucide-react';
import { cn } from '../lib/utils';

type ConceptId = 'command' | 'operator' | 'child';

interface ConceptMeta {
  id: ConceptId;
  title: string;
  subtitle: string;
  device: string;
  accent: string;
}

interface MemberTrack {
  name: string;
  role: string;
  color: string;
  text: string;
  status: string;
  load: string;
  events: Array<{
    title: string;
    time: string;
    left: number;
    width: number;
    tone: string;
  }>;
}

interface BoardTask {
  title: string;
  owner: string;
  time: string;
  tone: string;
  icon: 'book' | 'car' | 'home' | 'star' | 'check';
}

const concepts: ConceptMeta[] = [
  {
    id: 'command',
    title: '电视遥控总控屏',
    subtitle: '遥控器优先，语音辅助',
    device: 'TV 16:9',
    accent: 'bg-[#0f7a3b] text-white',
  },
  {
    id: 'child',
    title: '平板 / 彩墨展示屏',
    subtitle: '触控与语音并重，可常亮展示',
    device: 'Tablet / Color E-ink',
    accent: 'bg-[#b4542a] text-white',
  },
  {
    id: 'operator',
    title: 'AI 语音配置流',
    subtitle: '复杂设定通过对话完成',
    device: 'All devices',
    accent: 'bg-[#22577a] text-white',
  },
];

const members: MemberTrack[] = [
  {
    name: '妈妈',
    role: '统筹',
    color: 'bg-[#0f7a3b]',
    text: 'text-[#0f7a3b]',
    status: '18:20 前到家',
    load: '偏忙',
    events: [
      { title: '公司会议', time: '09:30-11:00', left: 18, width: 16, tone: 'bg-[#b8d7f1] text-[#14364d]' },
      { title: '接安安', time: '17:10', left: 66, width: 9, tone: 'bg-[#f4b66d] text-[#583300]' },
      { title: '作业确认', time: '20:00', left: 83, width: 10, tone: 'bg-[#d8c7ff] text-[#382360]' },
    ],
  },
  {
    name: '爸爸',
    role: '支持',
    color: 'bg-[#22577a]',
    text: 'text-[#22577a]',
    status: '晚饭负责',
    load: '均衡',
    events: [
      { title: '远程会议', time: '14:00-15:30', left: 49, width: 15, tone: 'bg-[#c6ddf0] text-[#14364d]' },
      { title: '买菜', time: '16:20', left: 62, width: 9, tone: 'bg-[#d7ead2] text-[#1f522d]' },
      { title: '晚饭', time: '18:30', left: 74, width: 11, tone: 'bg-[#ffe1a8] text-[#5a3a00]' },
    ],
  },
  {
    name: '安安',
    role: '孩子',
    color: 'bg-[#b4542a]',
    text: 'text-[#b4542a]',
    status: '先作业后心愿',
    load: '略满',
    events: [
      { title: '在校', time: '08:00-16:00', left: 10, width: 52, tone: 'bg-[#d9ead3] text-[#24522c]' },
      { title: '数学作业', time: '16:40', left: 64, width: 10, tone: 'bg-[#ffe1a8] text-[#5a3a00]' },
      { title: '阅读', time: '20:00', left: 84, width: 9, tone: 'bg-[#d8c7ff] text-[#382360]' },
    ],
  },
  {
    name: '奶奶',
    role: '照看',
    color: 'bg-[#6d5f2b]',
    text: 'text-[#6d5f2b]',
    status: '下午可帮忙',
    load: '轻松',
    events: [
      { title: '午休', time: '13:00', left: 42, width: 9, tone: 'bg-[#eee4cb] text-[#56451e]' },
      { title: '陪练琴', time: '19:20', left: 79, width: 10, tone: 'bg-[#cfe6df] text-[#1b4f46]' },
    ],
  },
];

const boardTasks: BoardTask[] = [
  { title: '数学作业签字', owner: '妈妈', time: '20:00 前', tone: 'border-[#b4542a] bg-[#fff5ef]', icon: 'book' },
  { title: '接送空手道确认', owner: '爸爸', time: '周三 17:40', tone: 'border-[#22577a] bg-[#f1f7fb]', icon: 'car' },
  { title: '晚饭后阅读 20 分钟', owner: '安安', time: '20:00', tone: 'border-[#0f7a3b] bg-[#f1f8ef]', icon: 'star' },
  { title: '明天校服和水杯', owner: '全家', time: '睡前', tone: 'border-[#6d5f2b] bg-[#fbf7e8]', icon: 'check' },
];

const commandCards = [
  { label: '正在听', value: '把空手道课加到每周三晚上六点', icon: Mic2, tone: 'bg-[#0f7a3b] text-white' },
  { label: '我理解为', value: '新增固定课外班，并自动预留路程', icon: Wand2, tone: 'bg-white text-[#14301b]' },
  { label: '需要确认', value: '阅读与接送时间重叠，建议顺延', icon: AlertTriangle, tone: 'bg-[#ffe1a8] text-[#5a3a00]' },
];

const taskIconMap = {
  book: BookOpen,
  car: Car,
  home: Home,
  star: Star,
  check: CheckCircle2,
};

export default function FamilyBoardConcepts() {
  const [activeId, setActiveId] = useState<ConceptId>('command');
  const active = useMemo(() => concepts.find(item => item.id === activeId) || concepts[0], [activeId]);

  return (
    <div className="min-h-screen bg-[#f4f1e8] text-[#162017] [letter-spacing:0]">
      <header className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black leading-tight md:text-5xl" style={{ letterSpacing: 0 }}>
              星愿卡家庭 AI 中控屏
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[#516052] md:text-lg">
              三版 UI 原型围绕同一个核心：彩墨屏和平板合并为家庭展示窗口，电视单独采用遥控器优先的交互逻辑。
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[#c9d3c4] bg-white px-4 py-3 text-sm font-black text-[#2d3d2d] shadow-sm">
            <Volume2 size={18} />
            唤醒词：星愿管家
          </div>
        </div>

        <nav className="grid gap-3 md:grid-cols-3" aria-label="家庭中控屏 UI 版本">
          {concepts.map(concept => (
            <button
              key={concept.id}
              type="button"
              onClick={() => setActiveId(concept.id)}
              className={cn(
                'min-h-24 rounded-lg border p-4 text-left transition-all duration-150',
                activeId === concept.id
                  ? 'border-[#0f7a3b] bg-white shadow-md'
                  : 'border-[#d5ddd1] bg-white/65 hover:bg-white'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={cn('rounded-md px-2.5 py-1 text-xs font-black', concept.accent)}>{concept.device}</span>
                {activeId === concept.id && <CheckCircle2 size={18} className="text-[#0f7a3b]" />}
              </div>
              <p className="mt-3 text-lg font-black text-[#172017]">{concept.title}</p>
              <p className="mt-1 text-sm font-bold leading-5 text-[#637066]">{concept.subtitle}</p>
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 pb-10 md:px-8">
        <section className="rounded-lg border border-[#cfd8c9] bg-white p-3 shadow-xl shadow-[#182414]/10 md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className={cn('rounded-md px-3 py-1.5 text-sm font-black', active.accent)}>{active.title}</span>
              <span className="text-sm font-bold text-[#68756a]">{active.subtitle}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-[#68756a]">
              <Monitor size={16} />
              1920 x 1080
              <span className="h-4 w-px bg-[#cdd7c7]" />
              <Tablet size={16} />
              平板 / 彩墨共用
            </div>
          </div>

          {activeId === 'command' && <CommandCenterConcept />}
          {activeId === 'operator' && <AIOperatorConcept />}
          {activeId === 'child' && <TouchPanelConcept />}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {concepts.map(concept => (
            <button
              key={`mini-${concept.id}`}
              type="button"
              onClick={() => setActiveId(concept.id)}
              className={cn(
                'rounded-lg border bg-white p-4 text-left shadow-sm transition-all',
                activeId === concept.id ? 'border-[#0f7a3b]' : 'border-[#d8dfd3]'
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-[#1d291d]">{concept.title}</p>
                <ChevronRight size={16} className="text-[#758171]" />
              </div>
              <p className="mt-2 text-xs font-bold leading-5 text-[#657166]">{concept.subtitle}</p>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}

function CommandCenterConcept() {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#eef5eb] p-[1.6%] text-[#172017]">
      <div className="grid h-full grid-rows-[11%_1fr_13%] gap-[1.3%]">
        <BoardHeader mode="command" title="电视遥控首页 · 今天 5月17日" subtitle="方向键切换焦点，OK 查看详情；长按语音键直接吩咐星愿管家" />

        <div className="grid min-h-0 grid-cols-[19%_1fr_24%] gap-[1.3%]">
          <section className="rounded-lg border-2 border-[#0f7a3b] bg-white p-[5%] shadow-[0_0_0_4px_rgba(15,122,59,0.10)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[clamp(12px,1.05vw,20px)] font-black" style={{ letterSpacing: 0 }}>家庭成员</h2>
              <span className="rounded-md bg-[#0f7a3b] px-2 py-1 text-[clamp(8px,0.62vw,11px)] font-black text-white">当前焦点</span>
            </div>
            <div className="mt-[8%] space-y-[7%]">
              {members.map(member => (
                <div key={member.name} className={cn(
                  'grid grid-cols-[34px_1fr] items-center gap-3 rounded-lg p-2',
                  member.name === '安安' && 'bg-[#eef7eb] ring-2 ring-[#0f7a3b]'
                )}>
                  <div className={cn('flex aspect-square items-center justify-center rounded-lg text-sm font-black text-white', member.color)}>
                    {member.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[clamp(12px,0.95vw,17px)] font-black">{member.name}</p>
                      <span className="rounded-md bg-[#edf1ea] px-1.5 py-0.5 text-[clamp(9px,0.65vw,12px)] font-black text-[#647166]">{member.load}</span>
                    </div>
                    <p className="truncate text-[clamp(10px,0.75vw,13px)] font-bold text-[#657166]">{member.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#c7d6c2] bg-white p-[2.8%]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[clamp(14px,1.2vw,24px)] font-black" style={{ letterSpacing: 0 }}>今日时间轴</h2>
                <p className="text-[clamp(10px,0.75vw,13px)] font-bold text-[#657166]">电视端只展示关键节奏，编辑交给语音或手机</p>
              </div>
              <div className="rounded-lg bg-[#f1f8ef] px-3 py-2 text-[clamp(10px,0.75vw,13px)] font-black text-[#0f7a3b]">
                18:30-19:10 全家空档
              </div>
            </div>

            <div className="mt-[3%] grid grid-cols-[64px_1fr] gap-3">
              <div />
              <div className="grid grid-cols-9 text-center text-[clamp(9px,0.7vw,12px)] font-black text-[#7b8879]">
                {['06', '08', '10', '12', '14', '16', '18', '20', '22'].map(time => <span key={time}>{time}</span>)}
              </div>
              {members.map(member => (
                <TimelineRow key={member.name} member={member} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#c7d6c2] bg-white p-[4%]">
            <div className="flex items-center justify-between">
              <h2 className="text-[clamp(13px,1.05vw,21px)] font-black" style={{ letterSpacing: 0 }}>遥控器可操作</h2>
              <CalendarDays size={20} className="text-[#22577a]" />
            </div>
            <div className="mt-[6%] space-y-[5%]">
              {boardTasks.map(task => {
                const Icon = taskIconMap[task.icon];
                return (
                  <div key={task.title} className={cn(
                    'rounded-lg border-l-4 p-3',
                    task.tone,
                    task.title === '接送空手道确认' && 'ring-2 ring-[#22577a]'
                  )}>
                    <div className="flex items-start gap-2">
                      <Icon size={17} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[clamp(11px,0.9vw,15px)] font-black leading-tight">{task.title}</p>
                        <p className="mt-1 text-[clamp(9px,0.72vw,12px)] font-bold opacity-75">{task.owner} · {task.time}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <AIFooter text="遥控器：↑↓←→ 移动焦点 · OK 查看/确认 · 返回上层 · 长按语音键可说“帮我重新排今天晚上”。" />
      </div>
    </div>
  );
}

function AIOperatorConcept() {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#eaf2f4] p-[1.6%] text-[#10202a]">
      <div className="grid h-full grid-rows-[11%_1fr] gap-[1.3%]">
        <BoardHeader mode="operator" title="星愿管家正在处理" subtitle="语音设定：下周三新增空手道课，并自动调整晚间任务" />

        <div className="grid min-h-0 grid-cols-[32%_1fr_25%] gap-[1.3%]">
          <section className="rounded-lg border border-[#b9cdd5] bg-white p-[5%]">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#22577a] text-white">
                <Mic2 size={27} />
              </div>
              <div>
                <p className="text-[clamp(12px,0.9vw,16px)] font-black text-[#22577a]">正在听</p>
                <h2 className="text-[clamp(20px,2vw,38px)] font-black leading-tight" style={{ letterSpacing: 0 }}>把空手道课加到每周三晚上六点</h2>
              </div>
            </div>

            <div className="mt-[8%] space-y-3">
              {commandCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={cn('rounded-lg border border-[#d4e0e3] p-4', card.tone)}>
                    <div className="flex items-start gap-3">
                      <Icon size={20} className="shrink-0" />
                      <div>
                        <p className="text-[clamp(10px,0.75vw,13px)] font-black opacity-75">{card.label}</p>
                        <p className="mt-1 text-[clamp(12px,0.95vw,17px)] font-black leading-snug">{card.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[#b9cdd5] bg-white p-[3.5%]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[clamp(11px,0.8vw,14px)] font-black text-[#22577a]">我理解为</p>
                <h2 className="text-[clamp(19px,1.65vw,32px)] font-black" style={{ letterSpacing: 0 }}>创建固定课外班，并调整冲突日程</h2>
              </div>
              <div className="rounded-lg bg-[#edf6f8] px-3 py-2 text-[clamp(10px,0.75vw,13px)] font-black text-[#22577a]">置信度 96%</div>
            </div>

            <div className="mt-[4%] grid grid-cols-2 gap-3">
              <OperatorField label="执行人" value="安安" />
              <OperatorField label="重复" value="每周三 18:00-19:00" />
              <OperatorField label="路程" value="17:40 出发，19:20 到家" />
              <OperatorField label="同步" value="家庭日历、电视、平板/彩墨屏" />
            </div>

            <div className="mt-[4%] rounded-lg border border-[#f0c36d] bg-[#fff6dd] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[#9b6200]" />
                <div>
                  <p className="text-[clamp(12px,0.95vw,17px)] font-black text-[#5a3a00]">发现 2 个影响</p>
                  <p className="mt-1 text-[clamp(10px,0.78vw,13px)] font-bold leading-5 text-[#6b5525]">
                    周三阅读与回家时间重叠；爸爸 18:00 有会议，接送建议改由妈妈或奶奶确认。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-[4%] grid grid-cols-3 gap-3">
              {['新增空手道课', '阅读顺延到20:00', '发送接送确认'].map((item, index) => (
                <div key={item} className="rounded-lg border border-[#d5e0e4] bg-[#f8fbfc] p-3">
                  <p className="text-[clamp(10px,0.75vw,13px)] font-black text-[#6a7880]">步骤 {index + 1}</p>
                  <p className="mt-1 text-[clamp(12px,0.95vw,16px)] font-black text-[#10202a]">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-[4%] flex gap-3">
              <button className="min-h-11 flex-1 rounded-lg bg-[#22577a] px-4 py-3 text-[clamp(11px,0.9vw,15px)] font-black text-white">确认执行</button>
              <button className="min-h-11 flex-1 rounded-lg border border-[#b9cdd5] bg-white px-4 py-3 text-[clamp(11px,0.9vw,15px)] font-black text-[#22577a]">继续修改</button>
            </div>
          </section>

          <section className="rounded-lg border border-[#b9cdd5] bg-[#10202a] p-[5%] text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-[clamp(13px,1.05vw,21px)] font-black" style={{ letterSpacing: 0 }}>AI 工具调用</h2>
              <Sparkles size={20} className="text-[#a9e6c4]" />
            </div>
            <div className="mt-[8%] space-y-3">
              {[
                ['calendar.create', '准备新增固定日程'],
                ['schedule.detectConflict', '检查全家冲突'],
                ['task.reschedule', '顺延阅读任务'],
                ['notification.ask', '发起接送确认'],
                ['device.sync', '同步到电视与家庭展示屏'],
              ].map(([name, desc], index) => (
                <div key={name} className="rounded-lg border border-white/12 bg-white/8 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#a9e6c4] text-xs font-black text-[#10202a]">{index + 1}</span>
                    <p className="text-[clamp(10px,0.75vw,13px)] font-black text-[#dff5e8]">{name}</p>
                  </div>
                  <p className="mt-2 text-[clamp(10px,0.75vw,13px)] font-bold text-white/68">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TouchPanelConcept() {
  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#f7efe6] p-[1.6%] text-[#251710]">
      <div className="grid h-full grid-rows-[11%_1fr_13%] gap-[1.3%]">
        <BoardHeader mode="child" title="平板 / 彩墨家庭展示屏" subtitle="同一套 UI 覆盖平板和彩色墨水屏：触控为主，语音随时补充复杂操作" />

        <div className="grid min-h-0 grid-cols-[29%_1fr_24%] gap-[1.3%]">
          <section className="rounded-lg border border-[#e2c7b7] bg-white p-[4.5%]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[clamp(11px,0.82vw,14px)] font-black text-[#b4542a]">常亮模式</p>
                <h2 className="mt-1 text-[clamp(22px,2.15vw,41px)] font-black leading-none" style={{ letterSpacing: 0 }}>今日安排</h2>
              </div>
              <div className="rounded-lg bg-[#fff1d9] px-3 py-2 text-[clamp(10px,0.75vw,13px)] font-black text-[#8d4b2d]">彩墨友好</div>
            </div>

            <div className="mt-[7%] space-y-2">
              {[
                ['07:30', '早餐 / 出门', '全家'],
                ['16:40', '数学作业', '安安'],
                ['18:30', '晚饭', '全家'],
                ['20:00', '阅读 20 分钟', '安安'],
              ].map(([time, title, owner]) => (
                <div key={`${time}-${title}`} className="grid grid-cols-[23%_1fr] rounded-lg border border-[#ead6ca] bg-[#fffaf5] p-3">
                  <p className="text-[clamp(12px,1vw,18px)] font-black text-[#b4542a]">{time}</p>
                  <div>
                    <p className="text-[clamp(12px,1vw,18px)] font-black leading-tight">{title}</p>
                    <p className="mt-1 text-[clamp(9px,0.72vw,12px)] font-bold text-[#7d6254]">{owner}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#e2c7b7] bg-white p-[3.5%]">
            <div className="flex items-center justify-between">
              <h2 className="text-[clamp(18px,1.6vw,31px)] font-black" style={{ letterSpacing: 0 }}>家庭触控面板</h2>
              <div className="rounded-lg bg-[#f7efe6] px-3 py-2 text-[clamp(10px,0.75vw,13px)] font-black text-[#8d4b2d]">点击卡片即可编辑</div>
            </div>
            <div className="mt-[5%] grid h-[45%] grid-cols-3 gap-3">
              {[
                { title: '日程', desc: '查看今日与本周安排', icon: CalendarDays, tone: 'bg-[#0f7a3b] text-white' },
                { title: '待确认', desc: '作业签字、接送确认', icon: CheckCircle2, tone: 'bg-[#22577a] text-white' },
                { title: '心愿', desc: '星星进度与兑现时间', icon: Trophy, tone: 'bg-[#b4542a] text-white' },
              ].map(({ title, desc, icon: Icon, tone }) => (
                <button key={title} className="flex flex-col items-start rounded-lg border border-[#ead6ca] bg-[#fffaf5] p-4 text-left">
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tone)}>
                    <Icon size={20} />
                  </span>
                  <p className="mt-4 text-[clamp(15px,1.25vw,24px)] font-black leading-tight">{title}</p>
                  <p className="mt-2 text-[clamp(10px,0.78vw,13px)] font-bold leading-5 text-[#7d6254]">{desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-[4%] grid grid-cols-[1fr_34%] gap-3">
              <div className="rounded-lg border border-[#d8c08e] bg-[#fff8e5] p-4">
                <div className="flex items-center gap-3">
                  <Star size={25} className="fill-[#b98718] text-[#b98718]" />
                  <div>
                    <p className="text-[clamp(14px,1.2vw,23px)] font-black">安安：周末电影夜</p>
                    <p className="text-[clamp(10px,0.78vw,13px)] font-bold text-[#715b2a]">还差 45 星，预计 3 天达成</p>
                  </div>
                </div>
                <div className="mt-3 h-3 rounded-full bg-[#e7d19c]">
                  <div className="h-3 w-[72%] rounded-full bg-[#b98718]" />
                </div>
              </div>
              <button className="rounded-lg bg-[#b4542a] p-4 text-left text-white">
                <Mic2 size={22} />
                <p className="mt-2 text-[clamp(13px,1.05vw,19px)] font-black">语音补充</p>
                <p className="mt-1 text-[clamp(9px,0.72vw,12px)] font-bold opacity-80">说复杂需求</p>
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-[#e2c7b7] bg-[#251710] p-[5%] text-white">
            <h2 className="text-[clamp(13px,1.05vw,21px)] font-black" style={{ letterSpacing: 0 }}>适合摆放</h2>
            <div className="mt-[8%] space-y-3">
              {[
                ['餐边柜', '全家出门前看一眼'],
                ['书桌旁', '孩子执行任务时看'],
                ['玄关', '接送、校服、物品提醒'],
                ['彩墨硬件', '常亮展示低功耗'],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-lg border border-white/12 bg-white/8 p-3">
                  <p className="text-[clamp(12px,0.95vw,16px)] font-black">{title}</p>
                  <p className="mt-1 text-[clamp(9px,0.72vw,12px)] font-bold text-white/65">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <AIFooter text="平板和彩墨屏共用一套触控展示 UI：可以点击确认，也可以说“把这个安排同步给爸爸”。" />
      </div>
    </div>
  );
}

function BoardHeader({ mode, title, subtitle }: { mode: ConceptId; title: string; subtitle: string }) {
  const tone = {
    command: 'bg-white border-[#c7d6c2]',
    operator: 'bg-white border-[#b9cdd5]',
    child: 'bg-white border-[#e2c7b7]',
  }[mode];

  return (
    <header className={cn('grid grid-cols-[1fr_auto] items-center rounded-lg border px-[2.2%] py-[1.1%]', tone)}>
      <div className="min-w-0">
        <h2 className="truncate text-[clamp(16px,1.45vw,28px)] font-black leading-tight" style={{ letterSpacing: 0 }}>{title}</h2>
        <p className="truncate text-[clamp(10px,0.82vw,14px)] font-bold text-[#667266]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg bg-[#f1f6ef] px-3 py-2 text-[clamp(10px,0.75vw,13px)] font-black text-[#0f7a3b] md:flex">
          <CloudSun size={17} />
          23°C 舒适
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-[#172017] px-3 py-2 text-[clamp(10px,0.75vw,13px)] font-black text-white">
          <Mic2 size={17} />
          星愿管家
        </div>
      </div>
    </header>
  );
}

function TimelineRow({ member }: { member: MemberTrack }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className={cn('h-3 w-3 rounded-full', member.color)} />
        <span className="text-[clamp(10px,0.78vw,13px)] font-black">{member.name}</span>
      </div>
      <div className="relative h-[clamp(38px,4vw,72px)] rounded-lg bg-[#f2f5f0]">
        <div className="absolute inset-y-0 left-[50%] w-px bg-[#cdd7c7]" />
        <div className="absolute inset-y-0 left-[75%] w-px bg-[#cdd7c7]" />
        {member.events.map(event => (
          <div
            key={`${member.name}-${event.title}`}
            className={cn('absolute top-1/2 flex h-[72%] -translate-y-1/2 items-center justify-center rounded-md px-2 text-center text-[clamp(8px,0.68vw,12px)] font-black leading-tight shadow-sm', event.tone)}
            style={{ left: `${event.left}%`, width: `${event.width}%` }}
          >
            <span className="truncate">{event.title}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function OperatorField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d5e0e4] bg-[#f8fbfc] p-3">
      <p className="text-[clamp(10px,0.75vw,13px)] font-black text-[#6a7880]">{label}</p>
      <p className="mt-1 text-[clamp(12px,0.95vw,17px)] font-black text-[#10202a]">{value}</p>
    </div>
  );
}

function AIFooter({ text }: { text: string }) {
  return (
    <footer className="grid grid-cols-[1fr_auto] items-center rounded-lg border border-[#c7d6c2] bg-[#172017] px-[2.2%] py-[1.1%] text-white">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#a8e6b1] text-[#172017]">
          <Sparkles size={22} />
        </div>
        <p className="truncate text-[clamp(11px,0.95vw,17px)] font-black">{text}</p>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[clamp(10px,0.75vw,13px)] font-black">
        <RefreshCw size={16} />
        已同步
      </div>
    </footer>
  );
}
