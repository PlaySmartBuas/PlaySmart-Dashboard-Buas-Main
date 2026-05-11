// import React, { useState, useEffect, useMemo } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import VideoPlayer, { type TimelineMarker } from '../../components/videoplayer';
// import FeedbackCard from '../../components/FeedbackCard';
// import FeedbackCategoryFilter from '../../components/FeedbackCategoryFilter';
// import { getUser } from '../../utils/auth';
// import { API_BASE_URL } from '../../services/api';

// interface FeedbackItem {
//   id: number;
//   riot_id: string;
//   coach_username: string;
//   match_id?: string;
//   timestamp: number;
//   category?: string;
//   error_code?: string;
//   feedback_text: string;
//   game: string;
//   created_at: string;
// }

// interface Teammate {
//   id: string;
//   playerName: string;
// }

// // ── Emotion config (same as player feedback review) ───────────────────────────
// const EMOTION_CONFIG = {
//   Anger:     { icon: '😠', color: '#ef4444' },
//   Disgust:   { icon: '🤢', color: '#84cc16' },
//   Happiness: { icon: '😊', color: '#fbbf24' },
//   Sadness:   { icon: '😢', color: '#3b82f6' },
//   Fear:      { icon: '😨', color: '#a855f7' },
//   Surprise:  { icon: '😲', color: '#f97316' },
//   Neutral:   { icon: '😐', color: '#6b7280' },
// };

// // ── Helper: strip suffixes to get base stem ───────────────────────────────────
// function baseStem(filename: string): string {
//   let s = filename.replace(/\.[^/.]+$/, '');
//   for (const suffix of ['_merged', '_emotion', '_gaze', '_input']) {
//     if (s.endsWith(suffix)) { s = s.slice(0, -suffix.length); break; }
//   }
//   return s;
// }

// // ─────────────────────────────────────────────────────────────────────────────

// const CoachValorantRecordingAnalysis: React.FC = () => {
//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();
//   const user = getUser();

//   // ── Identity ──────────────────────────────────────────────────────────────
//   const riotIdFromUrl  = searchParams.get('user');
//   const riotId = riotIdFromUrl ||
//     sessionStorage.getItem('current_valorant_riot_id') ||
//     sessionStorage.getItem('riotId') || '';
//   const coachUsername  = user?.username || sessionStorage.getItem('username') || '';

//   // ── Source + match ────────────────────────────────────────────────────────
//   const dataSource  = (searchParams.get('source') || 'local') as 'local' | 'hive';
//   const matchId     = searchParams.get('matchId') || searchParams.get('match_id') || '';
//   const stem        = baseStem(matchId);

//   // ── Feedback state ────────────────────────────────────────────────────────
//   const [feedbackText,          setFeedbackText]          = useState('');
//   const [category,              setCategory]              = useState('');
//   const [errorCode,             setErrorCode]             = useState('');
//   const [confidence,            setConfidence]            = useState(0.85);
//   const [feedbackList,          setFeedbackList]          = useState<FeedbackItem[]>([]);
//   const [selectedCategories,    setSelectedCategories]    = useState<string[]>([]);
//   const [showCategoriesInline,  setShowCategoriesInline]  = useState(false);
//   const [currentVideoTime,      setCurrentVideoTime]      = useState(0);
//   const [showTeammatesSection,  setShowTeammatesSection]  = useState(false);
//   const [showCategoriesModal,   setShowCategoriesModal]   = useState(false);

//   // ── Video URL + emotion markers ───────────────────────────────────────────
//   const [videoUrl,        setVideoUrl]        = useState('');
//   const [emotionMarkers,  setEmotionMarkers]  = useState<TimelineMarker[]>([]);
//   const [emotionError,    setEmotionError]    = useState('');

//   const dataDirectory = localStorage.getItem('toolkit_data_directory') || '';

//   const teammates: Teammate[] = [
//     { id: '2', playerName: 'Teammate 2' },
//     { id: '3', playerName: 'Teammate 3' },
//     { id: '4', playerName: 'Teammate 4' },
//     { id: '5', playerName: 'Teammate 5' },
//   ];

//   // ── Error codes ───────────────────────────────────────────────────────────
//   const errorCodesByCategory: Record<string, { value: string; label: string }[]> = useMemo(() => ({
//     mechanical: [
//       { value: 'mech_aim',      label: 'Aim / Crosshair placement' },
//       { value: 'mech_tracking', label: 'Tracking / Target control' },
//     ],
//     positioning: [
//       { value: 'pos_overextension', label: 'Overextension / Poor spacing' },
//       { value: 'pos_angle',         label: 'Angle exposure / Peek mistakes' },
//     ],
//     communication: [
//       { value: 'comm_missing_callouts', label: 'Missing callouts' },
//       { value: 'comm_timing',           label: 'Poor timing / late info' },
//     ],
//     mental: [
//       { value: 'mental_tilt',      label: 'Tilt / emotional loss of control' },
//       { value: 'mental_autopilot', label: 'Autopilot / passive play' },
//     ],
//     decision_making: [
//       { value: 'macro_rotations',  label: 'Rotation timing / objectives' },
//       { value: 'macro_priorities', label: 'Objective prioritisation' },
//     ],
//   }), []);

//   const availableErrorCodes = category ? errorCodesByCategory[category] || [] : [];

