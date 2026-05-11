
// import React, { useEffect, useState } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import {
//   PieChart, Pie, Cell, BarChart, Bar,
//   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
//   ScatterChart, Scatter
// } from 'recharts';
// import { API_BASE_URL } from '../../services/api';


// interface EmotionData   { name: string; value: number; count: number; }
// interface GazePoint     { x: number; y: number; emotion: string; }
// interface ScreenZone    { zone: string; count: number; percentage: string; }
// interface InputMetrics {
//   apm: number;
//   total_key_presses: number;
//   total_mouse_clicks: number;
//   clicks_per_minute: number;
//   duration_minutes: number;
//   ability_usage: Record<string, number>;
//   top_keys: Array<{ key: string; count: number }>;
// }
// interface DataQuality {
//   has_emotion: boolean;
//   has_gaze: boolean;
//   has_input: boolean;
// }
// interface AnalyticsResult {
//   total_rows: number;
//   emotion_distribution: EmotionData[];
//   dominant_emotion: string;
//   dominant_percentage: number;
//   emotion_progress: any[];
//   gaze_points: GazePoint[];
//   screen_zones: ScreenZone[];
//   input_metrics: InputMetrics;
//   data_quality: DataQuality;
//   cached: boolean;
// }

// type DataSource = 'local' | 'hive';


// function baseStem(filename: string): string {
//   let stem = filename.replace(/\.[^/.]+$/, '');
//   for (const suffix of ['_merged', '_emotion', '_gaze', '_input']) {
//     if (stem.endsWith(suffix)) { stem = stem.slice(0, -suffix.length); break; }
//   }
//   return stem;
// }


// const PlayerValorantMatchDashboard: React.FC = () => {
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();

//   const matchId    = searchParams.get('matchId') || '';
//   const dataSource = (searchParams.get('source') || 'local') as DataSource;
//   const riotIdParam = searchParams.get('user') || '';
//   const puuidParam  = searchParams.get('puuid') || '';

//   const currentRiotId = riotIdParam || sessionStorage.getItem('current_valorant_riot_id') || '';
//   const currentPuuid  = puuidParam  || sessionStorage.getItem('current_valorant_puuid')   || '';

//   const [analytics,    setAnalytics]    = useState<AnalyticsResult | null>(null);
//   const [loading,      setLoading]      = useState(false);  
//   const [error,        setError]        = useState('');
//   const [includedEmotions, setIncludedEmotions] = useState<Record<string, boolean>>({
//     Neutral: true, Happiness: true, Anger: true, Sadness: true,
//     Surprise: true, Disgust: true, Fear: true,
//   });

//   const stem = baseStem(matchId);
//   const dataDirectory = localStorage.getItem('toolkit_data_directory') || '';

//   const EMOTION_COLORS: Record<string, string> = {
//     Neutral: '#60A5FA', Happiness: '#34D399', Anger: '#EF4444',
//     Sadness: '#A78BFA', Surprise: '#FBBF24', Disgust: '#F97316', Fear: '#9CA3AF',
//   };
//   const getColor = (name: string) => EMOTION_COLORS[name] || '#6B7280';

//   const loadAnalytics = async () => {
//     setLoading(true);
//     setError('');

//     try {
//       let url: string;

//       if (dataSource === 'hive') {
//         url = `${API_BASE_URL}/api/analytics/hive?stem=${encodeURIComponent(stem)}`;
//       } else {
//         if (!dataDirectory) {
//           setError('Data directory not configured. Please set it up in Toolkit Setup.');
//           setLoading(false);
//           return;
//         }
//         const filePath = `${dataDirectory}/merged/${stem}_merged.csv`;
//         url = `${API_BASE_URL}/api/analytics/local?file_path=${encodeURIComponent(filePath)}`;
//       }

//       const res = await fetch(url);
//       if (!res.ok) {
//         const err = await res.json().catch(() => ({}));
//         throw new Error(err.detail || `Server error: ${res.status}`);
//       }

//       const data: AnalyticsResult = await res.json();
//       setAnalytics(data);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to load analytics');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const toggleEmotion = (name: string) =>
//     setIncludedEmotions(prev => ({ ...prev, [name]: !prev[name] }));

//   const filteredEmotionData = (analytics?.emotion_distribution || [])
//     .filter(d => includedEmotions[d.name] && d.value > 0);

//   const renderInputMetrics = () => {
//     const m = analytics?.input_metrics;
//     if (!m) return null;

//     const abilityOrder = ['Q','E','C','X'];
//     const weaponOrder  = ['1','2','3','4','5'];
//     const abilityLabels: Record<string,string> = { C:'Ability 1', Q:'Ability 2', E:'Signature', X:'Ultimate' };
//     const weaponLabels:  Record<string,string> = { '1':'Primary','2':'Secondary','3':'Melee','4':'Spike','5':'Other' };

