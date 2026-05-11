// import React, { useEffect, useState } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import {
//   PieChart, Pie, Cell, BarChart, Bar,
//   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
//   ScatterChart, Scatter
// } from 'recharts';
// import { API_BASE_URL } from '../../services/api';

// interface CSVSummary {
//   file_size_mb: number;
//   total_rows: number;
//   columns: string[];
//   column_count: number;
//   sample_rows: any[];
// }

// interface CSVData {
//   headers: string[];
//   data: any[];
//   rows_returned: number;
//   total_rows: number;
// }

// interface EmotionData {
//   name: string;
//   value: number;
//   count: number;
// }

// interface GazePoint {
//   x: number;
//   y: number;
//   emotion: string;
// }

// interface InputMetrics {
//   apm: number;
//   total_key_presses: number;
//   total_mouse_clicks: number;
//   total_mouse_moves: number;
//   clicks_per_minute: number;
//   duration_minutes: number;
//   ability_usage: {
//     [key: string]: number;
//   };
//   top_keys: Array<{
//     key: string;
//     count: number;
//   }>;
//   error?: string;
// }

// const ValorantMatchDashboard: React.FC = () => {
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();

//   const [summary, setSummary] = useState<CSVSummary | null>(null);
//   const [fullMatchData, setFullMatchData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [dataLoading, setDataLoading] = useState(false);
//   const [error, setError] = useState<string>('');
//   const [matchId, setMatchId] = useState<string>('');
//   const [currentRiotId, setCurrentRiotId] = useState('');
//   const [currentPuuid, setCurrentPuuid] = useState('');
//   const [mergedFilePath, setMergedFilePath] = useState<string>('');

//   // Analytics state
//   const [emotionDistribution, setEmotionDistribution] = useState<EmotionData[]>([]);
//   const [dominantEmotion, setDominantEmotion] = useState('Unknown');
//   const [dominantPercentage, setDominantPercentage] = useState(0);
//   const [emotionProgressData, setEmotionProgressData] = useState<any[]>([]);
//   const [gazePoints, setGazePoints] = useState<GazePoint[]>([]);
//   const [screenZones, setScreenZones] = useState<any[]>([]);
//   const [inputMetrics, setInputMetrics] = useState<InputMetrics | null>(null);

//   // Toggle visibility for emotions
//   const [includedEmotions, setIncludedEmotions] = useState<Record<string, boolean>>({
//     Neutral: true,
//     Happiness: true,
//     Anger: true,
//     Sadness: true,
//     Surprise: true,
//     Disgust: true,
//     Fear: true
//   });

//   // Colors for emotions (yellow theme for coach)
//   const EMOTION_COLORS: Record<string, string> = {
//     'Neutral': '#60A5FA',
//     'Happiness': '#34D399',
//     'Anger': '#EF4444',
//     'Sadness': '#A78BFA',
//     'Surprise': '#FBBF24',
//     'Disgust': '#F97316',
//     'Fear': '#9CA3AF',
//   };

//   const getColor = (name: string) => EMOTION_COLORS[name] || '#6B7280';

//   // Resolve matchId, Riot id and PUUID from URL params or sessionStorage
//   useEffect(() => {
//     const matchIdFromUrl = searchParams.get('matchId') || searchParams.get('match_id');
//     const riotIdFromUrl = searchParams.get('user');
//     const puuidFromUrl = searchParams.get('puuid');

//     if (matchIdFromUrl) {
//       setMatchId(matchIdFromUrl);
//     }

//     if (riotIdFromUrl) {
//       setCurrentRiotId(riotIdFromUrl);
//       sessionStorage.setItem('current_valorant_riot_id', riotIdFromUrl);
//     } else {
//       const savedRiotId = sessionStorage.getItem('current_valorant_riot_id');
//       if (savedRiotId) setCurrentRiotId(savedRiotId);
//     }

//     if (puuidFromUrl) {
//       setCurrentPuuid(puuidFromUrl);
//       sessionStorage.setItem('current_valorant_puuid', puuidFromUrl);
//     } else {
//       const savedPuuid = sessionStorage.getItem('current_valorant_puuid');
//       if (savedPuuid) setCurrentPuuid(savedPuuid);
//     }
//   }, [searchParams]);

//   // Fetch CSV summary
//   useEffect(() => {
//     const fetchSummary = async () => {
//       if (!matchId) {
//         return;
//       }

//       try {
//         const dataDirectory = localStorage.getItem('toolkit_data_directory');
//         if (!dataDirectory) {
//           setError('Data directory not configured. Please set it up in the recording list.');
//           setLoading(false);
//           return;
//         }

//         const mergedFileName = `${matchId}_merged.csv`;
//         const filePath = `${dataDirectory}/merged/${mergedFileName}`;
//         setMergedFilePath(filePath);

//         const response = await fetch(
//           `${API_BASE_URL}/api/matches/csv-summary?file_path=${encodeURIComponent(filePath)}`
//         );

//         if (!response.ok) {
//           const errorData = await response.json();
//           throw new Error(errorData.detail || 'Failed to fetch match summary');
//         }