//   const formatCategoryName = (cat: string) =>
//     cat ? cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

//   const getErrorLabel = (cat: string, val: string) => {
//     if (!cat || !val) return '';
//     const found = (errorCodesByCategory[cat] || []).find(it => it.value === val);
//     return found ? found.label : val;
//   };

//   // ── Build video URL based on source ──────────────────────────────────────
//   useEffect(() => {
//     if (!matchId) return;

//     if (dataSource === 'hive') {
//       setVideoUrl(`${API_BASE_URL}/api/hive/video/${encodeURIComponent(matchId)}`);
//     } else {
//       const buildLocalUrl = async () => {
//         let dirPath = dataDirectory;
//         if (!dirPath) {
//           try {
//             const res = await fetch(`${API_BASE_URL}/api/coach/config`, {
//               headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
//             });
//             if (res.ok) {
//               const config = await res.json();
//               dirPath = config.data_directory || '';
//             }
//           } catch { /* use empty */ }
//         }
//         let url = `http://localhost:8000/api/videos/${encodeURIComponent(matchId)}.mp4`;
//         if (dirPath) url += `?data_directory=${encodeURIComponent(dirPath)}`;
//         setVideoUrl(url);
//       };
//       buildLocalUrl();
//     }
//   }, [matchId, dataSource]);

//   // ── Fetch emotion markers ─────────────────────────────────────────────────
//   useEffect(() => {
//     if (!matchId) return;

//     const fetchEmotionMarkers = async () => {
//       setEmotionError('');
//       try {
//         let url: string;

//         if (dataSource === 'hive') {
//           url = `${API_BASE_URL}/api/analytics/emotion-markers/hive?stem=${encodeURIComponent(stem)}`;
//         } else {
//           let dirPath = dataDirectory;
//           if (!dirPath) {
//             try {
//               const res = await fetch(`${API_BASE_URL}/api/coach/config`, {
//                 headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
//               });
//               if (res.ok) {
//                 const config = await res.json();
//                 dirPath = config.data_directory || '';
//               }
//             } catch { /* use empty */ }
//           }
//           if (!dirPath) return;
//           const filePath = `${dirPath}/merged/${stem}_merged.csv`;
//           url = `${API_BASE_URL}/api/analytics/emotion-markers/local?file_path=${encodeURIComponent(filePath)}`;
//         }

//         const res = await fetch(url);
//         if (!res.ok) return;

//         const data = await res.json();
//         const enriched: TimelineMarker[] = (data.markers || []).map((m: any) => ({
//           ...m,
//           icon: EMOTION_CONFIG[m.emotion as keyof typeof EMOTION_CONFIG]?.icon || '❓',
//         }));
//         setEmotionMarkers(enriched);
//       } catch (err) {
//         console.error('Emotion markers fetch failed:', err);
//         setEmotionError('Could not load emotion markers');
//       }
//     };

//     fetchEmotionMarkers();
//   }, [matchId, dataSource]);

//   // ── Feedback fetch ────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (riotId) {
//       fetchFeedback();
//     } else {
//       alert('Riot ID not found in session. Please enter it in the game selection page.');
//       navigate('/coach/gameselection');
//     }
//   }, [riotId]);

//   // ── Video time tracking ───────────────────────────────────────────────────
//   useEffect(() => {
//     const videoElement = document.querySelector('video');
//     if (!videoElement) return;

//     const handleTimeUpdate = () => setCurrentVideoTime(videoElement.currentTime);
//     videoElement.addEventListener('timeupdate', handleTimeUpdate);

//     const handleMessage = (event: MessageEvent) => {
//       if (event.data.type === 'REQUEST_VIDEO_TIME') {
//         const v = document.querySelector('video');
//         if (v) event.source?.postMessage({ type: 'SYNC_VIDEO_TIME', time: v.currentTime }, '*' as any);
//       }
//     };
//     window.addEventListener('message', handleMessage);

//     return () => {
//       videoElement.removeEventListener('timeupdate', handleTimeUpdate);
//       window.removeEventListener('message', handleMessage);
//     };
//   }, []);

//   const fetchFeedback = async () => {
//     try {
//       const res = await fetch(
//         `${API_BASE_URL}/api/feedback/${encodeURIComponent(riotId)}/valorant${matchId ? `?match_id=${encodeURIComponent(matchId)}` : ''}`
//       );
//       if (res.ok) setFeedbackList(await res.json());
//     } catch (e) { console.error('Error fetching feedback:', e); }
//   };

//   const formatTime = (seconds: number) =>
//     `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

//   // ── Feedback submit ───────────────────────────────────────────────────────
//   const handleSubmitFeedback = async () => {
//     if (!feedbackText.trim()) { alert('Please enter feedback text'); return; }
//     if (!category)            { alert('Please select a category'); return; }
//     if (!errorCode)           { alert('Please select an error type'); return; }
//     if (!riotId)              { alert('Riot ID not found.'); navigate('/coach/gameselection'); return; }