//     const abilities = abilityOrder.filter(k => m.ability_usage?.[k] > 0)
//       .map(k => ({ key: k, label: abilityLabels[k], count: m.ability_usage[k] }));
//     const weapons = weaponOrder.filter(k => m.ability_usage?.[k] > 0)
//       .map(k => ({ key: k, label: weaponLabels[k], count: m.ability_usage[k] }));
//     const totalAbilities = abilities.reduce((s,a) => s + a.count, 0);

//     return (
//       <div className="bg-gradient-to-br from-gray-950 to-black p-6 rounded-lg border border-red-500/20 shadow-lg">
//         <h4 className="text-white font-black text-lg mb-6">Input Activity Analysis</h4>

//         {/* KPI cards */}
//         <div className="grid grid-cols-4 gap-4 mb-6">
//           {[
//             { label:'APM',          value: m.apm,                 color:'text-purple-400', bar:'from-purple-500 to-purple-700', max:300 },
//             { label:'Key Presses',  value: m.total_key_presses,   color:'text-green-400',  bar:'from-green-400 to-green-600',   max:2000 },
//             { label:'Mouse Clicks', value: m.total_mouse_clicks,  color:'text-blue-400',   bar:'from-blue-400 to-blue-600',     max:3000 },
//             { label:'Clicks/Min',   value: m.clicks_per_minute,   color:'text-yellow-400', bar:'from-yellow-400 to-yellow-600', max:100 },
//           ].map(({ label, value, color, bar, max }) => (
//             <div key={label} className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-red-500/20">
//               <p className="text-red-300/60 text-xs mb-2 font-semibold">{label}</p>
//               <p className={`text-2xl font-black ${color}`}>{value.toLocaleString()}</p>
//               <div className="mt-2 w-full h-3 bg-gray-800 rounded-full">
//                 <div className={`bg-gradient-to-r ${bar} h-3 rounded-full transition-all duration-500`}
//                   style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Abilities */}
//         {abilities.length > 0 && (
//           <div className="mb-6">
//             <h5 className="text-white font-black mb-4 flex items-center gap-2 text-lg">
//               <span className="text-purple-400">⚡</span> Valorant Abilities
//             </h5>
//             <div className="space-y-4">
//               {abilities.map(a => {
//                 const pct = totalAbilities > 0 ? (a.count / totalAbilities) * 100 : 0;
//                 return (
//                   <div key={a.key}>
//                     <div className="flex justify-between items-center mb-1">
//                       <div className="flex items-center gap-2">
//                         <span className={`text-xl font-black ${a.key==='X'?'text-yellow-400':'text-purple-400'}`}>{a.key}</span>
//                         <span className="text-gray-300 text-sm font-semibold">{a.label}</span>
//                       </div>
//                       <span className="text-red-300/60 text-xs font-bold">{Math.round(pct)}%</span>
//                     </div>
//                     <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
//                       <div className={`${a.key==='X'?'bg-gradient-to-r from-yellow-400 to-yellow-600':'bg-gradient-to-r from-purple-500 to-purple-700'} h-4 rounded-full`}
//                         style={{ width: `${pct}%` }} />
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         )}

//         {/* Weapons */}
//         {weapons.length > 0 && (
//           <div className="mb-6">
//             <h5 className="text-white font-black mb-3 flex items-center gap-2">
//               <span className="text-blue-400">🔫</span> Weapons & Equipment
//             </h5>
//             <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
//               {weapons.map(w => (
//                 <div key={w.key} className="bg-gradient-to-br from-gray-900 to-black p-3 rounded-lg border border-red-500/20">
//                   <div className="flex items-center justify-between mb-1">
//                     <span className="text-2xl font-black text-blue-400">{w.key}</span>
//                     <span className="text-white font-black">{w.count}</span>
//                   </div>
//                   <p className="text-gray-400 text-xs font-semibold">{w.label}</p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Insights */}
//         <div className="space-y-2">
//           {m.apm > 150 && (
//             <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
//               <p className="text-green-400 text-sm font-bold">✅ High APM ({m.apm}) — Active and engaged playstyle</p>
//             </div>
//           )}
//           {m.apm < 100 && m.apm > 0 && (
//             <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
//               <p className="text-yellow-400 text-sm font-bold">⚠️ Low APM ({m.apm}) — May be too passive</p>
//             </div>
//           )}
//           {m.ability_usage?.X < 15 && m.ability_usage?.X >= 0 && (
//             <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
//               <p className="text-yellow-400 text-sm font-bold">⚠️ Low ultimate usage ({m.ability_usage.X} times) — Consider using ult more frequently</p>
//             </div>
//           )}
//           {(m.ability_usage?.Q > 50 || m.ability_usage?.E > 50 || m.ability_usage?.C > 30) && (
//             <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
//               <p className="text-green-400 text-sm font-bold">
//                 ✅ Good utility usage (Q: {m.ability_usage.Q}, E: {m.ability_usage.E}, C: {m.ability_usage.C})
//               </p>
//             </div>
//           )}
//           <p className="text-gray-500 text-xs text-center mt-4 font-semibold">
//             Match duration: ~{m.duration_minutes} minutes
//           </p>
//         </div>
//       </div>
//     );
//   };

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-black via-gray-900 to-red-900/10 min-h-screen">