//         const summaryData = await response.json();
//         setSummary(summaryData);
//         setLoading(false);

//       } catch (err) {
//         console.error('Error fetching summary:', err);
//         if (err instanceof Error) {
//           setError(err.message);
//         } else {
//           setError('Failed to load match summary');
//         }
//         setLoading(false);
//       }
//     };

//     fetchSummary();
//   }, [matchId]);

//   // Load all match data in batches
//   const loadAllMatchData = async () => {
//     if (!mergedFilePath || !summary) return;

//     setDataLoading(true);
//     const allData: any[] = [];

//     try {
//       const totalRows = summary.total_rows;
//       const batchSize = 500;
//       const totalBatches = Math.ceil(totalRows / batchSize);

//       for (let batch = 0; batch < totalBatches; batch++) {
//         const skipRows = batch * batchSize;

//         const response = await fetch(
//           `${API_BASE_URL}/api/matches/read-csv?file_path=${encodeURIComponent(mergedFilePath)}&max_rows=${batchSize}&skip_rows=${skipRows}`
//         );

//         if (!response.ok) throw new Error('Failed to fetch batch');

//         const batchData: CSVData = await response.json();
//         allData.push(...batchData.data);
//       }

//       setFullMatchData(allData);
//       processAnalytics(allData);

//     } catch (err) {
//       console.error('Error loading all data:', err);
//       setError('Failed to load complete match data');
//     } finally {
//       setDataLoading(false);
//     }
//   };

//   // Process analytics from CSV data
//   const processAnalytics = (data: any[]) => {
//     const emotionCounts: Record<string, number> = {};
//     data.forEach(row => {
//       const emotion = row.emotion || 'Unknown';
//       emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
//     });

//     const total = data.length;
//     const emotionData: EmotionData[] = Object.entries(emotionCounts).map(([emotion, count]) => ({
//       name: emotion,
//       value: parseFloat(((count / total) * 100).toFixed(1)),
//       count,
//     }));

//     emotionData.sort((a, b) => b.count - a.count);
//     setEmotionDistribution(emotionData);

//     if (emotionData.length > 0) {
//       setDominantEmotion(emotionData[0].name);
//       setDominantPercentage(emotionData[0].value);
//     }

//     processInputMetrics(data);

//     const stages = ['Pistol Round', 'Early Rounds', 'Mid Game', 'Late Rounds', 'Final Rounds'];
//     const segmentSize = Math.floor(data.length / 5);

//     const progressData = stages.map((stage, index) => {
//       const segmentStart = index * segmentSize;
//       const segmentEnd = index === 4 ? data.length : (index + 1) * segmentSize;
//       const segmentData = data.slice(segmentStart, segmentEnd);

//       const stageCounts: Record<string, number> = {
//         Neutral: 0,
//         Happiness: 0,
//         Anger: 0,
//         Sadness: 0,
//         Surprise: 0,
//         Disgust: 0,
//         Fear: 0,
//       };

//       segmentData.forEach(row => {
//         const emotion = row.emotion;
//         if (stageCounts[emotion] !== undefined) {
//           stageCounts[emotion]++;
//         }
//       });

//       return {
//         stage,
//         ...stageCounts,
//       };
//     });

//     setEmotionProgressData(progressData);

//     const gazeData: GazePoint[] = [];
//     for (let i = 0; i < data.length; i += 20) {
//       const row = data[i];
//       if (row.screen_x && row.screen_y) {
//         gazeData.push({
//           x: parseInt(row.screen_x),
//           y: parseInt(row.screen_y),
//           emotion: row.emotion || 'Unknown',
//         });
//       }
//     }
//     setGazePoints(gazeData);

//     const zones = {
//       minimap: 0,
//       abilities: 0,
//       killfeed: 0,
//       center: 0,
//       other: 0,
//     };

//     data.forEach(row => {
//       const x = parseInt(row.screen_x || '0');
//       const y = parseInt(row.screen_y || '0');

//       if (x >= 0 && x <= 300 && y >= 0 && y <= 300) {
//         zones.minimap++;
//       } else if (x >= 900 && x <= 1660 && y >= 1300 && y <= 1440) {
//         zones.abilities++;
//       } else if (x >= 2200 && x <= 2560 && y >= 0 && y <= 300) {
//         zones.killfeed++;
//       } else if (x >= 300 && x <= 2200 && y >= 300 && y <= 1300) {
//         zones.center++;
//       } else {
//         zones.other++;
//       }
//     });

//     const zoneData = Object.entries(zones).map(([zone, count]) => ({
//       zone: zone.charAt(0).toUpperCase() + zone.slice(1),
//       count,
//       percentage: ((count / data.length) * 100).toFixed(1),
//     }));

//     setScreenZones(zoneData);
//   };

//   const processInputMetrics = (data: any[]) => {
//     let totalKeyPresses = 0;
//     let totalMouseClicks = 0;
//     const abilityCounts: Record<string, number> = {
//       'Q': 0, 'E': 0, 'C': 0, 'X': 0,
//       '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
//     };
//     const keyCounts: Record<string, number> = {};