//     try {
//       const res = await fetch(`${API_BASE_URL}/api/feedback`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           riot_id: riotId,
//           coach_username: coachUsername,
//           match_id: matchId,
//           timestamp: Math.floor(currentVideoTime),
//           category,
//           error_code: errorCode,
//           feedback_text: feedbackText,
//           game: 'valorant',
//         }),
//       });
//       if (res.ok) {
//         alert('Feedback submitted successfully!');
//         setFeedbackText('');
//         setCategory('');
//         setErrorCode('');
//         fetchFeedback();
//       } else {
//         const err = await res.json();
//         alert(`Failed to submit feedback: ${err.detail || 'Unknown error'}`);
//       }
//     } catch { alert('Error submitting feedback'); }
//   };

//   // ── Feedback delete ───────────────────────────────────────────────────────
//   const handleDeleteFeedback = async (feedbackId: number) => {
//     if (!confirm('Are you sure you want to delete this feedback?')) return;
//     try {
//       const res = await fetch(`${API_BASE_URL}/api/feedback/${feedbackId}`, { method: 'DELETE' });
//       if (res.ok) { alert('Feedback deleted successfully!'); fetchFeedback(); }
//       else alert('Failed to delete feedback');
//     } catch { alert('Error deleting feedback'); }
//   };

//   // ── Teammate popup ────────────────────────────────────────────────────────
//   const handleOpenTeammateVideo = (playerName: string) => {
//     const tVideoUrl = '/videos/sampleVidShort.mp4';
//     const htmlContent = `<!DOCTYPE html><html><head><title>${playerName} Gameplay</title>
//     <style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#111827;font-family:sans-serif;color:white}h1{margin:0 0 8px;font-size:30px;font-weight:bold}video{width:100%;border-radius:8px;background:#000;display:block}.btn{padding:8px 16px;border:none;border-radius:6px;font-weight:600;font-size:14px;cursor:pointer;background:#3B82F6;color:white}</style>
//     </head><body><h1>${playerName}'s Gameplay</h1>
//     <video id="v" controls><source src="${tVideoUrl}" type="video/mp4"></video>
//     <br/><br/><button class="btn" onclick="sync()">🔄 Sync with Main</button>
//     <script>
//     function sync(){if(window.opener&&!window.opener.closed){window.opener.postMessage({type:'REQUEST_VIDEO_TIME'},'*')}else{alert('Main window not available')}}
//     window.addEventListener('message',e=>{if(e.data.type==='SYNC_VIDEO_TIME'){document.getElementById('v').currentTime=e.data.time;document.getElementById('v').play()}})
//     </script></body></html>`;
//     const w = window.open('', '_blank', 'width=1200,height=800');
//     if (w) { w.document.write(htmlContent); w.document.close(); }
//     else alert('Please allow pop-ups to view teammate gameplay');
//   };

//   // ── Filtered feedback list ────────────────────────────────────────────────
//   const filteredFeedbackList = useMemo(() => {
//     if (selectedCategories.length === 0) return feedbackList;
//     return feedbackList.filter(f => f.category && selectedCategories.includes(f.category));
//   }, [feedbackList, selectedCategories]);

//   // ── Timeline markers ──────────────────────────────────────────────────────
//   const timelineMarkers: TimelineMarker[] = useMemo(() => {
//     const feedbackMarkers: TimelineMarker[] = filteredFeedbackList.map(f => ({
//       id:        f.id.toString(),
//       timestamp: f.timestamp,
//       icon:      '💬',
//       label:     `${f.coach_username}: ${f.feedback_text.substring(0, 30)}${f.feedback_text.length > 30 ? '...' : ''}`,
//     }));
//     return [...feedbackMarkers, ...emotionMarkers].sort((a, b) => a.timestamp - b.timestamp);
//   }, [filteredFeedbackList, emotionMarkers]);

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="p-6">
//       <div className="mb-8">
//         <button
//           onClick={() => {
//             const params = new URLSearchParams();
//             if (riotId) params.set('user', riotId);
//             navigate(`/coach/valorant-recordinganalysis${params.toString() ? `?${params}` : ''}`);
//           }}
//           className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//           </svg>
//           Back to Match List
//         </button>

//         <div className="flex items-center gap-3 mb-2">
//           <h2 className="text-3xl font-bold text-white">Valorant Recording Analysis</h2>
//           <span className={`px-3 py-1 rounded-full text-xs font-black ${
//             dataSource === 'hive'
//               ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
//               : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
//           }`}>
//             {dataSource === 'hive' ? '🖥️ Hive Server' : '💻 Local'}
//           </span>
//         </div>

//         <p className="text-gray-400">
//           Review gameplay recordings and provide detailed feedback for {riotId || 'Unknown Player'}
//         </p>

//         {emotionError && (
//           <p className="text-orange-400 text-sm mt-2">⚠️ {emotionError} — video and feedback still work normally.</p>
//         )}
//         {emotionMarkers.length > 0 && (
//           <p className="text-green-400 text-sm mt-1">
//             ✅ {emotionMarkers.length} emotion markers loaded on timeline
//           </p>
//         )}

//         <div className="mt-3 flex items-center gap-3">
//           <button
//             onClick={() => setShowCategoriesModal(true)}
//             className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-semibold text-sm"
//           >
//             Categories & Error Codes
//           </button>
//           <span className="text-gray-400 text-sm">Quick guide to help pick a category when adding feedback</span>
//         </div>
//       </div>

//       {/* Video Player */}
//       <div className="mb-6">
//         <VideoPlayer videoUrl={videoUrl} markers={timelineMarkers} />
//       </div>