//       {/* Header */}
//       <div className="mb-8">
//         <button
//           onClick={() => {
//             const params = new URLSearchParams();
//             if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
//             if (currentPuuid) params.set('puuid', currentPuuid);
//             navigate(`/player/valorant-recordinglist${params.toString() ? `?${params}` : ''}`);
//           }}
//           className="flex items-center gap-2 text-red-300/60 hover:text-red-400 mb-4 transition-colors font-bold"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//           </svg>
//           Back to Match List
//         </button>

//         <div className="flex items-center gap-3 mb-4">
//           <span className="text-2xl">📊</span>
//           <h2 className="text-sm font-bold text-red-300/60 uppercase tracking-wider">MATCH DASHBOARD</h2>
//           <span className={`px-3 py-1 rounded-full text-xs font-black ${
//             dataSource === 'hive'
//               ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
//               : 'bg-red-500/20 text-red-400 border border-red-500/30'
//           }`}>
//             {dataSource === 'hive' ? '🖥️ Hive Server' : '💻 Local'}
//           </span>
//           {analytics?.cached && (
//             <span className="px-3 py-1 rounded-full text-xs font-black bg-green-500/20 text-green-400 border border-green-500/30">
//               ⚡ Cached
//             </span>
//           )}
//         </div>

//         <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-400 mb-2">
//           VALORANT Analytics
//         </h1>
//         {currentRiotId && currentRiotId !== 'Unknown' && (
//           <p className="text-red-400 font-black">Playing as: {decodeURIComponent(currentRiotId)}</p>
//         )}
//         <p className="text-red-300/60 text-sm mt-1 font-semibold">Match: {stem}</p>
//       </div>

//       {/* Error */}
//       {error && (
//         <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
//           <span className="text-2xl">⚠️</span>
//           <div className="flex-1">
//             <p className="text-red-400 font-bold mb-1">{error}</p>
//             {error.includes('Data directory not configured') && (
//               <button onClick={() => navigate('/player/toolkitsetup')}
//                 className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded font-black">
//                 Go to Toolkit Setup
//               </button>
//             )}
//             {dataSource === 'hive' && (
//               <p className="text-red-300 text-sm mt-2">Make sure you are on the university network or VPN.</p>
//             )}
//           </div>
//         </div>
//       )}

//       {/* CTA — shown before loading */}
//       {!analytics && !loading && !error && (
//         <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 border-2 border-red-500/50 rounded-xl p-8 text-center mb-6">
//           <div className="text-6xl mb-4">📈</div>
//           <h3 className="text-white font-black text-2xl mb-2">Ready to Analyze Performance</h3>
//           <p className="text-red-300/80 mb-2 font-semibold">
//             All analytics are computed server-side — charts appear instantly once loaded
//           </p>
//           {dataSource === 'hive' && (
//             <p className="text-blue-400 text-sm mb-4 font-semibold">
//               📡 Reading from Hive server · First load ~3-6s · Cached visits ~instant
//             </p>
//           )}
//           {dataSource === 'local' && (
//             <p className="text-red-300/60 text-sm mb-4 font-semibold">
//               💻 Reading from local toolkit directory · Cached after first load
//             </p>
//           )}
//           <button onClick={loadAnalytics}
//             className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white rounded-lg font-black text-lg transition-all transform hover:scale-105 shadow-lg shadow-red-500/30">
//             🚀 Load Analytics Dashboard
//           </button>
//         </div>
//       )}

//       {/* Loading */}
//       {loading && (
//         <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-12 text-center mb-6">
//           <div className="animate-spin text-6xl mb-4">⚙️</div>
//           <h3 className="text-white font-black text-xl mb-2">Computing Analytics...</h3>
//           <p className="text-red-300/60 font-semibold">
//             {dataSource === 'hive'
//               ? 'Reading merged CSV from Hive and aggregating with pandas...'
//               : 'Reading local merged CSV and aggregating with pandas...'}
//           </p>
//         </div>
//       )}

//       {/* Dashboard */}
//       {analytics && (
//         <div className="space-y-6">

