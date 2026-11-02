import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface BoardEntry {
  nickname: string;
  score: number;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Supabase 初始化失败", e);
  }
}

export class LeaderboardGateway {
  async fetchBoard(mode: 'normal' | 'care', type: 'total' | 'level', levelId?: number): Promise<BoardEntry[]> {
    if (!supabase) {
      return this.fetchLocalFallback(mode, type);
    }

    try {
      let query = supabase
        .from('scores')
        .select('nickname, score')
        .eq('mode', mode)
        .eq('board_type', type);

      if (type === 'level' && levelId !== undefined) {
        query = query.eq('level_id', levelId);
      } else {
        query = query.is('level_id', null);
      }

      const fetchPromise = query.order('score', { ascending: false }).limit(10);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('网络请求超时')), 3000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) throw error;

      // 如果云端确实没数据，只用假NPC垫底，不包含“我”
      if (!data || data.length === 0) {
        return this.fetchLocalFallback(mode, type);
      }

      return data as BoardEntry[];
    } catch (err) {
      console.warn('云端排行榜读取失败或超时，降级为本地数据', err);
      return this.fetchLocalFallback(mode, type);
    }
  }

  async submitScore(mode: 'normal' | 'care', levelId: number | undefined, score: number, nickname = '我'): Promise<void> {
    if (!supabase) return;

    try {
      let query = supabase
        .from('scores')
        .select('id, score')
        .eq('nickname', nickname)
        .eq('mode', mode);

      if (levelId !== undefined) {
        query = query.eq('board_type', 'level').eq('level_id', levelId);
      } else {
        query = query.eq('board_type', 'total').is('level_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        if (score > existing.score) {
          await supabase.from('scores').update({ score }).eq('id', existing.id);
        }
      } else {
        await supabase.from('scores').insert({
          nickname,
          mode,
          board_type: levelId !== undefined ? 'level' : 'total',
          level_id: levelId ?? null,
          score,
        });
      }
    } catch (e) {
      console.error('提交云端分数失败:', e);
    }
  }

  private fetchLocalFallback(mode: 'normal' | 'care', type: 'total' | 'level'): BoardEntry[] {
    // 降级用的假数据，去掉了“我”，让真实分数自己填进来
    const baseScore = type === 'total' ? 25000 : 3000;
    return [
      { nickname: mode === 'care' ? '王阿姨' : '星穹列车长', score: baseScore },
      { nickname: mode === 'care' ? '李大爷' : '消消乐大王', score: baseScore - 1200 },
      { nickname: mode === 'care' ? '张奶奶' : '陈先生', score: baseScore - 2500 },
    ];
  }
}

export const leaderboard = new LeaderboardGateway();