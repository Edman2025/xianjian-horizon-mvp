'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, Bell, Bot, Check, ChevronRight, CircleDollarSign,
  Clock3, Compass, Flame, Inbox, MessageCircle, MoreHorizontal, Search,
  ShieldCheck, Sparkles, Target, UserPlus, UsersRound, WalletCards, Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
type Direction = 'yes' | 'no';
type Stage = 'blind' | 'reveal' | 'confirmed';
type ViewName = 'conversation' | 'discover' | 'circles' | 'positions';
type Topic = {
  id: number; category: string; title: string; shortTitle: string; deadline: string;
  friends: number; joined: number; marketProbability: number; delta: number;
  context: string; evidence: string[];
};
type Position = {
  topicId: number; title: string; direction: Direction; amount: number; price: number; payout: number;
};
type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};

declare global {
  interface Document {
    readonly modelContext?: {
      registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

const topics: Topic[] = [
  {
    id: 1, category: 'AI · 科技', shortTitle: 'OpenAI 新旗舰模型',
    title: 'OpenAI 会在 9 月 30 日前发布新的旗舰模型吗？', deadline: '26 天后截止',
    friends: 12, joined: 3, marketProbability: 62, delta: 7,
    context: '你关注了 AI 模型发布，朋友小岚也收藏了这个话题。',
    evidence: ['两位供应链分析师把发布时间预期提前到 9 月。', '官方尚未确认，基础概率仍有较大不确定性。', '过去 24 小时市场概率上升了 7 个百分点。'],
  },
  {
    id: 2, category: '宏观 · 利率', shortTitle: '下一次议息会议降息',
    title: '美联储会在下一次议息会议上降息吗？', deadline: '18 天后截止',
    friends: 8, joined: 5, marketProbability: 54, delta: -3,
    context: '你订阅了宏观经济，圈子「周五看数据」正在关注。',
    evidence: ['最新就业数据弱于市场预期。', '核心通胀仍高于政策目标。', '利率期货的隐含概率本周回落 3 个百分点。'],
  },
  {
    id: 3, category: '体育 · 足球', shortTitle: '阿森纳本周末取胜',
    title: '阿森纳会赢下本周末的联赛吗？', deadline: '2 天 6 小时后截止',
    friends: 19, joined: 11, marketProbability: 71, delta: 2,
    context: '你和 19 位朋友关注英超，本场是本周讨论最多的比赛。',
    evidence: ['主力前锋已恢复合练。', '对手近五个客场只取得一场胜利。', '预计首发仍可能在赛前发生变化。'],
  },
];

const navItems = [
  { id: 'conversation' as const, label: '对话', icon: Inbox },
  { id: 'discover' as const, label: '发现', icon: Compass },
  { id: 'circles' as const, label: '圈子', icon: UsersRound, badge: '3' },
  { id: 'positions' as const, label: '持仓', icon: WalletCards },
];

const circles = [
  { name: 'AI 前沿局', symbol: 'AI', members: 248, active: 36, topic: 'OpenAI 新旗舰模型', tint: 'indigo' },
  { name: '周五看数据', symbol: '数', members: 126, active: 18, topic: '下一次议息会议降息', tint: 'mint' },
  { name: '英超夜聊', symbol: '球', members: 391, active: 72, topic: '阿森纳本周末取胜', tint: 'coral' },
];

function BrandMark() {
  return (
    <div className="relative grid size-10 shrink-0 place-items-center rounded-[14px] bg-[#1fd1b7] shadow-[0_0_32px_rgba(31,209,183,.22)]">
      <div className="absolute left-[8px] top-[9px] size-2 rounded-full bg-[#07111e]" />
      <div className="h-[18px] w-[17px] rounded-br-[11px] rounded-tl-[11px] border-b-2 border-r-2 border-[#07111e]" />
    </div>
  );
}

function ProbabilityRing({ value }: { value: number }) {
  return (
    <div className="relative grid size-[88px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#25d1b7 ${value * 3.6}deg, #203047 0deg)` }} aria-label={`市场概率 ${value}%`}>
      <div className="grid size-[70px] place-items-center rounded-full bg-[#0d1928] text-center shadow-inner">
        <span><strong className="block text-[1.35rem] font-semibold leading-none text-white">{value}%</strong><small className="mt-1 block text-[.68rem] text-[#7f91a7]">市场</small></span>
      </div>
    </div>
  );
}

function MiniSparkline({ positive }: { positive: boolean }) {
  const path = positive ? 'M2 27 C12 27 14 21 23 22 S36 16 44 19 S58 9 71 11 S83 4 96 6' : 'M2 7 C12 7 16 12 24 10 S39 19 49 17 S65 24 74 21 S87 28 96 26';
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-full" role="img" aria-label="概率走势">
      <path d={path} fill="none" stroke={positive ? '#25d1b7' : '#ff7058'} strokeWidth="8" opacity=".08" strokeLinecap="round" />
      <path d={path} fill="none" stroke={positive ? '#25d1b7' : '#ff7058'} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const [view, setView] = useState<ViewName>('conversation');
  const [topicIndex, setTopicIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('blind');
  const [direction, setDirection] = useState<Direction | null>(null);
  const [amount, setAmount] = useState(10);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [balance, setBalance] = useState(1000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [joinedCircles, setJoinedCircles] = useState<string[]>(['AI 前沿局']);

  const topic = topics[topicIndex];
  const selectedProbability = direction === 'no' ? 100 - topic.marketProbability : topic.marketProbability;
  const price = selectedProbability / 100;
  const odds = 1 / price;
  const payout = amount / price;
  const profit = payout - amount;
  const skillScore = useMemo(() => 74 + Math.min(positions.length * 2, 8), [positions.length]);
  const stateRef = useRef({ topicIndex, stage, direction, amount, balance, positions });
  stateRef.current = { topicIndex, stage, direction, amount, balance, positions };

  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext?.registerTool) return;

    const lifecycle = new AbortController();
    const registerTools = async () => {
      await modelContext.registerTool({
        name: 'read_prediction_mvp_state',
        description: '读取当前先见预测 MVP 的话题、赔率选择阶段、模拟余额和模拟持仓。',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        execute: () => {
          const current = stateRef.current;
          const activeTopic = topics[current.topicIndex];
          return {
            activeTopic: { id: activeTopic.id, title: activeTopic.title, marketProbability: activeTopic.marketProbability },
            stage: current.stage,
            selectedOutcome: current.direction,
            simulatedBalance: current.balance,
            positions: current.positions,
          };
        },
      }, { signal: lifecycle.signal });

      await modelContext.registerTool({
        name: 'complete_mock_prediction',
        description: '在先见 MVP 中完成一次模拟预测：选择话题、结果方向和模拟投入，并让界面显示赔率、预计返还和已确认持仓。',
        inputSchema: {
          type: 'object',
          properties: {
            topicId: { type: 'integer', enum: topics.map((item) => item.id), description: '预测话题 ID' },
            direction: { type: 'string', enum: ['yes', 'no'], description: 'yes 表示会发生，no 表示不会发生' },
            amount: { type: 'integer', enum: [5, 10, 25, 50], description: '投入的模拟资金' },
          },
          required: ['topicId', 'direction', 'amount'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        execute: async (input) => {
          const args = input as Record<string, unknown>;
          const nextTopicIndex = topics.findIndex((item) => item.id === args.topicId);
          const nextDirection = args.direction;
          const nextAmount = args.amount;

          if (nextTopicIndex < 0) throw new Error('未找到指定话题。');
          if (nextDirection !== 'yes' && nextDirection !== 'no') throw new Error('direction 必须为 yes 或 no。');
          if (typeof nextAmount !== 'number' || ![5, 10, 25, 50].includes(nextAmount)) throw new Error('amount 必须为 5、10、25 或 50。');

          const current = stateRef.current;
          if (nextAmount > current.balance) throw new Error('模拟余额不足。');

          const nextTopic = topics[nextTopicIndex];
          const nextProbability = (nextDirection === 'no' ? 100 - nextTopic.marketProbability : nextTopic.marketProbability) / 100;
          const nextPayout = nextAmount / nextProbability;
          const nextPosition: Position = {
            topicId: nextTopic.id,
            title: nextTopic.shortTitle,
            direction: nextDirection,
            amount: nextAmount,
            price: nextProbability,
            payout: nextPayout,
          };
          const nextPositions = [nextPosition, ...current.positions.filter((item) => item.topicId !== nextTopic.id)];
          const nextBalance = current.balance - nextAmount;

          setTopicIndex(nextTopicIndex);
          setDirection(nextDirection);
          setAmount(nextAmount);
          setPositions(nextPositions);
          setBalance(nextBalance);
          setReviewOpen(false);
          setStage('confirmed');
          stateRef.current = {
            topicIndex: nextTopicIndex,
            stage: 'confirmed',
            direction: nextDirection,
            amount: nextAmount,
            balance: nextBalance,
            positions: nextPositions,
          };

          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return {
            status: 'confirmed',
            topicId: nextTopic.id,
            direction: nextDirection,
            amount: nextAmount,
            decimalOdds: Number((1 / nextProbability).toFixed(2)),
            simulatedBalance: nextBalance,
            potentialPayout: Number(nextPayout.toFixed(2)),
          };
        },
      }, { signal: lifecycle.signal });
    };

    void registerTools().catch((error) => console.warn('WebMCP tools were not registered:', error));
    return () => lifecycle.abort();
  }, []);

  function chooseDirection(next: Direction) {
    setDirection(next);
  }

  function switchTopic(nextIndex: number) {
    setTopicIndex(nextIndex); setStage('blind'); setDirection(null); setAmount(10);
  }

  function openTopic(nextIndex: number) {
    switchTopic(nextIndex);
    setView('conversation');
  }

  function toggleCircle(name: string) {
    setJoinedCircles((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  function confirmPosition() {
    if (!direction || amount > balance) return;
    setPositions((current) => [{ topicId: topic.id, title: topic.shortTitle, direction, amount, price, payout }, ...current.filter((p) => p.topicId !== topic.id)]);
    setBalance((current) => current - amount); setReviewOpen(false); setStage('confirmed');
  }

  const centerTitle = view === 'conversation' ? '先见 AI' : view === 'discover' ? '发现市场' : view === 'circles' ? '预测圈子' : '我的持仓';
  const centerDescription = view === 'conversation' ? '为你筛选值得判断的未来事件' : view === 'discover' ? '比较概率、赔率与朋友热度' : view === 'circles' ? '和熟悉的人一起追踪变化' : '查看投入、赔率和可能收益';
  const CenterIcon = view === 'conversation' ? Bot : view === 'discover' ? Compass : view === 'circles' ? UsersRound : WalletCards;
  const totalStake = positions.reduce((sum, item) => sum + item.amount, 0);
  const totalPotentialPayout = positions.reduce((sum, item) => sum + item.payout, 0);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111e] text-[#edf5f2]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_63%_-10%,rgba(37,209,183,.13),transparent_32%),radial-gradient(circle_at_8%_82%,rgba(74,98,255,.1),transparent_28%)]" />

      <header className="relative z-20 flex h-[74px] items-center justify-between border-b border-white/[.07] bg-[#081320]/90 px-4 backdrop-blur-xl md:px-7">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div><div className="flex items-baseline gap-2"><span className="text-[1.08rem] font-semibold text-white">先见</span><span className="text-xs font-medium uppercase tracking-[.16em] text-[#7690a5]">Horizon</span></div><p className="mt-0.5 hidden text-xs text-[#688096] sm:block">把判断留给时间验证</p></div>
        </div>
        <div className="hidden w-[min(38vw,470px)] items-center gap-3 rounded-full border border-white/[.07] bg-white/[.035] px-4 py-2.5 text-sm text-[#6f879b] lg:flex"><Search className="size-4" /><span>搜索话题、圈子或预测者</span><kbd className="ml-auto rounded-md border border-white/[.08] bg-white/[.04] px-2 py-0.5 text-[.68rem]">⌘ K</kbd></div>
        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-full border border-[#25d1b7]/20 bg-[#25d1b7]/[.07] px-3.5 py-2 sm:flex"><CircleDollarSign className="size-4 text-[#25d1b7]" /><span className="text-xs text-[#7891a4]">模拟资金</span><span className="text-sm font-semibold tabular-nums text-white">${balance.toFixed(2)}</span></div>
          <button className="grid size-10 place-items-center rounded-full border border-white/[.07] bg-white/[.035] text-[#91a4b5] transition hover:bg-white/[.07] hover:text-white" aria-label="通知"><Bell className="size-[18px]" /></button>
          <button className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#6d7cff] to-[#293a7f] text-sm font-semibold text-white ring-2 ring-white/[.08]" aria-label="个人主页">J</button>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-74px)] max-w-[1540px] grid-cols-1 xl:grid-cols-[228px_minmax(0,760px)_330px] xl:gap-7 xl:px-7">
        <aside className="hidden border-r border-white/[.065] py-7 pr-5 xl:block">
          <nav aria-label="主导航" className="space-y-1.5">
            {navItems.map((item) => { const active = view === item.id; return <button key={item.id} onClick={() => setView(item.id)} aria-current={active ? 'page' : undefined} className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition ${active ? 'bg-white/[.075] text-white' : 'text-[#71879a] hover:bg-white/[.04] hover:text-white'}`}><item.icon className={`size-[18px] ${active ? 'text-[#25d1b7]' : 'text-[#60788d]'}`} /><span>{item.label}</span>{item.badge && <span className="ml-auto rounded-full bg-[#ff7058]/15 px-2 py-0.5 text-[.65rem] font-semibold text-[#ff8b76]">{item.badge}</span>}</button>; })}
          </nav>
          <div className="mt-9"><div className="mb-3 flex items-center justify-between px-3"><p className="text-[.68rem] font-semibold uppercase tracking-[.16em] text-[#52697c]">你的圈子</p><MoreHorizontal className="size-4 text-[#52697c]" /></div><div className="space-y-1">
            {circles.map((circle, index) => <button key={circle.name} onClick={() => setView('circles')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[#73899b] transition hover:bg-white/[.035] hover:text-white"><span className={`grid size-7 place-items-center rounded-lg text-[.68rem] font-semibold ${index === 0 ? 'bg-[#4c5fff]/15 text-[#7d8aff]' : index === 1 ? 'bg-[#25d1b7]/12 text-[#50dbc7]' : 'bg-[#ff7058]/12 text-[#ff8f7b]'}`}>{circle.symbol}</span>{circle.name}{joinedCircles.includes(circle.name) && <span className="ml-auto size-1.5 rounded-full bg-[#25d1b7]" />}</button>)}
          </div></div>
          <div className="mt-8 rounded-[18px] border border-[#25d1b7]/15 bg-gradient-to-br from-[#25d1b7]/[.08] to-transparent p-4"><div className="flex items-center gap-2 text-[#50dbc7]"><ShieldCheck className="size-4" /><span className="text-xs font-semibold">模拟预测</span></div><p className="mt-2 text-xs leading-5 text-[#688195]">赔率和预计返还实时展示，本版本不涉及真实资金。</p></div>
        </aside>

        <section className="flex min-w-0 flex-col border-x border-white/[.045] bg-[#091522]/60 xl:border-0 xl:bg-transparent" aria-label={centerTitle}>
          <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="relative grid size-10 place-items-center rounded-[14px] bg-[#102638] text-[#25d1b7]"><CenterIcon className="size-[21px]" />{view === 'conversation' && <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#091522] bg-[#25d1b7]" />}</div><div><div className="flex items-center gap-2"><h1 className="text-sm font-semibold text-white">{centerTitle}</h1>{view === 'conversation' && <span className="rounded-full bg-[#25d1b7]/10 px-2 py-0.5 text-xs font-semibold text-[#48d8c2]">在线</span>}</div><p className="mt-0.5 text-xs text-[#6c8295]">{centerDescription}</p></div></div><button aria-label="页面设置" className="text-[#60788c]"><MoreHorizontal className="size-5" /></button></div>

          <div className="h-[calc(100vh-210px)] min-h-[620px] overflow-y-auto px-4 pb-36 pt-6 sm:px-6 xl:h-[calc(100vh-147px)] xl:pb-24">
            {view === 'conversation' && <div className="mx-auto max-w-[690px] space-y-5">
              <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-[.14em] text-[#4f6679] before:h-px before:flex-1 before:bg-white/[.055] after:h-px after:flex-1 after:bg-white/[.055]">今天</div>
              <div className="flex items-end gap-3 animate-[rise_.45s_ease-out_both]"><div className="mb-1 grid size-8 shrink-0 place-items-center rounded-[11px] bg-[#102638] text-[#25d1b7]"><Sparkles className="size-4" /></div><div className="max-w-[590px] rounded-[20px] rounded-bl-[6px] border border-white/[.07] bg-[#101d2d] px-4 py-3.5 shadow-[0_20px_48px_rgba(0,0,0,.16)]"><p className="text-base leading-6 text-[#d8e4e1]">今晚有个你会关心的话题。</p><p className="mt-1 text-sm leading-5 text-[#71879a]">{topic.context}</p></div></div>

              <article className="overflow-hidden rounded-[24px] border border-white/[.075] bg-[#0d1a2a] shadow-[0_28px_70px_rgba(0,0,0,.2)] sm:ml-11 animate-[rise_.5s_.06s_ease-out_both]">
                <div className="border-b border-white/[.06] bg-gradient-to-br from-[#122238] to-[#0c1827] p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full border border-[#5a6fff]/25 bg-[#5a6fff]/10 px-2.5 py-1 font-medium text-[#8e9aff]">{topic.category}</span><span className="flex items-center gap-1.5 text-[#667f93]"><Clock3 className="size-3.5" />{topic.deadline}</span><span className="ml-auto flex items-center gap-1.5 text-[#71889b]"><UsersRound className="size-3.5" />{topic.friends} 位朋友关注</span></div><h2 className="mt-4 max-w-[600px] text-[1.28rem] font-semibold leading-[1.45] tracking-[-.018em] text-white sm:text-[1.52rem]">{topic.title}</h2><div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#688094]"><span>市场概率 <strong className="text-white">{topic.marketProbability}%</strong></span><span>·</span><span>选择结果即可查看返还</span></div></div>

                {stage === 'blind' && <div className="p-5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['yes', 'no'] as const).map((side) => { const sideProbability = side === 'yes' ? topic.marketProbability : 100 - topic.marketProbability; const sideOdds = 100 / sideProbability; return <button key={side} onClick={() => chooseDirection(side)} aria-pressed={direction === side} className={`rounded-2xl border p-4 text-left transition ${direction === side ? side === 'yes' ? 'border-[#25d1b7]/70 bg-[#25d1b7]/[.1]' : 'border-[#ff7058]/70 bg-[#ff7058]/[.09]' : 'border-white/[.08] bg-white/[.025] hover:border-white/[.16]'}`}><div className="flex items-center justify-between"><span className={`text-lg font-semibold ${direction === side ? side === 'yes' ? 'text-[#5be0cd]' : 'text-[#ff917d]' : 'text-[#dce8e5]'}`}>{side === 'yes' ? '会' : '不会'}</span><span className={`grid size-6 place-items-center rounded-full border ${direction === side ? side === 'yes' ? 'border-[#25d1b7] bg-[#25d1b7] text-[#07111e]' : 'border-[#ff7058] bg-[#ff7058] text-[#07111e]' : 'border-white/[.12] text-transparent'}`}><Check className="size-3.5" /></span></div><div className="mt-3 flex items-end justify-between"><div><p className="text-xs text-[#647c90]">十进制赔率</p><p className="mt-1 text-2xl font-semibold tabular-nums text-white">×{sideOdds.toFixed(2)}</p></div><p className="text-right text-xs leading-5 text-[#6f879b]">投 $10<br /><span className="text-[#b8c8c5]">返还 ${(10 * sideOdds).toFixed(2)}</span></p></div></button>; })}
                  </div>
                  <Button onClick={() => direction && setStage('reveal')} disabled={!direction} className="mt-5 h-12 w-full rounded-xl bg-[#25d1b7] text-[.92rem] font-semibold text-[#06141c] hover:bg-[#4bdcc8] disabled:bg-white/[.06] disabled:text-[#506679]">继续选择投入 <ArrowRight className="ml-1 size-4" /></Button><p className="mt-3 text-center text-xs text-[#50677a]">赔率随市场概率变化，本版本仅使用模拟资金</p>
                </div>}

                {(stage === 'reveal' || stage === 'confirmed') && <div className="p-5 sm:p-6 animate-[rise_.35s_ease-out_both]">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center"><ProbabilityRing value={topic.marketProbability} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-white">你选择「{direction === 'yes' ? '会' : '不会'}」</span><span className={`rounded-full px-2 py-1 text-xs font-semibold ${topic.delta >= 0 ? 'bg-[#25d1b7]/10 text-[#4bdcc8]' : 'bg-[#ff7058]/10 text-[#ff8e79]'}`}>{topic.delta >= 0 ? '↑' : '↓'} {Math.abs(topic.delta)}% · 24h</span></div><p className="mt-1.5 text-sm leading-5 text-[#71889c]">当前赔率 <strong className="text-white">×{odds.toFixed(2)}</strong>，投入 ${amount}，判断正确返还 <strong className="text-[#4bdcc8]">${payout.toFixed(2)}</strong>。</p><div className="mt-3 flex items-center gap-4 text-xs text-[#60798d]"><span className="flex items-center gap-1.5"><UsersRound className="size-3.5" />{topic.joined} 位朋友已参与</span><span className="flex items-center gap-1.5"><Zap className="size-3.5 text-[#f2c968]" />流动性良好</span></div></div></div>
                  <div className="mt-5 rounded-2xl border border-white/[.06] bg-[#091522] p-4"><div className="flex items-center gap-2 text-sm font-medium text-[#d9e5e2]"><Sparkles className="size-4 text-[#25d1b7]" />影响概率的最新信息</div><ul className="mt-3 space-y-2.5">{topic.evidence.map((item, index) => <li key={item} className="flex gap-3 text-sm leading-5 text-[#71889b]"><span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${index === 2 ? 'bg-[#f2c968]' : 'bg-[#25d1b7]'}`} />{item}</li>)}</ul><button className="mt-3 flex items-center gap-1 text-sm font-medium text-[#6f85ff] hover:text-[#9aa6ff]">查看证据时间线 <ChevronRight className="size-3.5" /></button></div>
                  {stage === 'reveal' ? <><div className="mt-5 flex items-center justify-between"><span className="text-sm font-medium text-[#d9e4e2]">投入模拟资金</span><span className="text-xs text-[#60788d]">最大亏损 = 投入金额</span></div><div className="mt-3 grid grid-cols-4 gap-2">{[5, 10, 25, 50].map((value) => <button key={value} onClick={() => setAmount(value)} className={`rounded-xl border py-2.5 text-sm font-semibold tabular-nums transition ${amount === value ? 'border-[#25d1b7]/60 bg-[#25d1b7]/10 text-[#52ddc9]' : 'border-white/[.07] bg-white/[.025] text-[#71889b] hover:border-white/[.14] hover:text-white'}`}>${value}</button>)}</div><div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/[.03] p-3 text-center"><div><p className="text-xs text-[#60788d]">赔率</p><p className="mt-1 font-semibold text-white">×{odds.toFixed(2)}</p></div><div><p className="text-xs text-[#60788d]">赢了返还</p><p className="mt-1 font-semibold text-white">${payout.toFixed(2)}</p></div><div><p className="text-xs text-[#60788d]">净赢</p><p className="mt-1 font-semibold text-[#25d1b7]">+${profit.toFixed(2)}</p></div></div><Button onClick={() => setReviewOpen(true)} className="mt-4 h-12 w-full rounded-xl bg-[#25d1b7] text-[.92rem] font-semibold text-[#06141c] hover:bg-[#4bdcc8]">检查并确认</Button></> : <div className="mt-5 rounded-2xl border border-[#25d1b7]/25 bg-[#25d1b7]/[.075] p-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#25d1b7] text-[#07111e]"><Check className="size-5" /></span><div><p className="text-sm font-semibold text-white">模拟持仓已建立</p><p className="mt-1 text-sm leading-5 text-[#759185]">赔率 ×{odds.toFixed(2)} · 投入 ${amount} · 赢了返还 ${payout.toFixed(2)} · 净赢 ${profit.toFixed(2)}</p></div></div><div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => setView('positions')} variant="ghost" className="h-10 rounded-xl bg-white/[.035] text-[#cbd9d6] hover:bg-white/[.065] hover:text-white">查看持仓</Button><Button onClick={() => switchTopic((topicIndex + 1) % topics.length)} variant="ghost" className="h-10 justify-between rounded-xl bg-white/[.035] px-3 text-[#cbd9d6] hover:bg-white/[.065] hover:text-white">下个话题 <ArrowRight className="size-4" /></Button></div></div>}
                </div>}
              </article>

              <div className="ml-11 flex items-center gap-2 text-xs text-[#536a7d]"><span className="size-1.5 animate-pulse rounded-full bg-[#25d1b7]" />先见 AI 会在赔率变化时提醒你</div>
              <div className="pt-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-[.13em] text-[#526a7d]">接下来</h3><button onClick={() => setView('discover')} className="text-xs text-[#5c7488] hover:text-white">查看全部</button></div><div className="grid gap-2 sm:grid-cols-2">{topics.filter((_, i) => i !== topicIndex).map((item) => { const nextIndex = topics.findIndex((candidate) => candidate.id === item.id); return <button key={item.id} onClick={() => openTopic(nextIndex)} className="group rounded-2xl border border-white/[.065] bg-white/[.025] p-4 text-left transition hover:border-white/[.13] hover:bg-white/[.045]"><div className="flex items-center justify-between"><span className="text-xs text-[#687f93]">{item.category}</span><span className="text-sm font-semibold text-[#d8e4e1]">会 ×{(100 / item.marketProbability).toFixed(2)}</span></div><p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-[#b8c8c5] group-hover:text-white">{item.title}</p><div className="mt-3 flex items-center gap-1.5 text-xs text-[#576f83]"><UsersRound className="size-3" />{item.friends} 位朋友关注</div></button>; })}</div></div>
            </div>}

            {view === 'discover' && <div className="mx-auto max-w-[720px] space-y-4"><div className="flex items-end justify-between"><div><h2 className="text-2xl font-semibold text-white">热门预测</h2><p className="mt-1 text-sm text-[#6f879b]">所有话题都直接展示双向赔率。</p></div><span className="rounded-full bg-[#25d1b7]/10 px-3 py-1 text-xs text-[#49d9c3]">实时市场</span></div>{topics.map((item, index) => { const yesOdds = 100 / item.marketProbability; const noOdds = 100 / (100 - item.marketProbability); return <article key={item.id} className="rounded-[22px] border border-white/[.07] bg-[#0d1a2a] p-5"><div className="flex flex-wrap items-center gap-2 text-xs text-[#667f93]"><span className="rounded-full bg-[#5267ff]/10 px-2.5 py-1 text-[#8995ff]">{item.category}</span><Clock3 className="ml-1 size-3.5" />{item.deadline}<span className="ml-auto flex items-center gap-1.5"><UsersRound className="size-3.5" />{item.friends} 位朋友关注</span></div><h3 className="mt-3 text-lg font-semibold leading-7 text-white">{item.title}</h3><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#25d1b7]/20 bg-[#25d1b7]/[.06] p-3"><p className="text-xs text-[#6f8f88]">会 · {item.marketProbability}%</p><p className="mt-1 text-xl font-semibold text-[#54ddc9]">×{yesOdds.toFixed(2)}</p><p className="mt-1 text-xs text-[#617f78]">投 $10 返 ${(10 * yesOdds).toFixed(2)}</p></div><div className="rounded-xl border border-[#ff7058]/20 bg-[#ff7058]/[.055] p-3"><p className="text-xs text-[#99736d]">不会 · {100 - item.marketProbability}%</p><p className="mt-1 text-xl font-semibold text-[#ff8d78]">×{noOdds.toFixed(2)}</p><p className="mt-1 text-xs text-[#82645f]">投 $10 返 ${(10 * noOdds).toFixed(2)}</p></div></div><Button onClick={() => openTopic(index)} className="mt-4 h-11 w-full rounded-xl bg-white/[.055] text-white hover:bg-white/[.1]">参与预测 <ArrowRight className="ml-1 size-4" /></Button></article>; })}</div>}

            {view === 'circles' && <div className="mx-auto max-w-[720px] space-y-5"><div><h2 className="text-2xl font-semibold text-white">你的预测圈</h2><p className="mt-1 text-sm text-[#6f879b]">加入后会看到成员关注的话题和参与动态。</p></div><div className="grid gap-3">{circles.map((circle, index) => { const joined = joinedCircles.includes(circle.name); return <article key={circle.name} className="rounded-[22px] border border-white/[.07] bg-[#0d1a2a] p-5"><div className="flex items-start gap-4"><span className={`grid size-12 shrink-0 place-items-center rounded-2xl font-semibold ${circle.tint === 'indigo' ? 'bg-[#4c5fff]/15 text-[#8390ff]' : circle.tint === 'mint' ? 'bg-[#25d1b7]/12 text-[#50dbc7]' : 'bg-[#ff7058]/12 text-[#ff8f7b]'}`}>{circle.symbol}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold text-white">{circle.name}</h3>{joined && <span className="rounded-full bg-[#25d1b7]/10 px-2 py-0.5 text-xs text-[#4bdcc8]">已加入</span>}</div><p className="mt-1 text-sm text-[#687f93]">{circle.members} 位成员 · {circle.active} 人今天活跃</p><p className="mt-3 text-sm text-[#aebfbc]">正在讨论：{circle.topic}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={() => toggleCircle(circle.name)} variant="outline" className="h-10 rounded-xl border-white/[.09] bg-transparent text-[#b7c7c4] hover:bg-white/[.05] hover:text-white">{joined ? <><Check className="mr-1 size-4" />已加入</> : <><UserPlus className="mr-1 size-4" />加入圈子</>}</Button><Button onClick={() => openTopic(index)} className="h-10 rounded-xl bg-[#25d1b7] text-[#07111e] hover:bg-[#4bdcc8]">查看话题</Button></div></article>; })}</div><div className="rounded-[22px] border border-white/[.07] bg-[#0b1725] p-5"><div className="flex items-center gap-2"><MessageCircle className="size-4 text-[#25d1b7]" /><h3 className="font-semibold text-white">朋友动态</h3></div><div className="mt-4 space-y-4">{['小岚参与了「OpenAI 新旗舰模型」', 'Leo 正在关注美联储降息赔率', '阿哲邀请你加入「英超夜聊」'].map((item, index) => <div key={item} className="flex items-center gap-3 text-sm text-[#8da19d]"><span className={`grid size-8 shrink-0 place-items-center rounded-full ${index === 0 ? 'bg-[#5267ff]/15 text-[#8c97ff]' : index === 1 ? 'bg-[#25d1b7]/12 text-[#52dac6]' : 'bg-[#ff7058]/12 text-[#ff8d78]'}`}>{['岚', 'L', '哲'][index]}</span><span>{item}</span><span className="ml-auto text-xs text-[#51697c]">{index + 2}h</span></div>)}</div></div></div>}

            {view === 'positions' && <div className="mx-auto max-w-[720px] space-y-5"><div><h2 className="text-2xl font-semibold text-white">模拟持仓</h2><p className="mt-1 text-sm text-[#6f879b]">赔率锁定为参与时价格，事件结算后更新结果。</p></div><div className="grid grid-cols-3 gap-3"><div className="rounded-[18px] border border-white/[.07] bg-[#0d1a2a] p-4"><p className="text-xs text-[#647b8f]">可用余额</p><p className="mt-2 text-xl font-semibold text-white">${balance.toFixed(2)}</p></div><div className="rounded-[18px] border border-white/[.07] bg-[#0d1a2a] p-4"><p className="text-xs text-[#647b8f]">已投入</p><p className="mt-2 text-xl font-semibold text-white">${totalStake.toFixed(2)}</p></div><div className="rounded-[18px] border border-white/[.07] bg-[#0d1a2a] p-4"><p className="text-xs text-[#647b8f]">全部命中返还</p><p className="mt-2 text-xl font-semibold text-[#4bdcc8]">${totalPotentialPayout.toFixed(2)}</p></div></div>{positions.length === 0 ? <div className="rounded-[22px] border border-dashed border-white/[.1] bg-[#0b1725] px-6 py-12 text-center"><WalletCards className="mx-auto size-8 text-[#425b70]" /><h3 className="mt-4 font-semibold text-white">还没有模拟持仓</h3><p className="mt-2 text-sm text-[#637b8f]">选择一个预测话题，查看赔率后即可参与。</p><Button onClick={() => setView('discover')} className="mt-5 rounded-xl bg-[#25d1b7] text-[#07111e] hover:bg-[#4bdcc8]">去发现市场</Button></div> : <div className="space-y-3">{positions.map((position) => { const netWin = position.payout - position.amount; const index = topics.findIndex((item) => item.id === position.topicId); return <article key={position.topicId} className="rounded-[22px] border border-white/[.07] bg-[#0d1a2a] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-[#667f93]">{position.direction === 'yes' ? '会' : '不会'} · 进行中</p><h3 className="mt-1 font-semibold text-white">{position.title}</h3></div><span className="rounded-full bg-[#25d1b7]/10 px-3 py-1 text-xs text-[#4bdcc8]">等待结算</span></div><div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-white/[.03] p-3 text-center"><div><p className="text-xs text-[#60788d]">投入</p><p className="mt-1 font-semibold text-white">${position.amount}</p></div><div><p className="text-xs text-[#60788d]">赔率</p><p className="mt-1 font-semibold text-white">×{(1 / position.price).toFixed(2)}</p></div><div><p className="text-xs text-[#60788d]">赢了返还</p><p className="mt-1 font-semibold text-white">${position.payout.toFixed(2)}</p></div><div><p className="text-xs text-[#60788d]">净赢</p><p className="mt-1 font-semibold text-[#25d1b7]">+${netWin.toFixed(2)}</p></div></div><Button onClick={() => openTopic(index)} variant="ghost" className="mt-3 h-10 w-full justify-between rounded-xl bg-white/[.035] px-3 text-[#cbd9d6] hover:bg-white/[.065] hover:text-white">查看市场 <ArrowRight className="size-4" /></Button></article>; })}</div>}</div>}
          </div>
        </section>

        <aside className="hidden py-7 xl:block">
          <div className="flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.14em] text-[#60778a]">你的预测状态</h2><MoreHorizontal className="size-4 text-[#526a7d]" /></div>
          <div className="mt-4 rounded-[22px] border border-white/[.07] bg-[#0c1928] p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-[#6d8498]">预测技能分</p><div className="mt-1 flex items-baseline gap-2"><span className="text-3xl font-semibold text-white">{skillScore}</span><span className="text-xs font-medium text-[#25d1b7]">+2 本周</span></div></div><div className="grid size-12 place-items-center rounded-2xl bg-[#4f63ff]/10 text-[#7786ff]"><Target className="size-6" /></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.055]"><div className="h-full rounded-full bg-gradient-to-r from-[#5267ff] to-[#25d1b7]" style={{ width: `${skillScore}%` }} /></div><div className="mt-3 flex justify-between text-[.68rem] text-[#566e82]"><span>稳定预测者</span><span>距离进阶还差 {100 - skillScore}</span></div></div>
          <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-[18px] border border-white/[.065] bg-[#0c1928] p-4"><Flame className="size-4 text-[#ff8069]" /><p className="mt-3 text-xl font-semibold text-white">6 天</p><p className="mt-1 text-[.7rem] text-[#61798d]">连续预测</p></div><div className="rounded-[18px] border border-white/[.065] bg-[#0c1928] p-4"><BarChart3 className="size-4 text-[#25d1b7]" /><p className="mt-3 text-xl font-semibold text-white">68%</p><p className="mt-1 text-[.7rem] text-[#61798d]">近 30 天校准</p></div></div>
          <div className="mt-7 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.14em] text-[#60778a]">市场脉搏</h2><span className="flex items-center gap-1 text-[.68rem] text-[#4fd9c4]"><span className="size-1.5 rounded-full bg-[#25d1b7]" />实时</span></div>
          <div className="mt-3 space-y-2.5">{topics.map((item, index) => <button key={item.id} onClick={() => openTopic(index)} className={`w-full rounded-[18px] border p-4 text-left transition ${topicIndex === index && view === 'conversation' ? 'border-[#25d1b7]/20 bg-[#25d1b7]/[.045]' : 'border-white/[.06] bg-[#0b1725] hover:border-white/[.12]'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="text-[.66rem] text-[#5e7589]">{item.category}</span><p className="mt-1 truncate text-xs font-medium text-[#adbfbc]">{item.shortTitle}</p></div><span className="text-sm font-semibold text-white">×{(100 / item.marketProbability).toFixed(2)}</span></div><div className="mt-2 flex items-end gap-3"><MiniSparkline positive={item.delta >= 0} /><span className={`mb-1 text-[.68rem] font-semibold ${item.delta >= 0 ? 'text-[#42d7c1]' : 'text-[#ff816b]'}`}>{item.delta >= 0 ? '+' : ''}{item.delta}</span></div></button>)}</div>
          <div className="mt-7 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.14em] text-[#60778a]">模拟持仓</h2><span className="text-[.68rem] text-[#536b7f]">{positions.length} 个</span></div>
          <div className="mt-3 rounded-[18px] border border-white/[.06] bg-[#0b1725] p-4">{positions.length === 0 ? <div className="py-3 text-center"><WalletCards className="mx-auto size-5 text-[#425b70]" /><p className="mt-2 text-xs text-[#5f778b]">完成一次判断后建立模拟持仓</p></div> : <div className="space-y-4">{positions.slice(0, 3).map((position) => <div key={position.topicId} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-medium text-[#b8c8c5]">{position.title}</p><p className="mt-1 text-[.68rem] text-[#5d7589]">{position.direction === 'yes' ? '会' : '不会'} · 投入 ${position.amount}</p></div><span className="rounded-lg bg-[#25d1b7]/10 px-2 py-1 text-xs font-semibold text-[#4edac5]">${position.payout.toFixed(2)}</span></div>)}</div>}</div>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/[.08] bg-[#08131f]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl xl:hidden" aria-label="移动端导航">{navItems.map((item) => { const active = view === item.id; return <button key={item.id} onClick={() => setView(item.id)} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-xs ${active ? 'text-[#46d8c2]' : 'text-[#5d7488]'}`}><item.icon className="size-[19px]" />{item.label}</button>; })}</nav>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-[430px] rounded-[24px] border border-white/[.09] bg-[#0d1a2a] p-0 text-[#edf5f2] ring-0 shadow-[0_34px_100px_rgba(0,0,0,.55)] [&_[data-slot=dialog-close]]:text-[#6d8295] [&_[data-slot=dialog-close]]:hover:bg-white/[.05] [&_[data-slot=dialog-close]]:hover:text-white">
          <DialogHeader className="border-b border-white/[.07] p-5 pr-12"><DialogTitle className="text-lg font-semibold text-white">确认模拟参与</DialogTitle><DialogDescription className="text-xs leading-5 text-[#6d8498]">本 MVP 不进行真实资金交易。确认后会建立一笔模拟持仓。</DialogDescription></DialogHeader>
          <div className="space-y-4 px-5 py-1"><div className="rounded-2xl bg-white/[.035] p-4"><p className="text-xs text-[#657d91]">你的选择</p><p className="mt-2 text-sm font-semibold leading-6 text-white">{topic.shortTitle} · {direction === 'yes' ? '会' : '不会'}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/[.06] p-4"><p className="text-xs text-[#637b8f]">投入 · 赔率 ×{odds.toFixed(2)}</p><p className="mt-1 text-xl font-semibold text-white">${amount.toFixed(2)}</p></div><div className="rounded-2xl border border-white/[.06] p-4"><p className="text-xs text-[#637b8f]">赢了返还 · 净赢 ${profit.toFixed(2)}</p><p className="mt-1 text-xl font-semibold text-[#4edac5]">${payout.toFixed(2)}</p></div></div><div className="flex items-start gap-2.5 rounded-xl border border-[#ff7058]/15 bg-[#ff7058]/[.055] p-3 text-xs leading-5 text-[#b8948e]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#ff816b]" />最大亏损为 ${amount.toFixed(2)} 模拟资金；结果按预设规则结算。</div></div>
          <DialogFooter className="mx-0 mb-0 rounded-b-[24px] border-white/[.07] bg-white/[.025] p-4 sm:justify-stretch"><Button onClick={() => setReviewOpen(false)} variant="outline" className="h-11 flex-1 rounded-xl border-white/[.09] bg-transparent text-[#9badaa] hover:bg-white/[.05] hover:text-white">返回修改</Button><Button onClick={confirmPosition} className="h-11 flex-1 rounded-xl bg-[#25d1b7] font-semibold text-[#06141c] hover:bg-[#4bdcc8]">确认参与</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