//           {/* Emotion Distribution */}
//           <div className="bg-gradient-to-br from-gray-950 to-black p-6 rounded-lg border border-red-500/20 shadow-lg">
//             <div className="flex items-center justify-between mb-6">
//               <div>
//                 <h4 className="text-white font-black text-lg">Emotion Distribution</h4>
//                 <p className="text-red-300/60 text-sm font-semibold">
//                   During gameplay session · {analytics.total_rows.toLocaleString()} data points
//                 </p>
//               </div>
//               <div className="text-right">
//                 <p className="text-red-300/60 text-xs font-semibold">Dominant</p>
//                 <p className="text-xl font-black" style={{ color: getColor(analytics.dominant_emotion) }}>
//                   {analytics.dominant_emotion}
//                 </p>
//                 <p className="text-gray-500 text-xs font-bold">{analytics.dominant_percentage}%</p>
//               </div>
//             </div>

//             <div className="flex flex-wrap gap-3 mb-4">
//               {Object.keys(EMOTION_COLORS).map(e => (
//                 <label key={e} className="flex items-center gap-2 cursor-pointer">
//                   <input type="checkbox" checked={includedEmotions[e]}
//                     onChange={() => toggleEmotion(e)} className="accent-red-500" />
//                   <span className="text-gray-300 text-sm font-semibold">{e}</span>
//                 </label>
//               ))}
//             </div>

//             <ResponsiveContainer width="100%" height={300}>
//               <PieChart>
//                 <Pie data={filteredEmotionData} cx="50%" cy="50%" labelLine={false}
//                   label={({ name, value }) => `${name}: ${value}%`} outerRadius={100} dataKey="value">
//                   {filteredEmotionData.map((entry, i) => <Cell key={i} fill={getColor(entry.name)} />)}
//                 </Pie>
//                 <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'0.5rem' }} />
//                 <Legend />
//               </PieChart>
//             </ResponsiveContainer>

//             <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
//               <p className="text-red-400 text-sm font-semibold">
//                 💡 Player maintains {analytics.dominant_emotion.toLowerCase()} state {analytics.dominant_percentage}% of the time —
//                 {analytics.dominant_percentage > 80 ? ' Excellent emotional control' : ' Good consistency'}
//               </p>
//             </div>
//           </div>

//           {/* Input Metrics */}
//           {renderInputMetrics()}

//           {/* Data Quality */}
//           <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>🔍</span> Data Quality Check</h3>
//             <div className="space-y-3">
//               {!analytics.data_quality.has_emotion && (
//                 <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
//                   <p className="text-red-400 text-sm font-bold">⚠️ No emotion data detected — camera or emotion detection may not have been active</p>
//                 </div>
//               )}
//               {!analytics.data_quality.has_gaze && (
//                 <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
//                   <p className="text-red-400 text-sm font-bold">⚠️ No eye tracking data detected — eye tracker may not have been connected or calibrated</p>
//                 </div>
//               )}
//               {!analytics.data_quality.has_input && (
//                 <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
//                   <p className="text-red-400 text-sm font-bold">⚠️ No input data detected — keyboard logging may not have been enabled</p>
//                 </div>
//               )}
//               {analytics.data_quality.has_emotion && analytics.data_quality.has_gaze && analytics.data_quality.has_input && (
//                 <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
//                   <p className="text-green-400 text-sm font-bold">✅ All data streams present — emotion, eye tracking, and input data all captured</p>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Emotion Flow */}
//           <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>📈</span> Emotion Flow Throughout Match</h3>
//             <p className="text-red-300/60 text-sm mb-4 font-semibold">How emotional state changed from pistol round to final rounds</p>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={analytics.emotion_progress}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
//                 <XAxis dataKey="stage" stroke="#FCA5A5" />
//                 <YAxis stroke="#FCA5A5" label={{ value:'Occurrences', angle:-90, position:'insideLeft', fill:'#FCA5A5' }} />
//                 <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(239,68,68,0.2)' }} labelStyle={{ color:'#fff', fontWeight:'bold' }} />
//                 <Legend />
//                 {Object.keys(EMOTION_COLORS).map(e => <Bar key={e} dataKey={e} stackId="a" fill={getColor(e)} />)}
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* Screen Zones */}
//           <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>🎯</span> VALORANT Focus Zones</h3>
//             <p className="text-red-300/60 text-sm mb-4 font-semibold">Distribution of visual attention across key game interface areas</p>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={analytics.screen_zones}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
//                 <XAxis dataKey="zone" stroke="#FCA5A5" />
//                 <YAxis stroke="#FCA5A5" />
//                 <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(239,68,68,0.2)' }} />
//                 <Bar dataKey="count" fill="#EF4444" />
//               </BarChart>
//             </ResponsiveContainer>
//             <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
//               {analytics.screen_zones.map(z => (
//                 <div key={z.zone} className="bg-gradient-to-br from-gray-900 to-black rounded-lg p-3 text-center border border-red-500/20">
//                   <p className="text-red-300/60 text-sm font-semibold">{z.zone}</p>
//                   <p className="text-white font-black text-lg">{z.percentage}%</p>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Gaze Path */}
//           <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>👁️</span> Gaze Path Visualization</h3>
//             <p className="text-red-300/60 text-sm mb-4 font-semibold">Eye tracking data showing where attention was focused (2560×1440)</p>
//             <ResponsiveContainer width="100%" height={400}>
//               <ScatterChart>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
//                 <XAxis type="number" dataKey="x" domain={[0,2560]} stroke="#FCA5A5" />
//                 <YAxis type="number" dataKey="y" domain={[0,1440]} stroke="#FCA5A5" reversed />
//                 <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(239,68,68,0.2)' }} />
//                 <Scatter name="Gaze Points" data={analytics.gaze_points} fill="#EF4444" fillOpacity={0.3} />
//               </ScatterChart>
//             </ResponsiveContainer>
//           </div>