//       {/* Categories modal */}
//       {showCategoriesModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center">
//           <div className="absolute inset-0 bg-black/70" onClick={() => setShowCategoriesModal(false)} />
//           <div className="relative max-w-3xl w-full mx-4 bg-gray-900 rounded-lg p-6 border border-yellow-500/20 shadow-lg text-gray-100">
//             <div className="flex items-start justify-between mb-4">
//               <h3 className="text-xl font-bold">Feedback categories & example error codes</h3>
//               <button onClick={() => setShowCategoriesModal(false)} className="text-gray-300 hover:text-white">✕</button>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {Object.entries(errorCodesByCategory).map(([cat, codes]) => (
//                 <div key={cat} className="bg-gray-800 p-3 rounded border border-gray-700">
//                   <h4 className="text-yellow-300 font-semibold mb-2">{cat}</h4>
//                   <ul className="text-sm space-y-1">
//                     {codes.map((c: any) => (
//                       <li key={c.value} className="flex items-start gap-2">
//                         <span className="text-xs text-gray-400">•</span>
//                         <div>
//                           <div className="font-medium text-gray-100">{c.label}</div>
//                           <div className="text-xs text-gray-400">{c.value}</div>
//                         </div>
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               ))}
//             </div>
//             <div className="mt-4 text-sm text-gray-400">
//               Tip: choose the category that best matches the player's behavioural issue. Use specific error codes when possible to make feedback actionable.
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Teammates section */}
//       <div className="bg-gray-800 rounded-lg p-6 mb-6">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-xl font-bold text-white">Teammates' Gameplay</h3>
//           <button
//             onClick={() => setShowTeammatesSection(!showTeammatesSection)}
//             className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
//             </svg>
//             {showTeammatesSection ? 'Hide Teammates' : 'View Teammates'}
//           </button>
//         </div>
//         {showTeammatesSection && (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             {teammates.map(t => (
//               <div key={t.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <h4 className="text-white font-semibold">{t.playerName}</h4>
//                     <p className="text-gray-400 text-sm">View gameplay recording</p>
//                   </div>
//                   <button onClick={() => handleOpenTeammateVideo(t.playerName)}
//                     className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold">
//                     View Gameplay
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Feedback Form — always visible, matching LoL structure */}
//       <div className="bg-gray-800 rounded-lg p-6 mb-6">
//         <div className="mb-6 bg-gray-900/50 rounded-xl p-6 border border-gray-700">
//           <div className="flex items-center justify-between mb-6">
//             <div className="flex items-center gap-4">
//               <h3 className="text-xl font-bold text-blue-400">+ ADD ANNOTATION</h3>
//               <button
//                 onClick={() => setShowCategoriesInline(!showCategoriesInline)}
//                 className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold text-sm"
//               >
//                 Categories & Error Codes
//               </button>
//             </div>
//             <div className="text-gray-300 text-sm">
//               Current Time: <span className="font-bold text-blue-400">{formatTime(currentVideoTime)}</span>
//             </div>
//           </div>

//           <div className="space-y-4">
//             {/* Inline categories panel */}
//             {showCategoriesInline && (
//               <div className="mt-3 bg-gray-800 rounded-lg p-3 border border-gray-700 max-h-64 overflow-auto">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                   {Object.entries(errorCodesByCategory).map(([cat, codes]) => (
//                     <div key={cat} className="p-2">
//                       <h4 className="text-yellow-300 font-semibold mb-2">{cat}</h4>
//                       <ul className="text-sm space-y-1">
//                         {codes.map(c => (
//                           <li key={c.value} className="flex items-center justify-between">
//                             <div>
//                               <div className="font-medium text-gray-100">{c.label}</div>
//                               <div className="text-xs text-gray-400">{c.value}</div>
//                             </div>
//                             <button
//                               onClick={() => {
//                                 setCategory(cat);
//                                 setErrorCode(c.value);
//                                 setShowCategoriesInline(false);
//                               }}
//                               className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold"
//                             >
//                               Use
//                             </button>
//                           </li>
//                         ))}
//                       </ul>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Selected category + error code summary */}
//             {(category || errorCode) && (
//               <div className="bg-gray-900 rounded p-3 border border-gray-700 text-sm text-gray-200">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <div className="text-gray-400 text-xs">Selected Category</div>
//                     <div className="font-medium text-white">{formatCategoryName(category)}</div>
//                     <div className="text-gray-400 text-xs mt-2">Selected Error Code</div>
//                     <div className="text-sm text-white">{getErrorLabel(category, errorCode) || errorCode}</div>
//                   </div>
//                   <button
//                     onClick={() => { setCategory(''); setErrorCode(''); }}
//                     className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
//                   >
//                     Clear
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* Comment textarea */}
//             <div>
//               <label className="block text-sm font-medium text-gray-400 mb-2">
//                 Comment (coaching feedback)
//               </label>
//               <textarea
//                 value={feedbackText}
//                 onChange={e => setFeedbackText(e.target.value)}
//                 placeholder="What happened? What should the player do instead?"
//                 className="w-full p-4 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all"
//                 rows={4}
//               />
//             </div>