//     const timestamps = data
//       .map(row => row.datetime || row.timestamp)
//       .filter(ts => ts)
//       .sort();

//     const durationMinutes = timestamps.length > 0
//       ? ((new Date(timestamps[timestamps.length - 1]).getTime() - new Date(timestamps[0]).getTime()) / 1000 / 60)
//       : 0;

//     data.forEach((row) => {
//       const eventType = row.event_type;

//       if (eventType === 'key_press' || eventType === 'keyboard' || eventType === 'key') {
//         const keyValue = row.details_x;

//         if (keyValue) {
//           totalKeyPresses++;
//           let cleanKey = String(keyValue).replace(/'/g, '').replace(/"/g, '').trim();
//           keyCounts[cleanKey] = (keyCounts[cleanKey] || 0) + 1;

//           const upperKey = cleanKey.toUpperCase();
//           if (['Q', 'E', 'C', 'X', '1', '2', '3', '4', '5'].includes(upperKey)) {
//             abilityCounts[upperKey]++;
//           }
//         }
//       }

//       if (eventType === 'mouse_click' || eventType === 'click') {
//         totalMouseClicks++;
//       }
//     });

//     const topKeys = Object.entries(keyCounts)
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 10)
//       .map(([key, count]) => ({ key, count }));

//     const apm = durationMinutes > 0 ? Math.round(totalKeyPresses / durationMinutes) : 0;
//     const clicksPerMinute = durationMinutes > 0 ? Math.round(totalMouseClicks / durationMinutes) : 0;

//     const metrics: InputMetrics = {
//       apm,
//       total_key_presses: totalKeyPresses,
//       total_mouse_clicks: totalMouseClicks,
//       total_mouse_moves: 0,
//       clicks_per_minute: clicksPerMinute,
//       duration_minutes: Math.round(durationMinutes * 10) / 10,
//       ability_usage: abilityCounts,
//       top_keys: topKeys
//     };

//     setInputMetrics(metrics);
//   };

//   const toggleEmotion = (name: string) => {
//     setIncludedEmotions((prev) => ({ ...prev, [name]: !prev[name] }));
//   };

//   const filteredEmotionData = emotionDistribution.filter(
//     (d) => includedEmotions[d.name] && d.value > 0
//   );

//   const renderInputMetrics = () => {
//     if (!inputMetrics || inputMetrics.error) {
//       return (
//         <div className="bg-gradient-to-br from-gray-950 to-black p-6 rounded-lg border border-yellow-500/20">
//           <p className="text-yellow-400">No input data available - load analytics to process input metrics</p>
//         </div>
//       );
//     }

//     const valorantAbilityOrder = ['Q', 'E', 'C', 'X'];
//     const weaponOrder = ['1', '2', '3', '4', '5'];

//     const abilities = valorantAbilityOrder
//       .filter(key => inputMetrics.ability_usage?.[key])
//       .map(key => ({
//         key: key,
//         label: key === 'C' ? 'C - Ability 1' :
//           key === 'Q' ? 'Q - Ability 2' :
//             key === 'E' ? 'E - Signature' :
//               key === 'X' ? 'X - Ultimate' : key,
//         count: inputMetrics.ability_usage[key],
//         isAbility: true
//       }));

//     const weapons = weaponOrder
//       .filter(key => inputMetrics.ability_usage?.[key])
//       .map(key => ({
//         key: key,
//         label: key === '1' ? '1 - Primary' :
//           key === '2' ? '2 - Secondary' :
//             key === '3' ? '3 - Melee' :
//               key === '4' ? '4 - Spike' :
//                 key === '5' ? '5 - Other' : key,
//         count: inputMetrics.ability_usage[key],
//         isAbility: false
//       }));

//     return (
//       <div className="bg-gradient-to-br from-gray-950 to-black p-6 rounded-lg border border-yellow-500/20 shadow-lg">
//         <h4 className="text-white font-black text-lg mb-6">Input Activity Analysis</h4>

//         <div className="grid grid-cols-4 gap-4 mb-6">
//           <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-yellow-500/20 group hover:border-purple-500 transition-colors">
//             <p className="text-yellow-300/60 text-xs mb-2 font-semibold">APM</p>
//             <p className="text-3xl font-black text-purple-400">{inputMetrics.apm}</p>
//             <p className="text-gray-500 text-xs mt-1 font-semibold">Actions/min</p>
//             <div className="mt-2 w-full h-3 bg-gray-800 rounded-full shadow-inner">
//               <div
//                 className="bg-gradient-to-r from-purple-500 to-purple-700 h-3 rounded-full transition-all duration-500"
//                 style={{ width: `${Math.min((inputMetrics.apm / 300) * 100, 100)}%` }}
//               ></div>
//             </div>
//           </div>