//           {/* Summary */}
//           <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 border-2 border-red-500/50 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>✅</span> Analysis Complete</h3>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               {[
//                 { label:'Data Points',      value: analytics.total_rows.toLocaleString() },
//                 { label:'Emotions Tracked', value: analytics.emotion_distribution.length },
//                 { label:'Gaze Points',      value: analytics.gaze_points.length.toLocaleString() },
//                 { label:'Focus Zones',      value: analytics.screen_zones.length },
//               ].map(({ label, value }) => (
//                 <div key={label} className="bg-gradient-to-br from-gray-950 to-black rounded-lg p-4 border border-red-500/20">
//                   <p className="text-red-300/60 text-sm font-semibold">{label}</p>
//                   <p className="text-white font-black text-2xl">{value}</p>
//                 </div>
//               ))}
//             </div>
//           </div>

//         </div>
//       )}
//     </div>
//   );
// };

// export default PlayerValorantMatchDashboard;

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { API_BASE_URL } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmotionData   { name: string; value: number; count: number; }
interface GazePoint     { x: number; y: number; emotion: string; }
interface ScreenZone    { zone: string; count: number; percentage: string; }
interface InputMetrics {
  apm: number;
  total_key_presses: number;
  total_mouse_clicks: number;
  clicks_per_minute: number;
  duration_minutes: number;
  ability_usage: Record<string, number>;
  top_keys: Array<{ key: string; count: number }>;
}
interface DataQuality {
  has_emotion: boolean;
  has_gaze: boolean;
  has_input: boolean;
}
interface AnalyticsResult {
  total_rows: number;
  emotion_distribution: EmotionData[];
  dominant_emotion: string;
  dominant_percentage: number;
  emotion_progress: any[];
  gaze_points: GazePoint[];
  screen_zones: ScreenZone[];
  input_metrics: InputMetrics;
  data_quality: DataQuality;
  emotion_recorded: boolean;
  cached: boolean;
}