//             {/* Confidence slider */}
//             <div>
//               <label className="block text-sm font-medium text-gray-400 mb-2">
//                 Confidence: {confidence.toFixed(2)}
//               </label>
//               <input
//                 type="range"
//                 min="0" max="1" step="0.01"
//                 value={confidence}
//                 onChange={e => setConfidence(parseFloat(e.target.value))}
//                 className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
//                 style={{
//                   background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${confidence * 100}%, #374151 ${confidence * 100}%, #374151 100%)`
//                 }}
//               />
//             </div>

//             {/* Submit button */}
//             <button
//               onClick={handleSubmitFeedback}
//               className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
//             >
//               ADD AT {formatTime(currentVideoTime)}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Feedback list */}
//       <div className="bg-gray-800 rounded-lg p-6">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-2xl font-bold text-white">
//             Annotations ({filteredFeedbackList.length}{selectedCategories.length > 0 && ` of ${feedbackList.length}`})
//           </h3>
//           {feedbackList.length > 0 && (
//             <FeedbackCategoryFilter
//               selectedCategories={selectedCategories}
//               onCategoriesChange={setSelectedCategories}
//             />
//           )}
//         </div>
//         {feedbackList.length === 0 ? (
//           <p className="text-gray-400">No annotations added yet. Add your first annotation above!</p>
//         ) : filteredFeedbackList.length === 0 ? (
//           <p className="text-gray-400">No annotations match the selected category filters.</p>
//         ) : (
//           <div className="space-y-4">
//             {filteredFeedbackList.map(f => (
//               <FeedbackCard
//                 key={f.id}
//                 feedback={f}
//                 formatTime={formatTime}
//                 onClick={() => {
//                   const videoElement = document.querySelector('video');
//                   if (videoElement) {
//                     videoElement.currentTime = f.timestamp;
//                     videoElement.play();
//                   }
//                 }}
//                 onDelete={() => handleDeleteFeedback(f.id)}
//                 canDelete={f.coach_username === coachUsername}
//               />
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CoachValorantRecordingAnalysis;


import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import VideoPlayer, { type TimelineMarker } from '../../components/videoplayer';
import FeedbackCard from '../../components/FeedbackCard';
import FeedbackCategoryFilter from '../../components/FeedbackCategoryFilter';
import { getUser } from '../../utils/auth';
import { API_BASE_URL } from '../../services/api';

interface FeedbackItem {
  id: number;
  riot_id: string;
  coach_username: string;
  match_id?: string;
  timestamp: number;
  category?: string;
  error_code?: string;
  feedback_text: string;
  game: string;
  created_at: string;
}

interface Teammate {
  id: string;
  playerName: string;
}

// ── Emotion config (same as player feedback review) ───────────────────────────
const EMOTION_CONFIG = {
  Anger:     { icon: '😠', color: '#ef4444' },
  Disgust:   { icon: '🤢', color: '#84cc16' },
  Happiness: { icon: '😊', color: '#fbbf24' },
  Sadness:   { icon: '😢', color: '#3b82f6' },
  Fear:      { icon: '😨', color: '#a855f7' },
  Surprise:  { icon: '😲', color: '#f97316' },
  Neutral:   { icon: '😐', color: '#6b7280' },
};