//           <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-yellow-500/20 group hover:border-green-500 transition-colors">
//             <p className="text-yellow-300/60 text-xs mb-2 font-semibold">Key Presses</p>
//             <p className="text-2xl font-black text-green-400">{inputMetrics.total_key_presses.toLocaleString()}</p>
//             <p className="text-gray-500 text-xs mt-1 font-semibold">Total</p>
//             <div className="mt-2 w-full h-3 bg-gray-800 rounded-full shadow-inner">
//               <div
//                 className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
//                 style={{ width: `${Math.min((inputMetrics.total_key_presses / 2000) * 100, 100)}%` }}
//               ></div>
//             </div>
//           </div>

//           <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-yellow-500/20 group hover:border-blue-500 transition-colors">
//             <p className="text-yellow-300/60 text-xs mb-2 font-semibold">Mouse Clicks</p>
//             <p className="text-2xl font-black text-blue-400">{inputMetrics.total_mouse_clicks.toLocaleString()}</p>
//             <p className="text-gray-500 text-xs mt-1 font-semibold">Total</p>
//             <div className="mt-2 w-full h-3 bg-gray-800 rounded-full shadow-inner">
//               <div
//                 className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
//                 style={{ width: `${Math.min((inputMetrics.total_mouse_clicks / 3000) * 100, 100)}%` }}
//               ></div>
//             </div>
//           </div>

//           <div className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-yellow-500/20 group hover:border-yellow-500 transition-colors">
//             <p className="text-yellow-300/60 text-xs mb-2 font-semibold">Clicks/Min</p>
//             <p className="text-2xl font-black text-yellow-400">{inputMetrics.clicks_per_minute}</p>
//             <p className="text-gray-500 text-xs mt-1 font-semibold">Fire rate</p>
//             <div className="mt-2 w-full h-3 bg-gray-800 rounded-full shadow-inner">
//               <div
//                 className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full transition-all duration-500"
//                 style={{ width: `${Math.min((inputMetrics.clicks_per_minute / 100) * 100, 100)}%` }}
//               ></div>
//             </div>
//           </div>
//         </div>

//         {abilities.length > 0 && (
//           <div className="mb-6">
//             <h5 className="text-white font-black mb-4 flex items-center gap-2 text-lg">
//               <span className="text-purple-400 animate-pulse">⚡</span>
//               Valorant Abilities
//             </h5>
//             <div className="space-y-4">
//               {abilities.map((ability) => {
//                 const totalAbilities = abilities.reduce((sum, a) => sum + a.count, 0);
//                 const percentage = totalAbilities > 0 ? (ability.count / totalAbilities) * 100 : 0;
//                 const barColor = ability.key === 'X' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-purple-500 to-purple-700';

//                 return (
//                   <div key={ability.key} className="group">
//                     <div className="flex justify-between items-center mb-1">
//                       <div className="flex items-center gap-2">
//                         <span className={`text-xl font-black ${ability.key === 'X' ? 'text-yellow-400' : 'text-purple-400'} group-hover:scale-110 transition-transform`}>
//                           {ability.key}
//                         </span>
//                         <span className="text-gray-300 text-sm font-semibold">{ability.label.split(' - ')[1]}</span>
//                       </div>
//                       <span className="text-yellow-300/60 text-xs font-bold">{Math.round(percentage)}%</span>
//                     </div>
//                     <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden shadow-inner border border-yellow-500/10">
//                       <div
//                         className={`${barColor} h-4 rounded-full transition-all duration-500 ease-out transform group-hover:scale-x-105`}
//                         style={{ width: `${percentage}%` }}
//                       ></div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         )}

//         {weapons.length > 0 && (
//           <div className="mb-6">
//             <h5 className="text-white font-black mb-3 flex items-center gap-2">
//               <span className="text-blue-400">🔫</span>
//               Weapons & Equipment
//             </h5>
//             <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
//               {weapons.map((weapon) => (
//                 <div key={weapon.key} className="bg-gradient-to-br from-gray-900 to-black p-3 rounded-lg border border-yellow-500/20 hover:border-blue-500/40 transition-colors">
//                   <div className="flex items-center justify-between mb-1">
//                     <span className="text-2xl font-black text-blue-400">{weapon.key}</span>
//                     <span className="text-white font-black">{weapon.count}</span>
//                   </div>
//                   <p className="text-gray-400 text-xs font-semibold">{weapon.label.split(' - ')[1]}</p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         <div className="space-y-2">
//           {inputMetrics.apm > 150 && (
//             <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
//               <p className="text-green-400 text-sm font-bold">
//                 ✅ High APM ({inputMetrics.apm}) - Active and engaged playstyle
//               </p>
//             </div>
//           )}

//           {inputMetrics.apm < 100 && (
//             <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
//               <p className="text-yellow-400 text-sm font-bold">
//                 ⚠️ Low APM ({inputMetrics.apm}) - May be too passive
//               </p>
//             </div>
//           )}

//           <p className="text-gray-500 text-xs text-center mt-4 font-semibold">
//             Match duration: ~{inputMetrics.duration_minutes} minutes
//           </p>
//         </div>
//       </div>
//     );
//   };