type DataSource = 'local' | 'hive';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseStem(filename: string): string {
  let stem = filename.replace(/\.[^/.]+$/, '');
  for (const suffix of ['_merged', '_emotion', '_gaze', '_input']) {
    if (stem.endsWith(suffix)) { stem = stem.slice(0, -suffix.length); break; }
  }
  return stem;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PlayerValorantMatchDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const matchId    = searchParams.get('matchId') || '';
  const dataSource = (searchParams.get('source') || 'local') as DataSource;
  const riotIdParam = searchParams.get('user') || '';
  const puuidParam  = searchParams.get('puuid') || '';

  const currentRiotId = riotIdParam || sessionStorage.getItem('current_valorant_riot_id') || '';
  const currentPuuid  = puuidParam  || sessionStorage.getItem('current_valorant_puuid')   || '';

  const [analytics,    setAnalytics]    = useState<AnalyticsResult | null>(null);
  const [loading,      setLoading]      = useState(false);   // only true while fetching
  const [error,        setError]        = useState('');
  const [includedEmotions, setIncludedEmotions] = useState<Record<string, boolean>>({
    Neutral: true, Happiness: true, Anger: true, Sadness: true,
    Surprise: true, Disgust: true, Fear: true,
  });

  const stem = baseStem(matchId);
  const dataDirectory = localStorage.getItem('toolkit_data_directory') || '';

  // Debug — remove once confirmed working
  console.log('📊 Dashboard params — matchId:', matchId, '| source:', dataSource, '| stem:', stem);

  const EMOTION_COLORS: Record<string, string> = {
    Neutral: '#60A5FA', Happiness: '#34D399', Anger: '#EF4444',
    Sadness: '#A78BFA', Surprise: '#FBBF24', Disgust: '#F97316', Fear: '#9CA3AF',
  };
  const getColor = (name: string) => EMOTION_COLORS[name] || '#6B7280';

  // ── Single fetch — replaces all batching + processAnalytics ──────────────
  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      let url: string;

      if (dataSource === 'hive') {
        url = `${API_BASE_URL}/api/analytics/hive?stem=${encodeURIComponent(stem)}`;
      } else {
        if (!dataDirectory) {
          setError('Data directory not configured. Please set it up in Toolkit Setup.');
          setLoading(false);
          return;
        }
        const filePath = `${dataDirectory}/merged/${stem}_merged.csv`;
        url = `${API_BASE_URL}/api/analytics/local?file_path=${encodeURIComponent(filePath)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }

      const data: AnalyticsResult = await res.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmotion = (name: string) =>
    setIncludedEmotions(prev => ({ ...prev, [name]: !prev[name] }));

  const filteredEmotionData = (analytics?.emotion_distribution || [])
    .filter(d => includedEmotions[d.name] && d.value > 0);

  // ── Input metrics render ──────────────────────────────────────────────────
  const renderInputMetrics = () => {
    const m = analytics?.input_metrics;
    if (!m) return null;

    const abilityOrder = ['Q','E','C','X'];
    const weaponOrder  = ['1','2','3','4','5'];
    const abilityLabels: Record<string,string> = { C:'Ability 1', Q:'Ability 2', E:'Signature', X:'Ultimate' };
    const weaponLabels:  Record<string,string> = { '1':'Primary','2':'Secondary','3':'Melee','4':'Spike','5':'Other' };

    const abilities = abilityOrder.filter(k => m.ability_usage?.[k] > 0)
      .map(k => ({ key: k, label: abilityLabels[k], count: m.ability_usage[k] }));
    const weapons = weaponOrder.filter(k => m.ability_usage?.[k] > 0)
      .map(k => ({ key: k, label: weaponLabels[k], count: m.ability_usage[k] }));
    const totalAbilities = abilities.reduce((s,a) => s + a.count, 0);

    return (
      <div className="bg-gradient-to-br from-gray-950 to-black p-6 rounded-lg border border-red-500/20 shadow-lg">
        <h4 className="text-white font-black text-lg mb-6">Input Activity Analysis</h4>

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label:'APM',          value: m.apm,                 color:'text-purple-400', bar:'from-purple-500 to-purple-700', max:300 },
            { label:'Key Presses',  value: m.total_key_presses,   color:'text-green-400',  bar:'from-green-400 to-green-600',   max:2000 },
            { label:'Mouse Clicks', value: m.total_mouse_clicks,  color:'text-blue-400',   bar:'from-blue-400 to-blue-600',     max:3000 },
            { label:'Clicks/Min',   value: m.clicks_per_minute,   color:'text-yellow-400', bar:'from-yellow-400 to-yellow-600', max:100 },
          ].map(({ label, value, color, bar, max }) => (
            <div key={label} className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-red-500/20">
              <p className="text-red-300/60 text-xs mb-2 font-semibold">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value.toLocaleString()}</p>
              <div className="mt-2 w-full h-3 bg-gray-800 rounded-full">
                <div className={`bg-gradient-to-r ${bar} h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Abilities */}
        {abilities.length > 0 && (
          <div className="mb-6">
            <h5 className="text-white font-black mb-4 flex items-center gap-2 text-lg">
              <span className="text-purple-400">⚡</span> Valorant Abilities
            </h5>
            <div className="space-y-4">
              {abilities.map(a => {
                const pct = totalAbilities > 0 ? (a.count / totalAbilities) * 100 : 0;
                return (
                  <div key={a.key}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black ${a.key==='X'?'text-yellow-400':'text-purple-400'}`}>{a.key}</span>
                        <span className="text-gray-300 text-sm font-semibold">{a.label}</span>
                      </div>
                      <span className="text-red-300/60 text-xs font-bold">{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`${a.key==='X'?'bg-gradient-to-r from-yellow-400 to-yellow-600':'bg-gradient-to-r from-purple-500 to-purple-700'} h-4 rounded-full`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weapons */}
        {weapons.length > 0 && (
          <div className="mb-6">
            <h5 className="text-white font-black mb-3 flex items-center gap-2">
              <span className="text-blue-400">🔫</span> Weapons & Equipment
            </h5>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {weapons.map(w => (
                <div key={w.key} className="bg-gradient-to-br from-gray-900 to-black p-3 rounded-lg border border-red-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-2xl font-black text-blue-400">{w.key}</span>
                    <span className="text-white font-black">{w.count}</span>
                  </div>
                  <p className="text-gray-400 text-xs font-semibold">{w.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="space-y-2">
          {m.apm > 150 && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm font-bold">✅ High APM ({m.apm}) — Active and engaged playstyle</p>
            </div>
          )}
          {m.apm < 100 && m.apm > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm font-bold">⚠️ Low APM ({m.apm}) — May be too passive</p>
            </div>
          )}
          {m.ability_usage?.X < 15 && m.ability_usage?.X >= 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm font-bold">⚠️ Low ultimate usage ({m.ability_usage.X} times) — Consider using ult more frequently</p>
            </div>
          )}
          {(m.ability_usage?.Q > 50 || m.ability_usage?.E > 50 || m.ability_usage?.C > 30) && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-sm font-bold">
                ✅ Good utility usage (Q: {m.ability_usage.Q}, E: {m.ability_usage.E}, C: {m.ability_usage.C})
              </p>
            </div>
          )}
          <p className="text-gray-500 text-xs text-center mt-4 font-semibold">
            Match duration: ~{m.duration_minutes} minutes
          </p>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-black via-gray-900 to-red-900/10 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
            if (currentPuuid) params.set('puuid', currentPuuid);
            navigate(`/player/valorant-recordinglist${params.toString() ? `?${params}` : ''}`);
          }}
          className="flex items-center gap-2 text-red-300/60 hover:text-red-400 mb-4 transition-colors font-bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Match List
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📊</span>
          <h2 className="text-sm font-bold text-red-300/60 uppercase tracking-wider">MATCH DASHBOARD</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-black ${
            dataSource === 'hive'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {dataSource === 'hive' ? '🖥️ Hive Server' : '💻 Local'}
          </span>
          {analytics?.cached && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-green-500/20 text-green-400 border border-green-500/30">
              ⚡ Cached
            </span>
          )}
        </div>

        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-400 mb-2">
          VALORANT Analytics
        </h1>
        {currentRiotId && currentRiotId !== 'Unknown' && (
          <p className="text-red-400 font-black">Playing as: {decodeURIComponent(currentRiotId)}</p>
        )}
        <p className="text-red-300/60 text-sm mt-1 font-semibold">Match: {stem}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-red-400 font-bold mb-1">{error}</p>
            {error.includes('Data directory not configured') && (
              <button onClick={() => navigate('/player/toolkitsetup')}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded font-black">
                Go to Toolkit Setup
              </button>
            )}
            {dataSource === 'hive' && (
              <p className="text-red-300 text-sm mt-2">Make sure you are on the university network or VPN.</p>
            )}
          </div>
        </div>
      )}

      {/* CTA — shown before loading */}
      {!analytics && !loading && !error && (
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 border-2 border-red-500/50 rounded-xl p-8 text-center mb-6">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-white font-black text-2xl mb-2">Ready to Analyze Performance</h3>
          <p className="text-red-300/80 mb-2 font-semibold">
            All analytics are computed server-side — charts appear instantly once loaded
          </p>
          {dataSource === 'hive' && (
            <p className="text-blue-400 text-sm mb-4 font-semibold">
              📡 Reading from Hive server · First load ~3-6s · Cached visits ~instant
            </p>
          )}
          {dataSource === 'local' && (
            <p className="text-red-300/60 text-sm mb-4 font-semibold">
              💻 Reading from local toolkit directory · Cached after first load
            </p>
          )}
          <button onClick={loadAnalytics}
            className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white rounded-lg font-black text-lg transition-all transform hover:scale-105 shadow-lg shadow-red-500/30">
            🚀 Load Analytics Dashboard
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-12 text-center mb-6">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <h3 className="text-white font-black text-xl mb-2">Computing Analytics...</h3>
          <p className="text-red-300/60 font-semibold">
            {dataSource === 'hive'
              ? 'Reading merged CSV from Hive and aggregating with pandas...'
              : 'Reading local merged CSV and aggregating with pandas...'}
          </p>
        </div>
      )}

      {/* Dashboard */}
      {analytics && (
        <div className="space-y-6">

          {/* Emotion not recorded warning */}
          {!analytics.emotion_recorded && (
            <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg p-3 flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-orange-400 text-sm font-semibold">
                Camera was not active during this session — emotion data was not recorded. All emotion charts show Neutral as a placeholder.
              </p>
            </div>
          )}

          {/* Emotion Distribution */}
          <div className="bg-gradient-to-br from-gray-950 to-black p-6 rounded-lg border border-red-500/20 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-white font-black text-lg">Emotion Distribution</h4>
                <p className="text-red-300/60 text-sm font-semibold">
                  During gameplay session · {analytics.total_rows.toLocaleString()} data points
                </p>
              </div>
              <div className="text-right">
                <p className="text-red-300/60 text-xs font-semibold">Dominant</p>
                <p className="text-xl font-black" style={{ color: getColor(analytics.dominant_emotion) }}>
                  {analytics.dominant_emotion}
                </p>
                <p className="text-gray-500 text-xs font-bold">{analytics.dominant_percentage}%</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              {Object.keys(EMOTION_COLORS).map(e => (
                <label key={e} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includedEmotions[e]}
                    onChange={() => toggleEmotion(e)} className="accent-red-500" />
                  <span className="text-gray-300 text-sm font-semibold">{e}</span>
                </label>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={filteredEmotionData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`} outerRadius={100} dataKey="value">
                  {filteredEmotionData.map((entry, i) => <Cell key={i} fill={getColor(entry.name)} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'0.5rem' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm font-semibold">
                💡 Player maintains {analytics.dominant_emotion.toLowerCase()} state {analytics.dominant_percentage}% of the time —
                {analytics.dominant_percentage > 80 ? ' Excellent emotional control' : ' Good consistency'}
              </p>
            </div>
          </div>

          {/* Input Metrics */}
          {renderInputMetrics()}

          {/* Data Quality */}
          <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>🔍</span> Data Quality Check</h3>
            <div className="space-y-3">
              {!analytics.data_quality.has_emotion && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm font-bold">⚠️ No emotion data detected — camera or emotion detection may not have been active</p>
                </div>
              )}
              {!analytics.data_quality.has_gaze && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm font-bold">⚠️ No eye tracking data detected — eye tracker may not have been connected or calibrated</p>
                </div>
              )}
              {!analytics.data_quality.has_input && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm font-bold">⚠️ No input data detected — keyboard logging may not have been enabled</p>
                </div>
              )}
              {analytics.data_quality.has_emotion && analytics.data_quality.has_gaze && analytics.data_quality.has_input && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 text-sm font-bold">✅ All data streams present — emotion, eye tracking, and input data all captured</p>
                </div>
              )}
            </div>
          </div>

          {/* Emotion Flow */}
          <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>📈</span> Emotion Flow Throughout Match</h3>
            <p className="text-red-300/60 text-sm mb-4 font-semibold">How emotional state changed from pistol round to final rounds</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.emotion_progress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="stage" stroke="#FCA5A5" />
                <YAxis stroke="#FCA5A5" label={{ value:'Occurrences', angle:-90, position:'insideLeft', fill:'#FCA5A5' }} />
                <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(239,68,68,0.2)' }} labelStyle={{ color:'#fff', fontWeight:'bold' }} />
                <Legend />
                {Object.keys(EMOTION_COLORS).map(e => <Bar key={e} dataKey={e} stackId="a" fill={getColor(e)} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Screen Zones */}
          <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>🎯</span> VALORANT Focus Zones</h3>
            <p className="text-red-300/60 text-sm mb-4 font-semibold">Distribution of visual attention across key game interface areas</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.screen_zones}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="zone" stroke="#FCA5A5" />
                <YAxis stroke="#FCA5A5" />
                <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(239,68,68,0.2)' }} />
                <Bar dataKey="count" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              {analytics.screen_zones.map(z => (
                <div key={z.zone} className="bg-gradient-to-br from-gray-900 to-black rounded-lg p-3 text-center border border-red-500/20">
                  <p className="text-red-300/60 text-sm font-semibold">{z.zone}</p>
                  <p className="text-white font-black text-lg">{z.percentage}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gaze Path */}
          <div className="bg-gradient-to-br from-gray-950 to-black border border-red-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>👁️</span> Gaze Path Visualization</h3>
            <p className="text-red-300/60 text-sm mb-4 font-semibold">Eye tracking data showing where attention was focused (2560×1440)</p>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" dataKey="x" domain={[0,2560]} stroke="#FCA5A5" />
                <YAxis type="number" dataKey="y" domain={[0,1440]} stroke="#FCA5A5" reversed />
                <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(239,68,68,0.2)' }} />
                <Scatter name="Gaze Points" data={analytics.gaze_points} fill="#EF4444" fillOpacity={0.3} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 border-2 border-red-500/50 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>✅</span> Analysis Complete</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'Data Points',      value: analytics.total_rows.toLocaleString() },
                { label:'Emotions Tracked', value: analytics.emotion_distribution.length },
                { label:'Gaze Points',      value: analytics.gaze_points.length.toLocaleString() },
                { label:'Focus Zones',      value: analytics.screen_zones.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gradient-to-br from-gray-950 to-black rounded-lg p-4 border border-red-500/20">
                  <p className="text-red-300/60 text-sm font-semibold">{label}</p>
                  <p className="text-white font-black text-2xl">{value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default PlayerValorantMatchDashboard;