// ── Helper: strip suffixes to get base stem ───────────────────────────────────
function baseStem(filename: string): string {
  let s = filename.replace(/\.[^/.]+$/, '');
  for (const suffix of ['_merged', '_emotion', '_gaze', '_input']) {
    if (s.endsWith(suffix)) { s = s.slice(0, -suffix.length); break; }
  }
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────

const CoachValorantRecordingAnalysis: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = getUser();

  // ── Identity ──────────────────────────────────────────────────────────────
  const riotIdFromUrl  = searchParams.get('user');
  const riotId = riotIdFromUrl ||
    sessionStorage.getItem('current_valorant_riot_id') ||
    sessionStorage.getItem('riotId') || '';
  const coachUsername  = user?.username || sessionStorage.getItem('username') || '';

  // ── Source + match ────────────────────────────────────────────────────────
  const dataSource  = (searchParams.get('source') || 'local') as 'local' | 'hive';
  const matchId     = searchParams.get('matchId') || searchParams.get('match_id') || '';
  const stem        = baseStem(matchId);

  // ── ADDED: detect if navigated from patterns page ─────────────────────────
  const fromPatterns = searchParams.get('from') === 'patterns';
  // ─────────────────────────────────────────────────────────────────────────

  // ── Feedback state ────────────────────────────────────────────────────────
  const [feedbackText,          setFeedbackText]          = useState('');
  const [category,              setCategory]              = useState('');
  const [errorCode,             setErrorCode]             = useState('');
  const [confidence,            setConfidence]            = useState(0.85);
  const [feedbackList,          setFeedbackList]          = useState<FeedbackItem[]>([]);
  const [selectedCategories,    setSelectedCategories]    = useState<string[]>([]);
  const [showCategoriesInline,  setShowCategoriesInline]  = useState(false);
  const [currentVideoTime,      setCurrentVideoTime]      = useState(0);
  const [showTeammatesSection,  setShowTeammatesSection]  = useState(false);
  const [showCategoriesModal,   setShowCategoriesModal]   = useState(false);

  // ── Video URL + emotion markers ───────────────────────────────────────────
  const [videoUrl,        setVideoUrl]        = useState('');
  const [emotionMarkers,  setEmotionMarkers]  = useState<TimelineMarker[]>([]);
  const [emotionError,    setEmotionError]    = useState('');

  const dataDirectory = localStorage.getItem('toolkit_data_directory') || '';

  const teammates: Teammate[] = [
    { id: '2', playerName: 'Teammate 2' },
    { id: '3', playerName: 'Teammate 3' },
    { id: '4', playerName: 'Teammate 4' },
    { id: '5', playerName: 'Teammate 5' },
  ];

  // ── Error codes ───────────────────────────────────────────────────────────
  const errorCodesByCategory: Record<string, { value: string; label: string }[]> = useMemo(() => ({
    mechanical: [
      { value: 'mech_aim',      label: 'Aim / Crosshair placement' },
      { value: 'mech_tracking', label: 'Tracking / Target control' },
    ],
    positioning: [
      { value: 'pos_overextension', label: 'Overextension / Poor spacing' },
      { value: 'pos_angle',         label: 'Angle exposure / Peek mistakes' },
    ],
    communication: [
      { value: 'comm_missing_callouts', label: 'Missing callouts' },
      { value: 'comm_timing',           label: 'Poor timing / late info' },
    ],
    mental: [
      { value: 'mental_tilt',      label: 'Tilt / emotional loss of control' },
      { value: 'mental_autopilot', label: 'Autopilot / passive play' },
    ],
    decision_making: [
      { value: 'macro_rotations',  label: 'Rotation timing / objectives' },
      { value: 'macro_priorities', label: 'Objective prioritisation' },
    ],
  }), []);

  const availableErrorCodes = category ? errorCodesByCategory[category] || [] : [];

  const formatCategoryName = (cat: string) =>
    cat ? cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

  const getErrorLabel = (cat: string, val: string) => {
    if (!cat || !val) return '';
    const found = (errorCodesByCategory[cat] || []).find(it => it.value === val);
    return found ? found.label : val;
  };

  // ── Build video URL based on source ──────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;

    if (dataSource === 'hive') {
      setVideoUrl(`${API_BASE_URL}/api/hive/video/${encodeURIComponent(matchId)}`);
    } else {
      const buildLocalUrl = async () => {
        let dirPath = dataDirectory;
        if (!dirPath) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/coach/config`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.ok) {
              const config = await res.json();
              dirPath = config.data_directory || '';
            }
          } catch { /* use empty */ }
        }
        let url = `http://localhost:8000/api/videos/${encodeURIComponent(matchId)}.mp4`;
        if (dirPath) url += `?data_directory=${encodeURIComponent(dirPath)}`;
        setVideoUrl(url);
      };
      buildLocalUrl();
    }
  }, [matchId, dataSource]);

  // ── ADDED: seek video to timestamp from URL param (t) after video loads ───
  useEffect(() => {
    const t = searchParams.get('t');
    if (!t || !videoUrl) return;
    const timer = setTimeout(() => {
      const videoEl = document.querySelector('video');
      if (videoEl) videoEl.currentTime = parseFloat(t);
    }, 800); // wait for video element to mount
    return () => clearTimeout(timer);
  }, [videoUrl]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Fetch emotion markers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;

    const fetchEmotionMarkers = async () => {
      setEmotionError('');
      try {
        let url: string;

        if (dataSource === 'hive') {
          url = `${API_BASE_URL}/api/analytics/emotion-markers/hive?stem=${encodeURIComponent(stem)}`;
        } else {
          let dirPath = dataDirectory;
          if (!dirPath) {
            try {
              const res = await fetch(`${API_BASE_URL}/api/coach/config`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              });
              if (res.ok) {
                const config = await res.json();
                dirPath = config.data_directory || '';
              }
            } catch { /* use empty */ }
          }
          if (!dirPath) return;
          const filePath = `${dirPath}/merged/${stem}_merged.csv`;
          url = `${API_BASE_URL}/api/analytics/emotion-markers/local?file_path=${encodeURIComponent(filePath)}`;
        }

        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        const enriched: TimelineMarker[] = (data.markers || []).map((m: any) => ({
          ...m,
          icon: EMOTION_CONFIG[m.emotion as keyof typeof EMOTION_CONFIG]?.icon || '❓',
        }));
        setEmotionMarkers(enriched);
      } catch (err) {
        console.error('Emotion markers fetch failed:', err);
        setEmotionError('Could not load emotion markers');
      }
    };

    fetchEmotionMarkers();
  }, [matchId, dataSource]);

  // ── Feedback fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (riotId) {
      fetchFeedback();
    } else {
      alert('Riot ID not found in session. Please enter it in the game selection page.');
      navigate('/coach/gameselection');
    }
  }, [riotId]);

  // ── Video time tracking ───────────────────────────────────────────────────
  useEffect(() => {
    const videoElement = document.querySelector('video');
    if (!videoElement) return;

    const handleTimeUpdate = () => setCurrentVideoTime(videoElement.currentTime);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'REQUEST_VIDEO_TIME') {
        const v = document.querySelector('video');
        if (v) event.source?.postMessage({ type: 'SYNC_VIDEO_TIME', time: v.currentTime }, '*' as any);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const fetchFeedback = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/feedback/${encodeURIComponent(riotId)}/valorant${matchId ? `?match_id=${encodeURIComponent(matchId)}` : ''}`
      );
      if (res.ok) setFeedbackList(await res.json());
    } catch (e) { console.error('Error fetching feedback:', e); }
  };

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  // ── Feedback submit ───────────────────────────────────────────────────────
  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) { alert('Please enter feedback text'); return; }
    if (!category)            { alert('Please select a category'); return; }
    if (!errorCode)           { alert('Please select an error type'); return; }
    if (!riotId)              { alert('Riot ID not found.'); navigate('/coach/gameselection'); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riot_id: riotId,
          coach_username: coachUsername,
          match_id: matchId,
          timestamp: Math.floor(currentVideoTime),
          category,
          error_code: errorCode,
          feedback_text: feedbackText,
          game: 'valorant',
        }),
      });
      if (res.ok) {
        alert('Feedback submitted successfully!');
        setFeedbackText('');
        setCategory('');
        setErrorCode('');
        fetchFeedback();
      } else {
        const err = await res.json();
        alert(`Failed to submit feedback: ${err.detail || 'Unknown error'}`);
      }
    } catch { alert('Error submitting feedback'); }
  };

  // ── Feedback delete ───────────────────────────────────────────────────────
  const handleDeleteFeedback = async (feedbackId: number) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback/${feedbackId}`, { method: 'DELETE' });
      if (res.ok) { alert('Feedback deleted successfully!'); fetchFeedback(); }
      else alert('Failed to delete feedback');
    } catch { alert('Error deleting feedback'); }
  };

  // ── Teammate popup ────────────────────────────────────────────────────────
  const handleOpenTeammateVideo = (playerName: string) => {
    const tVideoUrl = '/videos/sampleVidShort.mp4';
    const htmlContent = `<!DOCTYPE html><html><head><title>${playerName} Gameplay</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#111827;font-family:sans-serif;color:white}h1{margin:0 0 8px;font-size:30px;font-weight:bold}video{width:100%;border-radius:8px;background:#000;display:block}.btn{padding:8px 16px;border:none;border-radius:6px;font-weight:600;font-size:14px;cursor:pointer;background:#3B82F6;color:white}</style>
    </head><body><h1>${playerName}'s Gameplay</h1>
    <video id="v" controls><source src="${tVideoUrl}" type="video/mp4"></video>
    <br/><br/><button class="btn" onclick="sync()">🔄 Sync with Main</button>
    <script>
    function sync(){if(window.opener&&!window.opener.closed){window.opener.postMessage({type:'REQUEST_VIDEO_TIME'},'*')}else{alert('Main window not available')}}
    window.addEventListener('message',e=>{if(e.data.type==='SYNC_VIDEO_TIME'){document.getElementById('v').currentTime=e.data.time;document.getElementById('v').play()}})
    </script></body></html>`;
    const w = window.open('', '_blank', 'width=1200,height=800');
    if (w) { w.document.write(htmlContent); w.document.close(); }
    else alert('Please allow pop-ups to view teammate gameplay');
  };

  // ── Filtered feedback list ────────────────────────────────────────────────
  const filteredFeedbackList = useMemo(() => {
    if (selectedCategories.length === 0) return feedbackList;
    return feedbackList.filter(f => f.category && selectedCategories.includes(f.category));
  }, [feedbackList, selectedCategories]);

  // ── Timeline markers ──────────────────────────────────────────────────────
  const timelineMarkers: TimelineMarker[] = useMemo(() => {
    const feedbackMarkers: TimelineMarker[] = filteredFeedbackList.map(f => ({
      id:        f.id.toString(),
      timestamp: f.timestamp,
      icon:      '💬',
      label:     `${f.coach_username}: ${f.feedback_text.substring(0, 30)}${f.feedback_text.length > 30 ? '...' : ''}`,
    }));
    return [...feedbackMarkers, ...emotionMarkers].sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredFeedbackList, emotionMarkers]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <div className="mb-8">
        {/* ADDED: back button navigates to patterns page if from=patterns, else match list */}
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (riotId) params.set('user', riotId);
            if (fromPatterns) {
              params.set('source', dataSource);
              navigate(`/coach/valorant-error-patterns?${params.toString()}`);
            } else {
              navigate(`/coach/valorant-recordinganalysis${params.toString() ? `?${params}` : ''}`);
            }
          }}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {/* ADDED: label changes based on where coach came from */}
          {fromPatterns ? 'Back to Error Patterns' : 'Back to Match List'}
        </button>
        {/* ───────────────────────────────────────────────────────────────── */}

        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-3xl font-bold text-white">Valorant Recording Analysis</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-black ${
            dataSource === 'hive'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}>
            {dataSource === 'hive' ? '🖥️ Hive Server' : '💻 Local'}
          </span>
        </div>

        <p className="text-gray-400">
          Review gameplay recordings and provide detailed feedback for {riotId || 'Unknown Player'}
        </p>

        {emotionError && (
          <p className="text-orange-400 text-sm mt-2">⚠️ {emotionError} — video and feedback still work normally.</p>
        )}
        {emotionMarkers.length > 0 && (
          <p className="text-green-400 text-sm mt-1">
            ✅ {emotionMarkers.length} emotion markers loaded on timeline
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setShowCategoriesModal(true)}
            className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-semibold text-sm"
          >
            Categories & Error Codes
          </button>
          <span className="text-gray-400 text-sm">Quick guide to help pick a category when adding feedback</span>
        </div>
      </div>

      {/* Video Player */}
      <div className="mb-6">
        <VideoPlayer videoUrl={videoUrl} markers={timelineMarkers} />
      </div>

      {/* Categories modal */}
      {showCategoriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCategoriesModal(false)} />
          <div className="relative max-w-3xl w-full mx-4 bg-gray-900 rounded-lg p-6 border border-yellow-500/20 shadow-lg text-gray-100">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">Feedback categories & example error codes</h3>
              <button onClick={() => setShowCategoriesModal(false)} className="text-gray-300 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(errorCodesByCategory).map(([cat, codes]) => (
                <div key={cat} className="bg-gray-800 p-3 rounded border border-gray-700">
                  <h4 className="text-yellow-300 font-semibold mb-2">{cat}</h4>
                  <ul className="text-sm space-y-1">
                    {codes.map((c: any) => (
                      <li key={c.value} className="flex items-start gap-2">
                        <span className="text-xs text-gray-400">•</span>
                        <div>
                          <div className="font-medium text-gray-100">{c.label}</div>
                          <div className="text-xs text-gray-400">{c.value}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Tip: choose the category that best matches the player's behavioural issue. Use specific error codes when possible to make feedback actionable.
            </div>
          </div>
        </div>
      )}

      {/* Teammates section */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Teammates' Gameplay</h3>
          <button
            onClick={() => setShowTeammatesSection(!showTeammatesSection)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {showTeammatesSection ? 'Hide Teammates' : 'View Teammates'}
          </button>
        </div>
        {showTeammatesSection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teammates.map(t => (
              <div key={t.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold">{t.playerName}</h4>
                    <p className="text-gray-400 text-sm">View gameplay recording</p>
                  </div>
                  <button onClick={() => handleOpenTeammateVideo(t.playerName)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold">
                    View Gameplay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Form — always visible, matching LoL structure */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="mb-6 bg-gray-900/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold text-blue-400">+ ADD ANNOTATION</h3>
              <button
                onClick={() => setShowCategoriesInline(!showCategoriesInline)}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold text-sm"
              >
                Categories & Error Codes
              </button>
            </div>
            <div className="text-gray-300 text-sm">
              Current Time: <span className="font-bold text-blue-400">{formatTime(currentVideoTime)}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Inline categories panel */}
            {showCategoriesInline && (
              <div className="mt-3 bg-gray-800 rounded-lg p-3 border border-gray-700 max-h-64 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(errorCodesByCategory).map(([cat, codes]) => (
                    <div key={cat} className="p-2">
                      <h4 className="text-yellow-300 font-semibold mb-2">{cat}</h4>
                      <ul className="text-sm space-y-1">
                        {codes.map(c => (
                          <li key={c.value} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-100">{c.label}</div>
                              <div className="text-xs text-gray-400">{c.value}</div>
                            </div>
                            <button
                              onClick={() => {
                                setCategory(cat);
                                setErrorCode(c.value);
                                setShowCategoriesInline(false);
                              }}
                              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold"
                            >
                              Use
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected category + error code summary */}
            {(category || errorCode) && (
              <div className="bg-gray-900 rounded p-3 border border-gray-700 text-sm text-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-400 text-xs">Selected Category</div>
                    <div className="font-medium text-white">{formatCategoryName(category)}</div>
                    <div className="text-gray-400 text-xs mt-2">Selected Error Code</div>
                    <div className="text-sm text-white">{getErrorLabel(category, errorCode) || errorCode}</div>
                  </div>
                  <button
                    onClick={() => { setCategory(''); setErrorCode(''); }}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Comment textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Comment (coaching feedback)
              </label>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="What happened? What should the player do instead?"
                className="w-full p-4 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all"
                rows={4}
              />
            </div>

            {/* Confidence slider */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Confidence: {confidence.toFixed(2)}
              </label>
              <input
                type="range"
                min="0" max="1" step="0.01"
                value={confidence}
                onChange={e => setConfidence(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${confidence * 100}%, #374151 ${confidence * 100}%, #374151 100%)`
                }}
              />
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmitFeedback}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
            >
              ADD AT {formatTime(currentVideoTime)}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback list */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white">
            Annotations ({filteredFeedbackList.length}{selectedCategories.length > 0 && ` of ${feedbackList.length}`})
          </h3>
          {feedbackList.length > 0 && (
            <FeedbackCategoryFilter
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
            />
          )}
        </div>
        {feedbackList.length === 0 ? (
          <p className="text-gray-400">No annotations added yet. Add your first annotation above!</p>
        ) : filteredFeedbackList.length === 0 ? (
          <p className="text-gray-400">No annotations match the selected category filters.</p>
        ) : (
          <div className="space-y-4">
            {filteredFeedbackList.map(f => (
              <FeedbackCard
                key={f.id}
                feedback={f}
                formatTime={formatTime}
                onClick={() => {
                  const videoElement = document.querySelector('video');
                  if (videoElement) {
                    videoElement.currentTime = f.timestamp;
                    videoElement.play();
                  }
                }}
                onDelete={() => handleDeleteFeedback(f.id)}
                canDelete={f.coach_username === coachUsername}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachValorantRecordingAnalysis;