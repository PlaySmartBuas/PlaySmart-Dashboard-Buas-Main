import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Occurrence {
  match_id: string;
  timestamp: number;
  feedback_text: string;
}

interface ErrorPattern {
  error_code: string;
  category: string;
  total_occurrences: number;
  matches_affected: number;
  is_recurring: boolean;
  trend: 'improving' | 'worsening' | 'stable';
  occurrences: Occurrence[];
}

interface PatternsResponse {
  patterns: ErrorPattern[];
  total_annotations: number;
  unique_errors: number;
  recurring_count: number;
  matches_analysed: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { border: string; dot: string; badge: string; text: string }> = {
  positioning:      { border: '#3b82f6', dot: '#3b82f6', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',    text: 'text-blue-400'   },
  mechanical:       { border: '#f59e0b', dot: '#f59e0b', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30', text: 'text-amber-400'  },
  communication:    { border: '#8b5cf6', dot: '#8b5cf6', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', text: 'text-purple-400' },
  mental:           { border: '#ef4444', dot: '#ef4444', badge: 'bg-red-500/20 text-red-400 border-red-500/30',        text: 'text-red-400'    },
  decision_making:  { border: '#10b981', dot: '#10b981', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', text: 'text-emerald-400' },
};

const DEFAULT_COLOR = { border: '#6b7280', dot: '#6b7280', badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30', text: 'text-gray-400' };

const CATEGORIES = ['positioning', 'mechanical', 'communication', 'mental', 'decision_making'];

const formatCategoryName = (cat: string) =>
  cat ? cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const formatMatchLabel = (matchId: string) => {
  if (!matchId) return 'Unknown';
  const parts = matchId.split('_');
  if (parts.length >= 2) {
    const dateStr = parts[parts.length - 2];
    if (dateStr?.includes('-')) {
      const [d, mo, y] = dateStr.split('-');
      return `${d}/${mo}/${y}`;
    }
  }
  return matchId.substring(0, 12) + '...';
};


const CoachValorantErrorPatterns: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const riotId    = searchParams.get('user') || sessionStorage.getItem('current_valorant_riot_id') || '';
  const dataSource = (searchParams.get('source') || 'local') as 'local' | 'hive';

  const [data,             setData]             = useState<PatternsResponse | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedPattern,  setExpandedPattern]  = useState<string | null>(null);


  useEffect(() => {
    if (!riotId) {
      setError('No player Riot ID found. Please go back and select a player.');
      setLoading(false);
      return;
    }
    fetchPatterns();
  }, [riotId]);

  const fetchPatterns = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/feedback/${encodeURIComponent(riotId)}/valorant/patterns`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load error patterns.');
    } finally {
      setLoading(false);
    }
  };


  const handleGoToMatch = (matchId: string, timestamp: number) => {
    const params = new URLSearchParams();
    params.set('matchId',  matchId);
    params.set('match_id', matchId);
    params.set('source',   dataSource);
    params.set('t',        String(timestamp));
    params.set('from',     'patterns');
    if (riotId) params.set('user', riotId);
    navigate(`/coach/valorant-recording-analysis?${params.toString()}`);
  };


  const filteredPatterns = useMemo(() => {
    if (!data) return [];
    if (selectedCategory === 'all') return data.patterns;
    return data.patterns.filter(p => p.category === selectedCategory);
  }, [data, selectedCategory]);


  const trendDisplay = (trend: ErrorPattern['trend']) => {
    if (trend === 'improving')  return { label: '↓ Improving',       className: 'text-emerald-400' };
    if (trend === 'worsening')  return { label: '↑ Getting worse',   className: 'text-red-400'     };
    return                             { label: '— Stable',           className: 'text-gray-400'    };
  };


  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (riotId) params.set('user', riotId);
            navigate(`/coach/valorant-recordinganalysis${params.toString() ? `?${params}` : ''}`);
          }}
          className="flex items-center gap-2 text-yellow-300/60 hover:text-yellow-400 mb-4 transition-colors font-bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Match List
        </button>

        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-black text-white">Error Patterns</h1>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Valorant
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-black ${
            dataSource === 'hive'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}>
            {dataSource === 'hive' ? '🖥️ Hive' : '💻 Local'}
          </span>
        </div>
        <p className="text-gray-400">
          Cross-match mistake analysis for{' '}
          <span className="text-yellow-400 font-bold">{decodeURIComponent(riotId)}</span>
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/40 rounded-xl p-4 text-red-400 font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-yellow-400 text-lg font-bold animate-pulse mb-2">Analysing patterns...</div>
            <div className="text-gray-500 text-sm">Grouping mistakes across all matches</div>
          </div>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total annotations', value: data.total_annotations, color: 'text-blue-400'    },
              { label: 'Unique error types', value: data.unique_errors,     color: 'text-amber-400'  },
              { label: 'Recurring mistakes', value: data.recurring_count,   color: 'text-red-400'    },
              { label: 'Matches analysed',   value: data.matches_analysed,  color: 'text-emerald-400'},
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-4 border border-gray-700/50">
                <div className="text-xs text-gray-500 font-semibold mb-1">{label}</div>
                <div className={`text-3xl font-black ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {data.patterns.length === 0 && (
            <div className="text-center py-16 bg-gray-900 rounded-xl border border-gray-700/50">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-400 font-semibold mb-1">No annotations found yet</p>
              <p className="text-gray-600 text-sm">Add feedback during recording analysis to see patterns here</p>
            </div>
          )}

          {data.patterns.length > 0 && (
            <>
              {/* Category filter */}
              <div className="flex gap-2 flex-wrap mb-6">
                {['all', ...CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      selectedCategory === cat
                        ? 'bg-yellow-500 text-black border-yellow-500'
                        : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {cat === 'all' ? 'All categories' : formatCategoryName(cat)}
                  </button>
                ))}
              </div>

              {/* Pattern count */}
              <div className="text-sm text-gray-500 font-semibold mb-4">
                Showing {filteredPatterns.length} of {data.patterns.length} error types
              </div>

              {/* Pattern cards */}
              <div className="space-y-4">
                {filteredPatterns.map(pattern => {
                  const colors   = CATEGORY_COLORS[pattern.category] || DEFAULT_COLOR;
                  const trend    = trendDisplay(pattern.trend);
                  const isExpanded = expandedPattern === pattern.error_code;

                  // Group occurrences by match for display
                  const byMatch: Record<string, Occurrence[]> = {};
                  for (const occ of pattern.occurrences) {
                    if (!byMatch[occ.match_id]) byMatch[occ.match_id] = [];
                    byMatch[occ.match_id].push(occ);
                  }

                  return (
                    <div
                      key={pattern.error_code}
                      className="bg-gray-900 rounded-xl border border-gray-700/50 overflow-hidden"
                      style={{ borderLeft: `3px solid ${colors.border}` }}
                    >
                      {/* Card header — always visible */}
                      <div
                        className="p-5 cursor-pointer hover:bg-gray-800/40 transition-colors"
                        onClick={() => setExpandedPattern(isExpanded ? null : pattern.error_code)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                              style={{ background: colors.dot }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-white font-black text-sm">{pattern.error_code}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.badge}`}>
                                  {formatCategoryName(pattern.category)}
                                </span>
                                {pattern.is_recurring && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                                    Recurring
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-gray-400 text-xs">
                                  {pattern.matches_affected} {pattern.matches_affected === 1 ? 'match' : 'matches'}
                                </span>
                                <span className={`text-xs font-semibold ${trend.className}`}>
                                  {trend.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-2xl font-black text-white">{pattern.total_occurrences}×</div>
                              <div className="text-[10px] text-gray-500">occurrences</div>
                            </div>
                            <svg
                              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Match pills — always visible summary */}
                        <div className="flex gap-2 flex-wrap mt-3 ml-5">
                          {Object.keys(byMatch).slice(0, 5).map(matchId => (
                            <span
                              key={matchId}
                              className="px-2 py-1 bg-gray-800 text-gray-400 text-[10px] rounded-full border border-gray-700"
                            >
                              {formatMatchLabel(matchId)} · {byMatch[matchId].length}×
                            </span>
                          ))}
                          {Object.keys(byMatch).length > 5 && (
                            <span className="px-2 py-1 bg-gray-800 text-gray-500 text-[10px] rounded-full border border-gray-700">
                              +{Object.keys(byMatch).length - 5} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded: all occurrences grouped by match */}
                      {isExpanded && (
                        <div className="border-t border-gray-700/50 p-5 space-y-4">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
                            All occurrences — click any timestamp to jump to that moment
                          </p>
                          {Object.entries(byMatch).map(([matchId, occs]) => (
                            <div key={matchId} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
                              <div className="text-xs font-black text-gray-300 mb-3 flex items-center gap-2">
                                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {formatMatchLabel(matchId)}
                                <span className="text-gray-600 font-normal">{matchId}</span>
                              </div>
                              <div className="space-y-2">
                                {occs.map((occ, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                    <button
                                      onClick={() => handleGoToMatch(matchId, occ.timestamp)}
                                      className="flex-shrink-0 px-2.5 py-1 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 text-xs font-black rounded border border-yellow-500/30 transition-colors whitespace-nowrap"
                                    >
                                      ▶ {formatTime(occ.timestamp)}
                                    </button>
                                    <p className="text-gray-400 text-xs leading-relaxed pt-0.5">
                                      {occ.feedback_text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CoachValorantErrorPatterns;