//   if (loading) {
//     return (
//       <div className="p-6 bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen">
//         <div className="flex items-center justify-center h-64">
//           <div className="animate-pulse text-center">
//             <div className="text-yellow-400 text-xl mb-2 font-bold">Loading match summary...</div>
//             <div className="text-yellow-300/60 text-sm font-semibold">Analyzing CSV file...</div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen">
//       <div className="mb-8">
//         <button
//           onClick={() => {
//             const params = new URLSearchParams();
//             if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
//             if (currentPuuid) params.set('puuid', currentPuuid);
//             const qs = params.toString();
//             navigate(`/coach/valorant-recordinganalysis${qs ? `?${qs}` : ''}`);
//           }}
//           className="flex items-center gap-2 text-yellow-300/60 hover:text-yellow-400 mb-4 transition-colors font-bold"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//           </svg>
//           Back to Match List
//         </button>

//         <div className="flex items-center gap-2 mb-4">
//           <span className="text-2xl">📊</span>
//           <h2 className="text-sm font-bold text-yellow-300/60 uppercase tracking-wider">
//             COACH ANALYSIS
//           </h2>
//         </div>
//         <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 mb-2">VALORANT Analytics</h1>
//         {currentRiotId && currentRiotId !== 'Unknown' && (
//           <p className="text-yellow-400 font-black">Analyzing player: {decodeURIComponent(currentRiotId)}</p>
//         )}
//         <p className="text-yellow-300/60 text-sm mt-1 font-semibold">Match: {matchId}</p>
//       </div>

//       {error && (
//         <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
//           <span className="text-2xl">⚠️</span>
//           <div className="flex-1">
//             <p className="text-red-400 font-bold mb-1">{error}</p>
//           </div>
//         </div>
//       )}

//       {summary && fullMatchData.length === 0 && !dataLoading && (
//         <div className="bg-gradient-to-br from-yellow-900/30 to-amber-800/30 border-2 border-yellow-500/50 rounded-xl p-8 text-center mb-6">
//           <div className="text-6xl mb-4">📈</div>
//           <h3 className="text-white font-black text-2xl mb-2">Ready to Analyze Performance</h3>
//           <p className="text-yellow-300/80 mb-6 font-semibold">
//             Load complete match data to view emotion tracking, gaze patterns, and input metrics
//           </p>
//           <button
//             onClick={loadAllMatchData}
//             className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-lg font-black text-lg transition-all transform hover:scale-105 shadow-lg shadow-yellow-500/30"
//           >
//             🚀 Load Analytics Dashboard
//           </button>
//           <p className="text-yellow-300/60 text-sm mt-3 font-semibold">
//             Analyzing {summary.total_rows.toLocaleString()} data points from {summary.file_size_mb}MB file
//           </p>
//         </div>
//       )}

//       {dataLoading && (
//         <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-12 text-center mb-6">
//           <div className="animate-spin text-6xl mb-4">⚙️</div>
//           <h3 className="text-white font-black text-xl mb-2">Processing Match Data...</h3>
//           <p className="text-yellow-300/60 font-semibold">This may take a moment for large files</p>
//         </div>
//       )}

//       {fullMatchData.length > 0 && (
//         <div className="space-y-6">
//           <div className="bg-gradient-to-br from-gray-950 to-black p-6 rounded-lg border border-yellow-500/20 shadow-lg">
//             <div className="flex items-center justify-between mb-6">
//               <div>
//                 <h4 className="text-white font-black text-lg">Emotion Distribution</h4>
//                 <p className="text-yellow-300/60 text-sm font-semibold">During gameplay session</p>
//               </div>
//               <div className="text-right">
//                 <p className="text-yellow-300/60 text-xs font-semibold">Dominant</p>
//                 <p className="text-xl font-black" style={{ color: getColor(dominantEmotion) }}>
//                   {dominantEmotion}
//                 </p>
//                 <p className="text-gray-500 text-xs font-bold">{dominantPercentage}%</p>
//               </div>
//             </div>

//             <div className="flex flex-wrap gap-3 mb-4">
//               {Object.keys(EMOTION_COLORS).map((emotion) => (
//                 <label key={emotion} className="flex items-center space-x-2 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     checked={includedEmotions[emotion]}
//                     onChange={() => toggleEmotion(emotion)}
//                     className="accent-yellow-500 cursor-pointer"
//                   />
//                   <span className="text-gray-300 text-sm font-semibold">{emotion}</span>
//                 </label>
//               ))}
//             </div>

//             <ResponsiveContainer width="100%" height={300}>
//               <PieChart>
//                 <Pie
//                   data={filteredEmotionData}
//                   cx="50%"
//                   cy="50%"
//                   labelLine={false}
//                   label={({ name, value }) => `${name}: ${value}%`}
//                   outerRadius={100}
//                   fill="#8884d8"
//                   dataKey="value"
//                 >
//                   {filteredEmotionData.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
//                   ))}
//                 </Pie>
//                 <Tooltip
//                   contentStyle={{
//                     backgroundColor: '#0a0a0a',
//                     border: '1px solid rgba(234, 179, 8, 0.2)',
//                     borderRadius: '0.5rem'
//                   }}
//                 />
//                 <Legend />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>

//           {renderInputMetrics()}

//           <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2">
//               <span>📈</span> Emotion Flow Throughout Match
//             </h3>
//             <p className="text-yellow-300/60 text-sm mb-4 font-semibold">
//               How emotional state changed from pistol round to final rounds
//             </p>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={emotionProgressData}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
//                 <XAxis dataKey="stage" stroke="#FCA5A5" />
//                 <YAxis stroke="#FCA5A5" />
//                 <Tooltip
//                   contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(234, 179, 8, 0.2)' }}
//                   labelStyle={{ color: '#fff', fontWeight: 'bold' }}
//                 />
//                 <Legend />
//                 {Object.keys(EMOTION_COLORS).map((emotion) => (
//                   <Bar
//                     key={emotion}
//                     dataKey={emotion}
//                     stackId="a"
//                     fill={getColor(emotion)}
//                   />
//                 ))}
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2">
//               <span>🎯</span> VALORANT Focus Zones
//             </h3>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={screenZones}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
//                 <XAxis dataKey="zone" stroke="#FCA5A5" />
//                 <YAxis stroke="#FCA5A5" />
//                 <Tooltip
//                   contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(234, 179, 8, 0.2)' }}
//                 />
//                 <Bar dataKey="count" fill="#EAB308" />
//               </BarChart>
//             </ResponsiveContainer>
//             <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
//               {screenZones.map((zone) => (
//                 <div key={zone.zone} className="bg-gradient-to-br from-gray-900 to-black rounded-lg p-3 text-center border border-yellow-500/20">
//                   <p className="text-yellow-300/60 text-sm font-semibold">{zone.zone}</p>
//                   <p className="text-white font-black text-lg">{zone.percentage}%</p>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2">
//               <span>👁️</span> Gaze Path Visualization
//             </h3>
//             <ResponsiveContainer width="100%" height={400}>
//               <ScatterChart>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
//                 <XAxis type="number" dataKey="x" name="X Position" domain={[0, 2560]} stroke="#FCA5A5" />
//                 <YAxis type="number" dataKey="y" name="Y Position" domain={[0, 1440]} stroke="#FCA5A5" reversed />
//                 <Tooltip
//                   cursor={{ strokeDasharray: '3 3' }}
//                   contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(234, 179, 8, 0.2)' }}
//                 />
//                 <Scatter name="Gaze Points" data={gazePoints} fill="#EAB308" fillOpacity={0.3} />
//               </ScatterChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ValorantMatchDashboard;




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
  cached: boolean;
}

type DataSource = 'local' | 'hive';

// ─── Helper ───────────────────────────────────────────────────────────────────

function baseStem(filename: string): string {
  let s = filename.replace(/\.[^/.]+$/, '');
  for (const suffix of ['_merged', '_emotion', '_gaze', '_input']) {
    if (s.endsWith(suffix)) { s = s.slice(0, -suffix.length); break; }
  }
  return s;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ValorantMatchDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const matchId    = searchParams.get('matchId') || searchParams.get('match_id') || '';
  const dataSource = (searchParams.get('source') || 'local') as DataSource;
  const riotIdParam = searchParams.get('user') || '';
  const puuidParam  = searchParams.get('puuid') || '';

  const currentRiotId = riotIdParam || sessionStorage.getItem('current_valorant_riot_id') || '';
  const currentPuuid  = puuidParam  || sessionStorage.getItem('current_valorant_puuid')   || '';

  const [analytics,  setAnalytics]  = useState<AnalyticsResult | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [includedEmotions, setIncludedEmotions] = useState<Record<string, boolean>>({
    Neutral: true, Happiness: true, Anger: true, Sadness: true,
    Surprise: true, Disgust: true, Fear: true,
  });

  const stem         = baseStem(matchId);
  const dataDirectory = localStorage.getItem('toolkit_data_directory') || '';

  // Coach also stores directory in a separate key set by the coach config flow
  const coachDataDir = localStorage.getItem('coach_data_directory') || dataDirectory;

  const EMOTION_COLORS: Record<string, string> = {
    Neutral: '#60A5FA', Happiness: '#34D399', Anger: '#EF4444',
    Sadness: '#A78BFA', Surprise: '#FBBF24', Disgust: '#F97316', Fear: '#9CA3AF',
  };
  const getColor = (name: string) => EMOTION_COLORS[name] || '#6B7280';

  // ── Single fetch replacing all batching + processAnalytics ────────────────
  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      let url: string;

      if (dataSource === 'hive') {
        url = `${API_BASE_URL}/api/analytics/hive?stem=${encodeURIComponent(stem)}`;
      } else {
        // Coach gets data dir from backend config, not localStorage toolkit path
        // Try to read it from the coach config endpoint
        let dirPath = coachDataDir;
        if (!dirPath) {
          try {
            const configRes = await fetch(`${API_BASE_URL}/api/coach/config`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (configRes.ok) {
              const config = await configRes.json();
              dirPath = config.data_directory || '';
            }
          } catch { /* use empty */ }
        }

        if (!dirPath) {
          setError('Data directory not configured. Please set it up in the recording list.');
          setLoading(false);
          return;
        }

        const filePath = `${dirPath}/merged/${stem}_merged.csv`;
        url = `${API_BASE_URL}/api/analytics/local?file_path=${encodeURIComponent(filePath)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      setAnalytics(await res.json());
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
      <div className="bg-gradient-to-br from-gray-950 to-black p-6 rounded-lg border border-yellow-500/20 shadow-lg">
        <h4 className="text-white font-black text-lg mb-6">Input Activity Analysis</h4>

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label:'APM',          value: m.apm,                color:'text-purple-400', bar:'from-purple-500 to-purple-700', max:300 },
            { label:'Key Presses',  value: m.total_key_presses,  color:'text-green-400',  bar:'from-green-400 to-green-600',   max:2000 },
            { label:'Mouse Clicks', value: m.total_mouse_clicks, color:'text-blue-400',   bar:'from-blue-400 to-blue-600',     max:3000 },
            { label:'Clicks/Min',   value: m.clicks_per_minute,  color:'text-yellow-400', bar:'from-yellow-400 to-yellow-600', max:100 },
          ].map(({ label, value, color, bar, max }) => (
            <div key={label} className="bg-gradient-to-br from-gray-900 to-black p-4 rounded-lg border border-yellow-500/20">
              <p className="text-yellow-300/60 text-xs mb-2 font-semibold">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value.toLocaleString()}</p>
              <div className="mt-2 w-full h-3 bg-gray-800 rounded-full">
                <div className={`bg-gradient-to-r ${bar} h-3 rounded-full transition-all duration-500`}
                  style={{ width:`${Math.min((value/max)*100,100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Abilities */}
        {abilities.length > 0 && (
          <div className="mb-6">
            <h5 className="text-white font-black mb-4 flex items-center gap-2 text-lg">
              <span className="text-purple-400 animate-pulse">⚡</span> Valorant Abilities
            </h5>
            <div className="space-y-4">
              {abilities.map(a => {
                const pct = totalAbilities > 0 ? (a.count / totalAbilities) * 100 : 0;
                return (
                  <div key={a.key} className="group">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black ${a.key==='X'?'text-yellow-400':'text-purple-400'} group-hover:scale-110 transition-transform`}>
                          {a.key}
                        </span>
                        <span className="text-gray-300 text-sm font-semibold">{a.label}</span>
                      </div>
                      <span className="text-yellow-300/60 text-xs font-bold">{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-yellow-500/10">
                      <div className={`${a.key==='X'?'bg-gradient-to-r from-yellow-400 to-yellow-600':'bg-gradient-to-r from-purple-500 to-purple-700'} h-4 rounded-full transition-all duration-500`}
                        style={{ width:`${pct}%` }} />
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
                <div key={w.key} className="bg-gradient-to-br from-gray-900 to-black p-3 rounded-lg border border-yellow-500/20 hover:border-blue-500/40 transition-colors">
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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <div className="text-yellow-400 text-xl mb-2 font-bold">Computing Analytics...</div>
          <div className="text-yellow-300/60 text-sm font-semibold">
            {dataSource === 'hive' ? 'Reading from Hive server...' : 'Reading local merged CSV...'}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
            if (currentPuuid) params.set('puuid', currentPuuid);
            // navigate(`/coach/valorant-recordinglist${params.toString() ? `?${params}` : ''}`);
            navigate(`/coach/valorant-recordinganalysis${params.toString() ? `?${params}` : ''}`);
          }}
          className="flex items-center gap-2 text-yellow-300/60 hover:text-yellow-400 mb-4 transition-colors font-bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Match List
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📊</span>
          <h2 className="text-sm font-bold text-yellow-300/60 uppercase tracking-wider">COACH ANALYSIS</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-black ${
            dataSource === 'hive'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}>
            {dataSource === 'hive' ? ' Hive Server' : ' Local'}
          </span>
          {analytics?.cached && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-green-500/20 text-green-400 border border-green-500/30">
              ⚡ Cached
            </span>
          )}
        </div>

        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 mb-2">
          VALORANT Analytics
        </h1>
        {currentRiotId && currentRiotId !== 'Unknown' && (
          <p className="text-yellow-400 font-black">Analyzing player: {decodeURIComponent(currentRiotId)}</p>
        )}
        <p className="text-yellow-300/60 text-sm mt-1 font-semibold">Match: {stem}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-red-400 font-bold mb-1">{error}</p>
            {dataSource === 'hive' && (
              <p className="text-red-300 text-sm mt-1">Make sure you are on the university network or VPN.</p>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      {!analytics && !loading && !error && (
        <div className="bg-gradient-to-br from-yellow-900/30 to-amber-800/30 border-2 border-yellow-500/50 rounded-xl p-8 text-center mb-6">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-white font-black text-2xl mb-2">Ready to Analyze Performance</h3>
          <p className="text-yellow-300/80 mb-2 font-semibold">
            All analytics computed server-side — charts appear instantly once loaded
          </p>
          {dataSource === 'hive' && (
            <p className="text-blue-400 text-sm mb-4 font-semibold">
              📡 Reading from Hive server · First load ~3-6s · Cached visits ~instant
            </p>
          )}
          {dataSource === 'local' && (
            <p className="text-yellow-300/60 text-sm mb-4 font-semibold">
              💻 Reading from local data directory · Cached after first load
            </p>
          )}
          <button onClick={loadAnalytics}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-lg font-black text-lg transition-all transform hover:scale-105 shadow-lg shadow-yellow-500/30">
            🚀 Load Analytics Dashboard
          </button>
        </div>
      )}

      {/* Dashboard */}
      {analytics && (
        <div className="space-y-6">

          {/* Emotion Distribution */}
          <div className="bg-gradient-to-br from-gray-950 to-black p-6 rounded-lg border border-yellow-500/20 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-white font-black text-lg">Emotion Distribution</h4>
                <p className="text-yellow-300/60 text-sm font-semibold">
                  During gameplay session · {analytics.total_rows.toLocaleString()} data points
                </p>
              </div>
              <div className="text-right">
                <p className="text-yellow-300/60 text-xs font-semibold">Dominant</p>
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
                    onChange={() => toggleEmotion(e)} className="accent-yellow-500" />
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
                <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(234,179,8,0.2)', borderRadius:'0.5rem' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm font-semibold">
                💡 Player maintains {analytics.dominant_emotion.toLowerCase()} state {analytics.dominant_percentage}% of the time —
                {analytics.dominant_percentage > 80 ? ' Excellent emotional control' : ' Good consistency'}
              </p>
            </div>
          </div>

          {/* Input Metrics */}
          {renderInputMetrics()}

          {/* Data Quality */}
          <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>🔍</span> Data Quality Check</h3>
            <div className="space-y-3">
              {!analytics.data_quality.has_emotion && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm font-bold">⚠️ No emotion data detected — camera or emotion detection may not have been active</p>
                </div>
              )}
              {!analytics.data_quality.has_gaze && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm font-bold">⚠️ No eye tracking data detected — eye tracker may not have been connected</p>
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
          <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>📈</span> Emotion Flow Throughout Match</h3>
            <p className="text-yellow-300/60 text-sm mb-4 font-semibold">How emotional state changed from pistol round to final rounds</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.emotion_progress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="stage" stroke="#FCA5A5" />
                <YAxis stroke="#FCA5A5" />
                <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(234,179,8,0.2)' }} labelStyle={{ color:'#fff', fontWeight:'bold' }} />
                <Legend />
                {Object.keys(EMOTION_COLORS).map(e => <Bar key={e} dataKey={e} stackId="a" fill={getColor(e)} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Screen Zones */}
          <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>🎯</span> VALORANT Focus Zones</h3>
            <p className="text-yellow-300/60 text-sm mb-4 font-semibold">Distribution of visual attention across key game interface areas</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.screen_zones}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="zone" stroke="#FCA5A5" />
                <YAxis stroke="#FCA5A5" />
                <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(234,179,8,0.2)' }} />
                <Bar dataKey="count" fill="#EAB308" />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
              {analytics.screen_zones.map(z => (
                <div key={z.zone} className="bg-gradient-to-br from-gray-900 to-black rounded-lg p-3 text-center border border-yellow-500/20">
                  <p className="text-yellow-300/60 text-sm font-semibold">{z.zone}</p>
                  <p className="text-white font-black text-lg">{z.percentage}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gaze Path */}
          <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>👁️</span> Gaze Path Visualization</h3>
            <p className="text-yellow-300/60 text-sm mb-4 font-semibold">Eye tracking data showing where attention was focused (2560×1440)</p>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" dataKey="x" domain={[0,2560]} stroke="#FCA5A5" />
                <YAxis type="number" dataKey="y" domain={[0,1440]} stroke="#FCA5A5" reversed />
                <Tooltip contentStyle={{ backgroundColor:'#0a0a0a', border:'1px solid rgba(234,179,8,0.2)' }} />
                <Scatter name="Gaze Points" data={analytics.gaze_points} fill="#EAB308" fillOpacity={0.3} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-yellow-900/30 to-amber-800/30 border-2 border-yellow-500/50 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2"><span>✅</span> Analysis Complete</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'Data Points',      value: analytics.total_rows.toLocaleString() },
                { label:'Emotions Tracked', value: analytics.emotion_distribution.length },
                { label:'Gaze Points',      value: analytics.gaze_points.length.toLocaleString() },
                { label:'Focus Zones',      value: analytics.screen_zones.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gradient-to-br from-gray-950 to-black rounded-lg p-4 border border-yellow-500/20">
                  <p className="text-yellow-300/60 text-sm font-semibold">{label}</p>
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

export default ValorantMatchDashboard;