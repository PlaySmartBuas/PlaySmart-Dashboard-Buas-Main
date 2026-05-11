// import React, { useEffect, useState, useRef } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { API_BASE_URL } from '../../services/api';

// interface MatchData {
//   match_id: string;
//   map: string;
//   mode: string;
//   rounds_played: number;
//   game_start: number;
//   game_end: number;
//   game_length: number;
//   time_difference_seconds: number;
//   player_stats: {
//     agent: string;
//     kills: number;
//     deaths: number;
//     assists: number;
//     score: number;
//     headshots: number;
//     bodyshots: number;
//     legshots: number;
//     team: string;
//   } | null;
// }

// interface Match {
//   filename: string;
//   display_name: string;
//   game_type: string;
//   date: string;
//   has_video: boolean;
//   has_merged_data: boolean;
//   has_emotions?: boolean;
//   has_gaze?: boolean;
//   video_path: string | null;
//   merged_data_path: string | null;
//   match_data?: MatchData | null;
//   loading?: boolean;
// }

// type DataSource = 'local' | 'hive';

// // ─── Component ────────────────────────────────────────────────────────────────

// const ValorantRecordingList: React.FC = () => {
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();

//   const [matches,          setMatches]          = useState<Match[]>([]);
//   const [loading,          setLoading]          = useState(false);
//   const [error,            setError]            = useState('');
//   const [selectedMatch,    setSelectedMatch]    = useState<string | null>(null);
//   const [currentRiotId,    setCurrentRiotId]    = useState('');
//   const [isMatchingWithAPI,setIsMatchingWithAPI]= useState(false);
//   const [matchingError,    setMatchingError]    = useState('');
//   const [hiveStats,        setHiveStats]        = useState<Record<string, number> | null>(null);
//   const hasEnrichedWithRiotId = useRef(false);

//   // ── Local-only state ──────────────────────────────────────────────────────
//   const [dataDirectory,      setDataDirectory]      = useState('');
//   const [showDirectoryInput, setShowDirectoryInput] = useState(false);
//   const [isValidating,       setIsValidating]       = useState(false);

//   // ── Data source toggle ────────────────────────────────────────────────────
//   const [dataSource, setDataSource] = useState<DataSource>(() =>
//     (localStorage.getItem('coach_recording_list_source') as DataSource) || 'local'
//   );

//   // Persist source preference
//   useEffect(() => {
//     localStorage.setItem('coach_recording_list_source', dataSource);
//   }, [dataSource]);

//   // ── Riot ID resolution (unchanged) ───────────────────────────────────────
//   useEffect(() => {
//     const riotIdFromUrl = searchParams.get('user');
//     if (riotIdFromUrl) {
//       sessionStorage.setItem('current_riot_id', riotIdFromUrl);
//       sessionStorage.setItem('current_valorant_riot_id', riotIdFromUrl);
//       setCurrentRiotId(riotIdFromUrl);
//     } else {
//       const saved = sessionStorage.getItem('current_valorant_riot_id') || sessionStorage.getItem('current_riot_id');
//       if (saved) {
//         setCurrentRiotId(saved);
//         sessionStorage.setItem('current_riot_id', saved);
//         sessionStorage.setItem('current_valorant_riot_id', saved);
//       }
//     }
//   }, [searchParams]);

//   // ── Initial load ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (dataSource === 'hive') {
//       fetchHiveMatches();
//     } else {
//       loadCoachConfig();
//     }
//   }, [dataSource]);

//   // ── Enrichment (local only) ───────────────────────────────────────────────
//   useEffect(() => {
//     if (
//       dataSource === 'local' &&
//       currentRiotId && currentRiotId !== 'Unknown' &&
//       matches.length > 0 &&
//       !hasEnrichedWithRiotId.current
//     ) {
//       const needsEnrichment = matches.some(m => !m.match_data && m.loading !== false);
//       if (needsEnrichment) {
//         hasEnrichedWithRiotId.current = true;
//         enrichMatchesWithAPI();
//       }
//     }
//   }, [currentRiotId, matches, dataSource]);

//   const enrichMatchesWithAPI = async () => {
//     if (!currentRiotId || currentRiotId === 'Unknown' || matches.length === 0) return;
//     setIsMatchingWithAPI(true);
//     setMatchingError('');
//     try {
//       const res = await fetch(`${API_BASE_URL}/api/valorant/enrich-matches`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//         },
//         body: JSON.stringify({
//           riot_id: decodeURIComponent(currentRiotId),
//           matches: matches.map(m => ({ filename: m.filename })),
//           region: 'eu',
//         }),
//       });
//       if (!res.ok) throw new Error('Failed to enrich matches');
//       const data = await res.json();
//       if (data.success && data.enriched_matches) {
//         setMatches(prev => prev.map(match => {
//           const enriched = data.enriched_matches.find((e: any) => e.filename === match.filename);
//           return enriched?.match_data
//             ? { ...match, match_data: enriched.match_data, loading: false }
//             : { ...match, loading: false };
//         }));
//       }
//     } catch {
//       setMatchingError('Could not enrich matches with online data');
//     } finally {
//       setIsMatchingWithAPI(false);
//     }
//   };

//   // ── Hive fetch ────────────────────────────────────────────────────────────
//   const fetchHiveMatches = async () => {
//     setLoading(true);
//     setError('');
//     setMatches([]);
//     hasEnrichedWithRiotId.current = false;
//     try {
//       const res = await fetch(`${API_BASE_URL}/api/hive/list-matches?game_type=valorant`);
//       if (!res.ok) {
//         const err = await res.json().catch(() => ({}));
//         throw new Error(err.detail || `Server error: ${res.status}`);
//       }
//       const data = await res.json();
//       if (data.success) {
//         setHiveStats(data.directory_stats || null);
//         const sorted = [...(data.matches || [])].sort(
//           (a, b) => sortByFilenameDate(b.filename) - sortByFilenameDate(a.filename)
//         );
//         setMatches(sorted.map(m => ({ ...m, loading: false })));
//       } else {
//         setError('Failed to load matches from Hive');
//       }
//     } catch (err) {
//       setError(
//         err instanceof Error
//           ? err.message
//           : 'Could not connect to Hive. Make sure you are on the university network.'
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Local fetch helpers (unchanged logic) ─────────────────────────────────
//   const loadCoachConfig = async () => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/api/coach/config`, {
//         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
//       });
//       if (res.ok) {
//         const config = await res.json();
//         if (config.data_directory) {
//           setDataDirectory(config.data_directory);
//           setShowDirectoryInput(false);
//           await fetchLocalMatches(config.data_directory);
//         } else {
//           setShowDirectoryInput(true);
//         }
//       } else {
//         setShowDirectoryInput(true);
//       }
//     } catch {
//       setShowDirectoryInput(true);
//     }
//   };

//   const fetchLocalMatches = async (dirPath: string) => {
//     setLoading(true);
//     setError('');
//     setShowDirectoryInput(false);
//     hasEnrichedWithRiotId.current = false;
//     try {
//       const res = await fetch(
//         `${API_BASE_URL}/api/matches/list-matches?game_type=valorant&data_directory=${encodeURIComponent(dirPath)}`
//       );
//       if (!res.ok) {
//         const errText = await res.text();
//         let errData;
//         try { errData = JSON.parse(errText); } catch { throw new Error(`Server error: ${res.status}`); }
//         throw new Error(errData.detail || 'Failed to fetch matches');
//       }
//       const data = await res.json();
//       if (data.success) {
//         const sorted = [...(data.matches || [])].sort(
//           (a, b) => sortByFilenameDate(b.filename) - sortByFilenameDate(a.filename)
//         );
//         setMatches(sorted.map((m: Match) => ({ ...m, loading: true })));
//         setShowDirectoryInput(false);
//       } else {
//         setError('Failed to load matches');
//         setShowDirectoryInput(true);
//       }
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Could not connect to server.');
//       setShowDirectoryInput(true);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const sortByFilenameDate = (filename: string): number => {
//     const parts = filename.split('_');
//     if (parts.length >= 2) {
//       const dateStr = parts[parts.length - 2];
//       const timeStr = parts[parts.length - 1];
//       if (dateStr?.includes('-') && timeStr?.includes('-')) {
//         try {
//           const [day, month, year] = dateStr.split('-');
//           const [hour, minute, second] = timeStr.split('-');
//           return new Date(+year, +month - 1, +day, +hour, +minute, +second).getTime();
//         } catch { return 0; }
//       }
//     }
//     return 0;
//   };

//   const handleBrowseDirectory = async () => {
//     try {
//       const res = await fetch(`${API_BASE_URL}/api/coach/select-data-directory`);
//       const data = await res.json();
//       if (data.success && data.directoryPath) {
//         setDataDirectory(data.directoryPath);
//         setError('');
//       }
//     } catch {
//       setError('Could not open directory dialog. Make sure the backend server is running.');
//     }
//   };

//   const handleLoadMatches = async () => {
//     if (!dataDirectory.trim()) { setError('Please enter or browse to a directory path'); return; }
//     setIsValidating(true);
//     hasEnrichedWithRiotId.current = false;
//     try {
//       await fetch(`${API_BASE_URL}/api/coach/config`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
//         body: JSON.stringify({ data_directory: dataDirectory }),
//       });
//     } catch { /* non-fatal */ }
//     await fetchLocalMatches(dataDirectory);
//     setIsValidating(false);
//   };

//   const handleChangeDirectory = () => {
//     setShowDirectoryInput(true);
//     setMatches([]);
//     setSelectedMatch(null);
//     setError('');
//     hasEnrichedWithRiotId.current = false;
//   };

//   const refreshMatches = () => {
//     if (dataSource === 'hive') {
//       fetchHiveMatches();
//     } else if (dataDirectory) {
//       hasEnrichedWithRiotId.current = false;
//       fetchLocalMatches(dataDirectory);
//     }
//   };

//   // ── Navigation ────────────────────────────────────────────────────────────
//   const handleMatchClick = (match: Match) => setSelectedMatch(match.filename);

//   const handleRecordingAnalysis = () => {
//     if (!selectedMatch) return;
//     const params = new URLSearchParams();
//     params.set('matchId', selectedMatch);
//     params.set('match_id', selectedMatch);
//     params.set('source', dataSource);
//     if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
//     navigate(`/coach/valorant-recording-analysis?${params.toString()}`);
//   };

//   const handleMatchDashboard = () => {
//     if (!selectedMatch) return;
//     const params = new URLSearchParams();
//     params.set('matchId', selectedMatch);
//     params.set('match_id', selectedMatch);
//     params.set('source', dataSource);
//     if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
//     navigate(`/coach/valorant-match-dashboard?${params.toString()}`);
//   };

//   // ── Render helpers ────────────────────────────────────────────────────────
//   const renderMatchCard = (match: Match) => {
//     const matchData = match.match_data;
//     const stats = matchData?.player_stats;

//     const parts = match.filename.split('_');
//     let displayDate = '', displayTime = '';
//     if (parts.length >= 2) {
//       const dateStr = parts[parts.length - 2];
//       const timeStr = parts[parts.length - 1];
//       if (dateStr?.includes('-')) { const [d,mo,y] = dateStr.split('-'); displayDate = `${d}/${mo}/${y}`; }
//       if (timeStr?.includes('-')) { const [h,mi] = timeStr.split('-'); displayTime = `${h}:${mi}`; }
//     }

//     const totalShots = stats ? (stats.headshots||0)+(stats.bodyshots||0)+(stats.legshots||0) : 0;
//     const hsPercent  = stats && totalShots > 0 ? Math.round((stats.headshots/totalShots)*100) : null;
//     const kdaRatio   = stats
//       ? stats.deaths > 0 ? ((stats.kills+stats.assists)/stats.deaths).toFixed(2) : (stats.kills+stats.assists).toFixed(1)
//       : null;

//     const isSelected = selectedMatch === match.filename;

//     return (
//       <div
//         key={match.filename}
//         onClick={() => handleMatchClick(match)}
//         className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
//           isSelected
//             ? 'bg-yellow-500/20 border-yellow-500/60 shadow-lg shadow-yellow-500/20'
//             : 'bg-gradient-to-br from-gray-900 to-black border-yellow-500/20 hover:border-yellow-500/40'
//         }`}
//       >
//         {match.loading && (
//           <div className="flex items-center gap-2 text-yellow-400 text-xs mb-2">
//             <div className="animate-spin">⚙️</div><span>Loading match details...</span>
//           </div>
//         )}

//         <div className="flex items-start justify-between mb-3">
//           <div className="flex-1">
//             {matchData && stats ? (
//               <div className="flex items-center gap-3">
//                 <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30">
//                   <span className="text-xl font-black text-red-400">{stats.agent?.substring(0,2).toUpperCase()||'??'}</span>
//                 </div>
//                 <div>
//                   <h4 className="text-white font-black text-sm mb-0.5">{stats.agent||'Unknown Agent'}</h4>
//                   <div className="flex items-center gap-2">
//                     <span className="text-yellow-400 text-xs font-bold">{matchData.map}</span>
//                     <span className="text-yellow-300/60 text-xs">•</span>
//                     <span className="text-yellow-300/60 text-xs font-semibold">{matchData.mode}</span>
//                   </div>
//                   {displayDate && displayTime && (
//                     <span className="text-yellow-300/40 text-[10px] font-semibold mt-1 block">{displayDate} • {displayTime}</span>
//                   )}
//                 </div>
//               </div>
//             ) : (
//               <>
//                 <h4 className="text-white font-bold mb-1 text-sm">{match.display_name}</h4>
//                 {displayDate && displayTime
//                   ? <p className="text-yellow-300/60 text-xs font-semibold">{displayDate} • {displayTime}</p>
//                   : <p className="text-yellow-300/60 text-xs font-semibold">{match.date}</p>
//                 }
//               </>
//             )}
//           </div>
//           {isSelected && (
//             <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
//               <span className="text-black text-xs font-black">✓</span>
//             </div>
//           )}
//         </div>

//         {matchData && stats && (
//           <div className="grid grid-cols-4 gap-2 my-3 pb-3 border-b border-yellow-500/20">
//             {[
//               { label:'KDA',   top:`${stats.kills}/${stats.deaths}/${stats.assists}`, bot:`${kdaRatio}:1` },
//               { label:'HS%',   top: hsPercent !== null ? `${hsPercent}%` : 'N/A',    bot:`${stats.headshots} HS` },
//               { label:'Score', top:`${stats.score||0}`,                               bot:`${matchData.rounds_played}R` },
//               { label:'Team',  top: stats.team,                                       bot:`${Math.floor(matchData.game_length/60)}m` },
//             ].map(({ label, top, bot }) => (
//               <div key={label} className="text-center">
//                 <p className="text-yellow-300/60 text-[10px] uppercase font-bold mb-1">{label}</p>
//                 <p className="text-white font-black text-xs">{top}</p>
//                 <p className="text-yellow-400 text-[10px] font-bold">{bot}</p>
//               </div>
//             ))}
//           </div>
//         )}

//         {matchData && (
//           <div className="mb-3 text-xs text-yellow-300/60 font-semibold">
//             {matchData.rounds_played} rounds • {Math.floor(matchData.game_length/60)}m {matchData.game_length%60}s
//             {matchData.time_difference_seconds !== undefined && (
//               <span className="ml-2 text-[10px]">(±{Math.round(matchData.time_difference_seconds/60)}min)</span>
//             )}
//           </div>
//         )}

//         <div className="flex gap-2 flex-wrap">
//           {match.has_video && (
//             <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1 font-bold border border-green-500/30">🎥 Video</span>
//           )}
//           {match.has_merged_data && (
//             <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded flex items-center gap-1 font-bold border border-yellow-500/30">📊 Data</span>
//           )}
//           {match.has_emotions && (
//             <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded flex items-center gap-1 font-bold border border-orange-500/30">😊 Emotions</span>
//           )}
//           {match.has_gaze && (
//             <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1 font-bold border border-purple-500/30">👁️ Gaze</span>
//           )}
//           {matchData && (
//             <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1 font-bold border border-blue-500/30">✓ Matched</span>
//           )}
//           {!match.has_video && (
//             <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded flex items-center gap-1 border border-gray-600/30">⚠️ No Video</span>
//           )}
//           {stats && hsPercent && hsPercent >= 50 && (
//             <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1 font-bold border border-purple-500/30">🎯 Headshot King</span>
//           )}
//         </div>
//       </div>
//     );
//   };

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen">

//       {/* Header */}
//       <div className="mb-8">
//         <button
//           onClick={() => {
//             const params = new URLSearchParams();
//             if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
//             navigate(`/coach/valorant-dashboard${params.toString() ? `?${params}` : ''}`);
//           }}
//           className="flex items-center gap-2 text-yellow-300/60 hover:text-yellow-400 mb-4 transition-colors font-bold"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//           </svg>
//           Back to Dashboard
//         </button>

//         <div className="flex items-center gap-2 mb-4">
//           <span className="text-2xl">🎯</span>
//           <h2 className="text-sm font-bold text-yellow-300/60 uppercase tracking-wider">VALORANT — COACH VIEW</h2>
//         </div>
//         <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 mb-2">
//           Match Recordings
//         </h1>
//         <p className="text-yellow-300/60 font-semibold">Select a match to analyze or review performance</p>
//         {currentRiotId && currentRiotId !== 'Unknown' && (
//           <p className="text-yellow-400 mt-2 font-black">Analyzing player: {decodeURIComponent(currentRiotId)}</p>
//         )}
//       </div>

//       {/* ── DATA SOURCE TOGGLE ─────────────────────────────────────────────── */}
//       <div className="mb-6 bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-4">
//         <div className="flex items-center justify-between flex-wrap gap-4">
//           <div>
//             <h3 className="text-white font-bold text-sm mb-1">Data Source</h3>
//             <p className="text-yellow-300/60 text-xs">
//               {dataSource === 'hive'
//                 ? 'Reading files from Hive server (10.4.28.2) — university network required'
//                 : 'Reading files from local data directory'}
//             </p>
//           </div>
//           <div className="flex items-center bg-gray-900 rounded-lg p-1 gap-1">
//             <button
//               onClick={() => setDataSource('local')}
//               className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
//                 dataSource === 'local' ? 'bg-yellow-500 text-black shadow' : 'text-gray-400 hover:text-white'
//               }`}
//             >
//                Local
//             </button>
//             <button
//               onClick={() => setDataSource('hive')}
//               className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
//                 dataSource === 'hive' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
//               }`}
//             >
//                Hive Server
//             </button>
//           </div>
//         </div>

//         {/* Hive directory stats */}
//         {dataSource === 'hive' && hiveStats && (
//           <div className="mt-3 pt-3 border-t border-yellow-500/20 flex flex-wrap gap-4">
//             {Object.entries(hiveStats).map(([dir, count]) => (
//               <div key={dir} className="text-xs">
//                 <span className="text-yellow-300/60 capitalize">{dir}: </span>
//                 <span className="text-blue-400 font-bold">{count} files</span>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Status banners */}
//       {isMatchingWithAPI && (
//         <div className="mb-4 bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 flex items-center gap-3">
//           <div className="animate-spin text-xl">🔄</div>
//           <p className="text-blue-400 font-semibold text-sm">Matching recordings with online match data...</p>
//         </div>
//       )}
//       {matchingError && (
//         <div className="mb-4 bg-orange-500/10 border border-orange-500/50 rounded-lg p-3 flex items-start gap-3">
//           <span className="text-lg">⚠️</span>
//           <p className="text-orange-400 font-semibold text-sm">{matchingError}</p>
//         </div>
//       )}
//       {error && (
//         <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
//           <span className="text-2xl">⚠️</span>
//           <div className="flex-1">
//             <p className="text-red-400 font-bold mb-1">{error}</p>
//             {dataSource === 'hive' && (
//               <p className="text-red-300 text-sm mt-1 font-semibold">Make sure you are on the university network or VPN.</p>
//             )}
//             {dataSource === 'local' && (
//               <p className="text-red-300 text-sm mt-1 font-semibold">Make sure the directory path is correct and contains Valorant match files.</p>
//             )}
//           </div>
//         </div>
//       )}

//       {/* ── LOCAL: directory input (only shown for local source) ─────────── */}
//       {dataSource === 'local' && showDirectoryInput && (
//         <div className="mb-6 bg-gradient-to-br from-gray-950 to-black border-2 border-yellow-500/20 rounded-xl p-6 shadow-lg">
//           <div className="flex items-start gap-3 mb-4">
//             <span className="text-2xl">📁</span>
//             <div className="flex-1">
//               <h3 className="text-yellow-400 font-black mb-1">Select Data Directory</h3>
//               <p className="text-yellow-300/70 text-sm font-semibold">Choose the folder containing your match data files</p>
//             </div>
//           </div>
//           <div className="space-y-4">
//             <div>
//               <label className="block text-yellow-300/60 font-bold text-sm mb-2 uppercase tracking-wider">Data Directory Path</label>
//               <div className="flex gap-3">
//                 <input
//                   type="text"
//                   value={dataDirectory}
//                   onChange={e => setDataDirectory(e.target.value)}
//                   placeholder="C:\Users\Coach\Documents\GameData"
//                   className="flex-1 px-4 py-3 bg-gray-900/50 border border-yellow-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/60 font-semibold"
//                 />
//                 <button
//                   onClick={handleBrowseDirectory}
//                   className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-bold border border-yellow-500/20 flex items-center gap-2"
//                 >
//                   <span>📂</span> Browse
//                 </button>
//               </div>
//             </div>
//             <button
//               onClick={handleLoadMatches}
//               disabled={isValidating || !dataDirectory.trim()}
//               className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-lg font-black disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2"
//             >
//               {isValidating || loading ? <><div className="animate-spin">⚙️</div> Loading...</> : <><span>🎯</span> Load Matches</>}
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Loading */}
//       {loading && (
//         <div className="flex items-center justify-center h-64">
//           <div className="animate-pulse text-center">
//             <div className="text-yellow-400 text-xl mb-2 font-bold">Loading matches...</div>
//             <div className="text-yellow-300/60 text-sm font-semibold">
//               {dataSource === 'hive' ? 'Connecting to Hive server...' : 'Scanning data directory...'}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Main content */}
//       {!loading && !(dataSource === 'local' && showDirectoryInput) && (
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

//           {/* Match list */}
//           <div className="lg:col-span-2">
//             <div className="bg-gradient-to-br from-gray-950 to-black border-2 border-yellow-500/20 rounded-xl p-6 shadow-lg">
//               <div className="flex items-center justify-between mb-4">
//                 <div className="flex items-center gap-2">
//                   <h3 className="text-white font-black text-lg">Available Matches ({matches.length})</h3>
//                   {dataSource === 'hive' && (
//                     <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-bold border border-blue-500/30">HIVE</span>
//                   )}
//                 </div>
//                 <div className="flex items-center gap-2">
//                   {dataSource === 'local' && (
//                     <button onClick={handleChangeDirectory} className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1 font-bold">
//                       <span>📁</span> Change Directory
//                     </button>
//                   )}
//                   {matches.length > 0 && (
//                     <>
//                       {dataSource === 'local' && <span className="text-yellow-500/30">|</span>}
//                       <button onClick={refreshMatches} className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1 font-bold">
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                         </svg>
//                         Refresh
//                       </button>
//                     </>
//                   )}
//                 </div>
//               </div>

//               {matches.length === 0 && !error ? (
//                 <div className="text-center py-12">
//                   <div className="text-6xl mb-4">{dataSource === 'hive' ? '🖥️' : '📁'}</div>
//                   <p className="text-yellow-300/60 mb-2 font-semibold">
//                     {dataSource === 'hive' ? 'No Valorant matches found on Hive server' : 'No Valorant matches found'}
//                   </p>
//                   {dataSource === 'local' && (
//                     <button onClick={handleChangeDirectory}
//                       className="mt-4 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg font-black shadow-lg shadow-yellow-500/30">
//                       Select Different Directory
//                     </button>
//                   )}
//                 </div>
//               ) : (
//                 <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
//                   {matches.map(renderMatchCard)}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Action panel */}
//           <div className="space-y-6">
//             <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
//               <h3 className="text-white font-black text-center mb-6">COACH ACTIONS</h3>
//               {!selectedMatch ? (
//                 <div className="text-center py-8">
//                   <div className="text-4xl mb-3">👈</div>
//                   <p className="text-yellow-300/60 text-sm font-semibold">Select a match to continue</p>
//                 </div>
//               ) : (
//                 <div className="space-y-3">
//                   <button
//                     onClick={handleRecordingAnalysis}
//                     disabled={!matches.find(m => m.filename === selectedMatch)?.has_video}
//                     className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-lg font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30"
//                   >
//                     🎬 Recording Analysis
//                   </button>
//                   <button
//                     onClick={handleMatchDashboard}
//                     className="w-full py-3 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-black flex items-center justify-center gap-2 border border-yellow-500/20"
//                   >
//                     📊 Match Dashboard
//                   </button>
//                   {!matches.find(m => m.filename === selectedMatch)?.has_video && (
//                     <p className="text-yellow-400 text-xs text-center pt-2 font-bold">⚠️ Video file not found for this match</p>
//                   )}
//                   <div className="pt-4 border-t border-yellow-500/20">
//                     <p className="text-yellow-300/60 text-xs text-center break-words font-semibold">
//                       {matches.find(m => m.filename === selectedMatch)?.display_name}
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Quick info */}
//             <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
//               <h3 className="text-white font-black mb-4">📋 Quick Info</h3>
//               <div className="space-y-3 text-sm">
//                 <div className="flex justify-between">
//                   <span className="text-yellow-300/60 font-semibold">Source:</span>
//                   <span className={`font-black ${dataSource === 'hive' ? 'text-blue-400' : 'text-yellow-400'}`}>
//                     {dataSource === 'hive' ? ' Hive' : ' Local'}
//                   </span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-yellow-300/60 font-semibold">Total Matches:</span>
//                   <span className="text-white font-black">{matches.length}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-yellow-300/60 font-semibold">With Video:</span>
//                   <span className="text-green-400 font-black">{matches.filter(m => m.has_video).length}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-yellow-300/60 font-semibold">With Data:</span>
//                   <span className="text-yellow-400 font-black">{matches.filter(m => m.has_merged_data).length}</span>
//                 </div>
//                 {dataSource === 'hive' && (
//                   <>
//                     <div className="flex justify-between">
//                       <span className="text-yellow-300/60 font-semibold">With Emotions:</span>
//                       <span className="text-orange-400 font-black">{matches.filter(m => m.has_emotions).length}</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-yellow-300/60 font-semibold">With Gaze:</span>
//                       <span className="text-purple-400 font-black">{matches.filter(m => m.has_gaze).length}</span>
//                     </div>
//                   </>
//                 )}
//                 <div className="flex justify-between">
//                   <span className="text-yellow-300/60 font-semibold">Matched:</span>
//                   <span className="text-blue-400 font-black">{matches.filter(m => m.match_data).length}</span>
//                 </div>
//               </div>
//             </div>

//             {/* Directory info (local only) */}
//             {dataSource === 'local' && dataDirectory && (
//               <div className="bg-gradient-to-br from-gray-900 to-black border border-yellow-500/20 rounded-xl p-4">
//                 <h4 className="text-yellow-300/60 font-bold text-xs mb-2">📁 Current Directory</h4>
//                 <p className="text-yellow-300/70 text-xs font-mono break-all">{dataDirectory}</p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ValorantRecordingList;


import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../services/api';

interface MatchData {
  match_id: string;
  map: string;
  mode: string;
  rounds_played: number;
  game_start: number;
  game_end: number;
  game_length: number;
  time_difference_seconds: number;
  player_stats: {
    agent: string;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
    headshots: number;
    bodyshots: number;
    legshots: number;
    team: string;
  } | null;
}

interface Match {
  filename: string;
  display_name: string;
  game_type: string;
  date: string;
  has_video: boolean;
  has_merged_data: boolean;
  has_emotions?: boolean;
  has_gaze?: boolean;
  video_path: string | null;
  merged_data_path: string | null;
  match_data?: MatchData | null;
  loading?: boolean;
}

type DataSource = 'local' | 'hive';

// ─── Component ────────────────────────────────────────────────────────────────

const ValorantRecordingList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [matches,          setMatches]          = useState<Match[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');
  const [selectedMatch,    setSelectedMatch]    = useState<string | null>(null);
  const [currentRiotId,    setCurrentRiotId]    = useState('');
  const [isMatchingWithAPI,setIsMatchingWithAPI]= useState(false);
  const [matchingError,    setMatchingError]    = useState('');
  const [hiveStats,        setHiveStats]        = useState<Record<string, number> | null>(null);
  const hasEnrichedWithRiotId = useRef(false);

  // ── Local-only state ──────────────────────────────────────────────────────
  const [dataDirectory,      setDataDirectory]      = useState('');
  const [showDirectoryInput, setShowDirectoryInput] = useState(false);
  const [isValidating,       setIsValidating]       = useState(false);

  // ── Data source toggle ────────────────────────────────────────────────────
  const [dataSource, setDataSource] = useState<DataSource>(() =>
    (localStorage.getItem('coach_recording_list_source') as DataSource) || 'local'
  );

  // Persist source preference
  useEffect(() => {
    localStorage.setItem('coach_recording_list_source', dataSource);
  }, [dataSource]);

  // ── Riot ID resolution (unchanged) ───────────────────────────────────────
  useEffect(() => {
    const riotIdFromUrl = searchParams.get('user');
    if (riotIdFromUrl) {
      sessionStorage.setItem('current_riot_id', riotIdFromUrl);
      sessionStorage.setItem('current_valorant_riot_id', riotIdFromUrl);
      setCurrentRiotId(riotIdFromUrl);
    } else {
      const saved = sessionStorage.getItem('current_valorant_riot_id') || sessionStorage.getItem('current_riot_id');
      if (saved) {
        setCurrentRiotId(saved);
        sessionStorage.setItem('current_riot_id', saved);
        sessionStorage.setItem('current_valorant_riot_id', saved);
      }
    }
  }, [searchParams]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (dataSource === 'hive') {
      fetchHiveMatches();
    } else {
      loadCoachConfig();
    }
  }, [dataSource]);

  // ── Enrichment (local only) ───────────────────────────────────────────────
  useEffect(() => {
    if (
      dataSource === 'local' &&
      currentRiotId && currentRiotId !== 'Unknown' &&
      matches.length > 0 &&
      !hasEnrichedWithRiotId.current
    ) {
      const needsEnrichment = matches.some(m => !m.match_data && m.loading !== false);
      if (needsEnrichment) {
        hasEnrichedWithRiotId.current = true;
        enrichMatchesWithAPI();
      }
    }
  }, [currentRiotId, matches, dataSource]);

  const enrichMatchesWithAPI = async () => {
    if (!currentRiotId || currentRiotId === 'Unknown' || matches.length === 0) return;
    setIsMatchingWithAPI(true);
    setMatchingError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/valorant/enrich-matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          riot_id: decodeURIComponent(currentRiotId),
          matches: matches.map(m => ({ filename: m.filename })),
          region: 'eu',
        }),
      });
      if (!res.ok) throw new Error('Failed to enrich matches');
      const data = await res.json();
      if (data.success && data.enriched_matches) {
        setMatches(prev => prev.map(match => {
          const enriched = data.enriched_matches.find((e: any) => e.filename === match.filename);
          return enriched?.match_data
            ? { ...match, match_data: enriched.match_data, loading: false }
            : { ...match, loading: false };
        }));
      }
    } catch {
      setMatchingError('Could not enrich matches with online data');
    } finally {
      setIsMatchingWithAPI(false);
    }
  };

  // ── Hive fetch ────────────────────────────────────────────────────────────
  const fetchHiveMatches = async () => {
    setLoading(true);
    setError('');
    setMatches([]);
    hasEnrichedWithRiotId.current = false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/hive/list-matches?game_type=valorant`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setHiveStats(data.directory_stats || null);
        const sorted = [...(data.matches || [])].sort(
          (a, b) => sortByFilenameDate(b.filename) - sortByFilenameDate(a.filename)
        );
        setMatches(sorted.map(m => ({ ...m, loading: false })));
      } else {
        setError('Failed to load matches from Hive');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not connect to Hive. Make sure you are on the university network.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Local fetch helpers (unchanged logic) ─────────────────────────────────
  const loadCoachConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/coach/config`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const config = await res.json();
        if (config.data_directory) {
          setDataDirectory(config.data_directory);
          setShowDirectoryInput(false);
          await fetchLocalMatches(config.data_directory);
        } else {
          setShowDirectoryInput(true);
        }
      } else {
        setShowDirectoryInput(true);
      }
    } catch {
      setShowDirectoryInput(true);
    }
  };

  const fetchLocalMatches = async (dirPath: string) => {
    setLoading(true);
    setError('');
    setShowDirectoryInput(false);
    hasEnrichedWithRiotId.current = false;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/matches/list-matches?game_type=valorant&data_directory=${encodeURIComponent(dirPath)}`
      );
      if (!res.ok) {
        const errText = await res.text();
        let errData;
        try { errData = JSON.parse(errText); } catch { throw new Error(`Server error: ${res.status}`); }
        throw new Error(errData.detail || 'Failed to fetch matches');
      }
      const data = await res.json();
      if (data.success) {
        const sorted = [...(data.matches || [])].sort(
          (a, b) => sortByFilenameDate(b.filename) - sortByFilenameDate(a.filename)
        );
        setMatches(sorted.map((m: Match) => ({ ...m, loading: true })));
        setShowDirectoryInput(false);
      } else {
        setError('Failed to load matches');
        setShowDirectoryInput(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to server.');
      setShowDirectoryInput(true);
    } finally {
      setLoading(false);
    }
  };

  const sortByFilenameDate = (filename: string): number => {
    const parts = filename.split('_');
    if (parts.length >= 2) {
      const dateStr = parts[parts.length - 2];
      const timeStr = parts[parts.length - 1];
      if (dateStr?.includes('-') && timeStr?.includes('-')) {
        try {
          const [day, month, year] = dateStr.split('-');
          const [hour, minute, second] = timeStr.split('-');
          return new Date(+year, +month - 1, +day, +hour, +minute, +second).getTime();
        } catch { return 0; }
      }
    }
    return 0;
  };

  const handleBrowseDirectory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/coach/select-data-directory`);
      const data = await res.json();
      if (data.success && data.directoryPath) {
        setDataDirectory(data.directoryPath);
        setError('');
      }
    } catch {
      setError('Could not open directory dialog. Make sure the backend server is running.');
    }
  };

  const handleLoadMatches = async () => {
    if (!dataDirectory.trim()) { setError('Please enter or browse to a directory path'); return; }
    setIsValidating(true);
    hasEnrichedWithRiotId.current = false;
    try {
      await fetch(`${API_BASE_URL}/api/coach/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ data_directory: dataDirectory }),
      });
    } catch { /* non-fatal */ }
    await fetchLocalMatches(dataDirectory);
    setIsValidating(false);
  };

  const handleChangeDirectory = () => {
    setShowDirectoryInput(true);
    setMatches([]);
    setSelectedMatch(null);
    setError('');
    hasEnrichedWithRiotId.current = false;
  };

  const refreshMatches = () => {
    if (dataSource === 'hive') {
      fetchHiveMatches();
    } else if (dataDirectory) {
      hasEnrichedWithRiotId.current = false;
      fetchLocalMatches(dataDirectory);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleMatchClick = (match: Match) => setSelectedMatch(match.filename);

  const handleRecordingAnalysis = () => {
    if (!selectedMatch) return;
    const params = new URLSearchParams();
    params.set('matchId', selectedMatch);
    params.set('match_id', selectedMatch);
    params.set('source', dataSource);
    if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
    navigate(`/coach/valorant-recording-analysis?${params.toString()}`);
  };

  const handleMatchDashboard = () => {
    if (!selectedMatch) return;
    const params = new URLSearchParams();
    params.set('matchId', selectedMatch);
    params.set('match_id', selectedMatch);
    params.set('source', dataSource);
    if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
    navigate(`/coach/valorant-match-dashboard?${params.toString()}`);
  };

  // ── ADDED: navigate to error patterns page ────────────────────────────────
  const handleErrorPatterns = () => {
    const params = new URLSearchParams();
    if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
    params.set('source', dataSource);
    navigate(`/coach/valorant-error-patterns?${params.toString()}`);
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderMatchCard = (match: Match) => {
    const matchData = match.match_data;
    const stats = matchData?.player_stats;

    const parts = match.filename.split('_');
    let displayDate = '', displayTime = '';
    if (parts.length >= 2) {
      const dateStr = parts[parts.length - 2];
      const timeStr = parts[parts.length - 1];
      if (dateStr?.includes('-')) { const [d,mo,y] = dateStr.split('-'); displayDate = `${d}/${mo}/${y}`; }
      if (timeStr?.includes('-')) { const [h,mi] = timeStr.split('-'); displayTime = `${h}:${mi}`; }
    }

    const totalShots = stats ? (stats.headshots||0)+(stats.bodyshots||0)+(stats.legshots||0) : 0;
    const hsPercent  = stats && totalShots > 0 ? Math.round((stats.headshots/totalShots)*100) : null;
    const kdaRatio   = stats
      ? stats.deaths > 0 ? ((stats.kills+stats.assists)/stats.deaths).toFixed(2) : (stats.kills+stats.assists).toFixed(1)
      : null;

    const isSelected = selectedMatch === match.filename;

    return (
      <div
        key={match.filename}
        onClick={() => handleMatchClick(match)}
        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
          isSelected
            ? 'bg-yellow-500/20 border-yellow-500/60 shadow-lg shadow-yellow-500/20'
            : 'bg-gradient-to-br from-gray-900 to-black border-yellow-500/20 hover:border-yellow-500/40'
        }`}
      >
        {match.loading && (
          <div className="flex items-center gap-2 text-yellow-400 text-xs mb-2">
            <div className="animate-spin">⚙️</div><span>Loading match details...</span>
          </div>
        )}

        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {matchData && stats ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30">
                  <span className="text-xl font-black text-red-400">{stats.agent?.substring(0,2).toUpperCase()||'??'}</span>
                </div>
                <div>
                  <h4 className="text-white font-black text-sm mb-0.5">{stats.agent||'Unknown Agent'}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-xs font-bold">{matchData.map}</span>
                    <span className="text-yellow-300/60 text-xs">•</span>
                    <span className="text-yellow-300/60 text-xs font-semibold">{matchData.mode}</span>
                  </div>
                  {displayDate && displayTime && (
                    <span className="text-yellow-300/40 text-[10px] font-semibold mt-1 block">{displayDate} • {displayTime}</span>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h4 className="text-white font-bold mb-1 text-sm">{match.display_name}</h4>
                {displayDate && displayTime
                  ? <p className="text-yellow-300/60 text-xs font-semibold">{displayDate} • {displayTime}</p>
                  : <p className="text-yellow-300/60 text-xs font-semibold">{match.date}</p>
                }
              </>
            )}
          </div>
          {isSelected && (
            <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-black text-xs font-black">✓</span>
            </div>
          )}
        </div>

        {matchData && stats && (
          <div className="grid grid-cols-4 gap-2 my-3 pb-3 border-b border-yellow-500/20">
            {[
              { label:'KDA',   top:`${stats.kills}/${stats.deaths}/${stats.assists}`, bot:`${kdaRatio}:1` },
              { label:'HS%',   top: hsPercent !== null ? `${hsPercent}%` : 'N/A',    bot:`${stats.headshots} HS` },
              { label:'Score', top:`${stats.score||0}`,                               bot:`${matchData.rounds_played}R` },
              { label:'Team',  top: stats.team,                                       bot:`${Math.floor(matchData.game_length/60)}m` },
            ].map(({ label, top, bot }) => (
              <div key={label} className="text-center">
                <p className="text-yellow-300/60 text-[10px] uppercase font-bold mb-1">{label}</p>
                <p className="text-white font-black text-xs">{top}</p>
                <p className="text-yellow-400 text-[10px] font-bold">{bot}</p>
              </div>
            ))}
          </div>
        )}

        {matchData && (
          <div className="mb-3 text-xs text-yellow-300/60 font-semibold">
            {matchData.rounds_played} rounds • {Math.floor(matchData.game_length/60)}m {matchData.game_length%60}s
            {matchData.time_difference_seconds !== undefined && (
              <span className="ml-2 text-[10px]">(±{Math.round(matchData.time_difference_seconds/60)}min)</span>
            )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {match.has_video && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1 font-bold border border-green-500/30">🎥 Video</span>
          )}
          {match.has_merged_data && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded flex items-center gap-1 font-bold border border-yellow-500/30">📊 Data</span>
          )}
          {match.has_emotions && (
            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded flex items-center gap-1 font-bold border border-orange-500/30">😊 Emotions</span>
          )}
          {match.has_gaze && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1 font-bold border border-purple-500/30">👁️ Gaze</span>
          )}
          {matchData && (
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1 font-bold border border-blue-500/30">✓ Matched</span>
          )}
          {!match.has_video && (
            <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded flex items-center gap-1 border border-gray-600/30">⚠️ No Video</span>
          )}
          {stats && hsPercent && hsPercent >= 50 && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1 font-bold border border-purple-500/30">🎯 Headshot King</span>
          )}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
            navigate(`/coach/valorant-dashboard${params.toString() ? `?${params}` : ''}`);
          }}
          className="flex items-center gap-2 text-yellow-300/60 hover:text-yellow-400 mb-4 transition-colors font-bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎯</span>
          <h2 className="text-sm font-bold text-yellow-300/60 uppercase tracking-wider">VALORANT — COACH VIEW</h2>
        </div>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 mb-2">
          Match Recordings
        </h1>
        <p className="text-yellow-300/60 font-semibold">Select a match to analyze or review performance</p>
        {currentRiotId && currentRiotId !== 'Unknown' && (
          <p className="text-yellow-400 mt-2 font-black">Analyzing player: {decodeURIComponent(currentRiotId)}</p>
        )}
        {/*  error patterns shortcut in header */}
        {currentRiotId && currentRiotId !== 'Unknown' && (
          <button
            onClick={handleErrorPatterns}
            className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg font-bold text-sm flex items-center gap-2 w-fit transition-colors"
          >
            📈 View Error Patterns
          </button>
        )}
        {/* ───────────────────────────────────────────────────────────────── */}
      </div>

      {/* ── DATA SOURCE TOGGLE ─────────────────────────────────────────────── */}
      <div className="mb-6 bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-white font-bold text-sm mb-1">Data Source</h3>
            <p className="text-yellow-300/60 text-xs">
              {dataSource === 'hive'
                ? 'Reading files from Hive server (10.4.28.2) — university network required'
                : 'Reading files from local data directory'}
            </p>
          </div>
          <div className="flex items-center bg-gray-900 rounded-lg p-1 gap-1">
            <button
              onClick={() => setDataSource('local')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                dataSource === 'local' ? 'bg-yellow-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
               Local
            </button>
            <button
              onClick={() => setDataSource('hive')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                dataSource === 'hive' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
               Hive Server
            </button>
          </div>
        </div>

        {/* Hive directory stats */}
        {dataSource === 'hive' && hiveStats && (
          <div className="mt-3 pt-3 border-t border-yellow-500/20 flex flex-wrap gap-4">
            {Object.entries(hiveStats).map(([dir, count]) => (
              <div key={dir} className="text-xs">
                <span className="text-yellow-300/60 capitalize">{dir}: </span>
                <span className="text-blue-400 font-bold">{count} files</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status banners */}
      {isMatchingWithAPI && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 flex items-center gap-3">
          <div className="animate-spin text-xl">🔄</div>
          <p className="text-blue-400 font-semibold text-sm">Matching recordings with online match data...</p>
        </div>
      )}
      {matchingError && (
        <div className="mb-4 bg-orange-500/10 border border-orange-500/50 rounded-lg p-3 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <p className="text-orange-400 font-semibold text-sm">{matchingError}</p>
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-red-400 font-bold mb-1">{error}</p>
            {dataSource === 'hive' && (
              <p className="text-red-300 text-sm mt-1 font-semibold">Make sure you are on the university network or VPN.</p>
            )}
            {dataSource === 'local' && (
              <p className="text-red-300 text-sm mt-1 font-semibold">Make sure the directory path is correct and contains Valorant match files.</p>
            )}
          </div>
        </div>
      )}

      {/* ── LOCAL: directory input (only shown for local source) ─────────── */}
      {dataSource === 'local' && showDirectoryInput && (
        <div className="mb-6 bg-gradient-to-br from-gray-950 to-black border-2 border-yellow-500/20 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl">📁</span>
            <div className="flex-1">
              <h3 className="text-yellow-400 font-black mb-1">Select Data Directory</h3>
              <p className="text-yellow-300/70 text-sm font-semibold">Choose the folder containing your match data files</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-yellow-300/60 font-bold text-sm mb-2 uppercase tracking-wider">Data Directory Path</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={dataDirectory}
                  onChange={e => setDataDirectory(e.target.value)}
                  placeholder="C:\Users\Coach\Documents\GameData"
                  className="flex-1 px-4 py-3 bg-gray-900/50 border border-yellow-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/60 font-semibold"
                />
                <button
                  onClick={handleBrowseDirectory}
                  className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg font-bold border border-yellow-500/20 flex items-center gap-2"
                >
                  <span>📂</span> Browse
                </button>
              </div>
            </div>
            <button
              onClick={handleLoadMatches}
              disabled={isValidating || !dataDirectory.trim()}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-lg font-black disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2"
            >
              {isValidating || loading ? <><div className="animate-spin">⚙️</div> Loading...</> : <><span>🎯</span> Load Matches</>}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-center">
            <div className="text-yellow-400 text-xl mb-2 font-bold">Loading matches...</div>
            <div className="text-yellow-300/60 text-sm font-semibold">
              {dataSource === 'hive' ? 'Connecting to Hive server...' : 'Scanning data directory...'}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      {!loading && !(dataSource === 'local' && showDirectoryInput) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Match list */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-950 to-black border-2 border-yellow-500/20 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-black text-lg">Available Matches ({matches.length})</h3>
                  {dataSource === 'hive' && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-bold border border-blue-500/30">HIVE</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {dataSource === 'local' && (
                    <button onClick={handleChangeDirectory} className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1 font-bold">
                      <span>📁</span> Change Directory
                    </button>
                  )}
                  {matches.length > 0 && (
                    <>
                      {dataSource === 'local' && <span className="text-yellow-500/30">|</span>}
                      <button onClick={refreshMatches} className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1 font-bold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                      </button>
                    </>
                  )}
                </div>
              </div>

              {matches.length === 0 && !error ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">{dataSource === 'hive' ? '🖥️' : '📁'}</div>
                  <p className="text-yellow-300/60 mb-2 font-semibold">
                    {dataSource === 'hive' ? 'No Valorant matches found on Hive server' : 'No Valorant matches found'}
                  </p>
                  {dataSource === 'local' && (
                    <button onClick={handleChangeDirectory}
                      className="mt-4 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg font-black shadow-lg shadow-yellow-500/30">
                      Select Different Directory
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {matches.map(renderMatchCard)}
                </div>
              )}
            </div>
          </div>

          {/* Action panel */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
              <h3 className="text-white font-black text-center mb-6">COACH ACTIONS</h3>
              {!selectedMatch ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">👈</div>
                  <p className="text-yellow-300/60 text-sm font-semibold">Select a match to continue</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleRecordingAnalysis}
                    disabled={!matches.find(m => m.filename === selectedMatch)?.has_video}
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-lg font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30"
                  >
                    🎬 Recording Analysis
                  </button>
                  <button
                    onClick={handleMatchDashboard}
                    className="w-full py-3 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-black flex items-center justify-center gap-2 border border-yellow-500/20"
                  >
                    📊 Match Dashboard
                  </button>
                  {/* ADDED: error patterns button in coach actions panel */}
                  <button
                    onClick={handleErrorPatterns}
                    className="w-full py-3 bg-gradient-to-br from-red-900/40 to-red-800/20 hover:from-red-900/60 text-red-400 rounded-lg font-black flex items-center justify-center gap-2 border border-red-500/20 transition-colors"
                  >
                    📈 Error Patterns
                  </button>
                  {/* ──────────────────────────────────────────────────────── */}
                  {!matches.find(m => m.filename === selectedMatch)?.has_video && (
                    <p className="text-yellow-400 text-xs text-center pt-2 font-bold">⚠️ Video file not found for this match</p>
                  )}
                  <div className="pt-4 border-t border-yellow-500/20">
                    <p className="text-yellow-300/60 text-xs text-center break-words font-semibold">
                      {matches.find(m => m.filename === selectedMatch)?.display_name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick info */}
            <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
              <h3 className="text-white font-black mb-4">📋 Quick Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-yellow-300/60 font-semibold">Source:</span>
                  <span className={`font-black ${dataSource === 'hive' ? 'text-blue-400' : 'text-yellow-400'}`}>
                    {dataSource === 'hive' ? ' Hive' : ' Local'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-300/60 font-semibold">Total Matches:</span>
                  <span className="text-white font-black">{matches.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-300/60 font-semibold">With Video:</span>
                  <span className="text-green-400 font-black">{matches.filter(m => m.has_video).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-300/60 font-semibold">With Data:</span>
                  <span className="text-yellow-400 font-black">{matches.filter(m => m.has_merged_data).length}</span>
                </div>
                {dataSource === 'hive' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-yellow-300/60 font-semibold">With Emotions:</span>
                      <span className="text-orange-400 font-black">{matches.filter(m => m.has_emotions).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-300/60 font-semibold">With Gaze:</span>
                      <span className="text-purple-400 font-black">{matches.filter(m => m.has_gaze).length}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-yellow-300/60 font-semibold">Matched:</span>
                  <span className="text-blue-400 font-black">{matches.filter(m => m.match_data).length}</span>
                </div>
              </div>
            </div>

            {/* Directory info (local only) */}
            {dataSource === 'local' && dataDirectory && (
              <div className="bg-gradient-to-br from-gray-900 to-black border border-yellow-500/20 rounded-xl p-4">
                <h4 className="text-yellow-300/60 font-bold text-xs mb-2">📁 Current Directory</h4>
                <p className="text-yellow-300/70 text-xs font-mono break-all">{dataDirectory}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValorantRecordingList;