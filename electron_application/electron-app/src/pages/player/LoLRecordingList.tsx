// import React, { useEffect, useState } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import { getUser } from '../../utils/auth';
// import api, { API_BASE_URL } from '../../services/api';

// interface Match {
//   filename: string;
//   display_name: string;
//   game_type: string;
//   date: string;
//   has_video: boolean;
//   has_merged_data: boolean;
//   video_path: string | null;
//   merged_data_path: string | null;
// }

// interface RiotMatchData {
//   matchId: string;
//   championName: string;
//   championId: number;
//   kills: number;
//   deaths: number;
//   assists: number;
//   goldEarned: number;
//   totalDamageDealtToChampions: number;
//   champLevel: number;
//   totalMinionsKilled: number;
//   neutralMinionsKilled: number;
//   visionScore: number;
//   items: number[]; // item0-6
//   win: boolean;
//   gameDuration: number;
//   gameMode: string;
//   teamPosition: string;
//   doubleKills: number;
//   tripleKills: number;
//   quadraKills: number;
//   pentaKills: number;
//   killParticipation: number;
// }

// interface EnrichedMatch extends Match {
//   riotData?: RiotMatchData;
//   loading?: boolean;
// }

// /**
//  * LoLRecordingList
//  * -----------------
//  * Lists local recording files (from the toolkit data directory) and attempts
//  * to enrich them with Riot match metadata by matching timestamps.
//  *
//  * Main responsibilities:
//  * - Read URL params / session storage for current player identifiers
//  * - Fetch PUUID for a Riot account if needed
//  * - Query the backend for local recording files and, when possible, match
//  *   those to Riot match IDs using a windowed timestamp search.
//  */
// const LoLRecordingList: React.FC = () => {
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();
//   const user = getUser();

//   const [matches, setMatches] = useState<EnrichedMatch[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string>('');
//   const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
//   const [currentRiotId, setCurrentRiotId] = useState('');
//   const [currentPuuid, setCurrentPuuid] = useState('');
//   const [platformDetected, setPlatformDetected] = useState('euw1');

//   const REGION = 'europe';

//   // Get Riot ID and PUUID from URL or sessionStorage (matching LoLDashboard pattern)
//   // This effect normalizes across the two sessionStorage keys used in the app
//   // to preserve backward compatibility with older pages.
//   useEffect(() => {
//     const riotIdFromUrl = searchParams.get('user');
//     const puuidFromUrl = searchParams.get('puuid');


//     if (riotIdFromUrl) {
//       // Normalize and store Riot ID under both keys used across the app
//       sessionStorage.setItem('current_riot_id', riotIdFromUrl);
//       sessionStorage.setItem('current_lol_riot_id', riotIdFromUrl);
//       setCurrentRiotId(riotIdFromUrl);
//     } else {
//       // Try both keys for compatibility (dashboard uses 'current_riot_id')
//       const savedRiotId = sessionStorage.getItem('current_riot_id') || sessionStorage.getItem('current_lol_riot_id');
//       if (savedRiotId) {
//         setCurrentRiotId(savedRiotId);
//         sessionStorage.setItem('current_riot_id', savedRiotId); // Normalize to dashboard's key
//       } else {
//         console.warn('⚠️ No Riot ID found');
//       }
//     }

//     if (puuidFromUrl) {
//       // Persist PUUID under the standard key used by player pages
//       sessionStorage.setItem('current_lol_puuid', puuidFromUrl);
//       setCurrentPuuid(puuidFromUrl);
//     } else {
//       const savedPuuid = sessionStorage.getItem('current_lol_puuid');
//       if (savedPuuid) {
//         setCurrentPuuid(savedPuuid);
//       } else {
//         console.warn('⚠️ No PUUID found - will fetch from Riot API');
//       }
//     }

//   }, [searchParams]);

//   // If we have a Riot account (name#tag) but no PUUID persisted, fetch it
//   // from the backend so pages can call Riot endpoints that require a PUUID.
//   useEffect(() => {
//     const fetchPuuid = async () => {
//       if (currentRiotId && currentRiotId !== 'Unknown' && !currentPuuid) {
//         try {
//           const [gameName, tagLine] = currentRiotId.split('#');
//           const response = await api.get(`/riot/account/${REGION}/${gameName}/${tagLine}`);
//           const fetchedPuuid = response.data.puuid;

//           setCurrentPuuid(fetchedPuuid);
//           // Persist fetched PUUID so other pages/components can access it
//           sessionStorage.setItem('current_lol_puuid', fetchedPuuid);
//         } catch (error) {
//           console.error('❌ Error fetching PUUID:', error);
//         }
//       }
//     };

//     fetchPuuid();
//   }, [currentRiotId, currentPuuid]);


//   // Helper: extract a local timestamp from the toolkit filename format.
//   // Returns a Date in the local timezone or null if parsing fails.
//   const extractTimestampFromFilename = (filename: string): Date | null => {
//     // Expected format: "9th_game_P044_league of legends_22-06-2025_15-01-16_merged"
//     // Date format: DD-MM-YYYY_HH-MM-SS
//     const parts = filename.split('_');

//     // Find date and time parts (format: DD-MM-YYYY and HH-MM-SS)
//     let dateStr = '';
//     let timeStr = '';

//     for (let i = 0; i < parts.length; i++) {
//       const part = parts[i];
//       // Check for date pattern DD-MM-YYYY (10 chars, 2 dashes)
//       if (part.match(/^\d{2}-\d{2}-\d{4}$/)) {
//         dateStr = part;
//         // Time should be the next part
//         if (i + 1 < parts.length && parts[i + 1].match(/^\d{2}-\d{2}-\d{2}$/)) {
//           timeStr = parts[i + 1];
//         }
//         break;
//       }
//     }

//     if (!dateStr || !timeStr) {
//       console.warn(`Could not extract timestamp from filename: ${filename}`);
//       return null;
//     }

//     // Parse: DD-MM-YYYY HH-MM-SS
//     const [day, month, year] = dateStr.split('-').map(Number);
//     const [hour, minute, second] = timeStr.split('-').map(Number);

//     // Create date object in LOCAL timezone (assuming recording was done in local time)
//     // Month is 0-indexed in JS, so subtract 1
//     const timestamp = new Date(year, month - 1, day, hour, minute, second);


//     return timestamp;
//   };

//   // Detect Riot platform prefix by reading a sample match ID from the
//   // player's match history. Used to compose platform-specific endpoints
//   // elsewhere in the app when needed.
//   const detectPlatform = async (puuid: string): Promise<string> => {
//     try {
//       const response = await api.get(`/riot/matches/${REGION}/${puuid}?count=1`);
//       const matchIds = response.data;

//       if (matchIds.length === 0) {
//         return 'euw1';
//       }

//       const platformPrefix = matchIds[0].split('_')[0].toLowerCase();
//       return platformPrefix;

//     } catch (error) {
//       console.error('Error detecting platform:', error);
//       return 'euw1';
//     }
//   };

//   // Convenience wrapper: fetch a list of match IDs for a PUUID
//   const fetchAllMatchIds = async (puuid: string, count: number = 100): Promise<string[]> => {
//     try {
//       const response = await api.get(`/riot/matches/${REGION}/${puuid}?count=${count}`);
//       const matchIds = response.data;
//       return matchIds;
//     } catch (error) {
//       console.error('Error fetching match IDs:', error);
//       return [];
//     }
//   };

//   // Fetch match IDs in a time window around a local timestamp (milliseconds).
//   // This narrows the candidates to check when matching a local recording
//   // to Riot matches (reduces API calls and latency).
//   const fetchMatchIdsWindow = async (
//     puuid: string,
//     localMs: number,
//     windowMs: number = 60 * 60 * 1000, // default 1 hour window
//     count: number = 50
//   ): Promise<string[]> => {
//     try {
//       const startTime = Math.max(0, localMs - windowMs);
//       const endTime = localMs + windowMs;
//       const response = await api.get(
//         `/riot/matches/${REGION}/${puuid}?count=${count}&startTime=${startTime}&endTime=${endTime}`
//       );
//       const matchIds = response.data || [];
//       return matchIds;
//     } catch (error) {
//       console.error('Error fetching windowed match IDs:', error);
//       return [];
//     }
//   };

//   // Attempt to match a local recording timestamp to a Riot match by
//   // querying candidate matches and checking their start/end timestamps.
//   // Returns matched Riot metadata for the participant, or null if none found.
//   const findMatchingRiotMatch = async (
//     localTimestamp: Date,
//     matchIds: string[],
//     puuid: string
//   ): Promise<{ matchId: string; riotData: RiotMatchData } | null> => {
//     // Increase tolerance to 10 minutes (recording might start before/after game)
//     // This accounts for:
//     // - Recording start delay
//     // - Game lobby time
//     // - Timezone differences
//     // - Clock sync issues
//     const TIME_TOLERANCE_MS = 10 * 60 * 6000; // 20 minutes in milliseconds


//     // Try to find a match with matching timestamp
//     for (const matchId of matchIds) {
//       try {
//         const response = await api.get(`/riot/match/${REGION}/${matchId}`);
//         const matchData = response.data;


//         // Prefer game end timestamp for matching (more robust for recordings that capture end-of-game)
//         // Fallbacks: use Riot's `gameEndTimestamp` if present, otherwise calculate from `gameStartTimestamp + gameDuration`,
//         // and finally fall back to `gameStartTimestamp` / `gameCreation` if needed.
//         const gameStartMs = matchData.info.gameStartTimestamp || matchData.info.gameCreation;
//         const gameDurationSec = matchData.info.gameDuration || 0;
//         const gameEndMs = matchData.info.gameEndTimestamp
//           || (gameStartMs ? gameStartMs + (gameDurationSec * 1000) : undefined)
//           || gameStartMs;

//         const gameEndDate = new Date(gameEndMs);

//         // Get local timestamp in milliseconds
//         const localMs = localTimestamp.getTime();

//         // Calculate time difference (absolute value) against game END time
//         const timeDiff = Math.abs(gameEndDate.getTime() - localMs);

//         if (timeDiff <= TIME_TOLERANCE_MS) {

//           // Extract participant data
//           const participant = matchData.info.participants.find((p: any) => p.puuid === puuid);

//           if (!participant) {
//             console.warn(`    ⚠️ Player with PUUID ${puuid} not found in match ${matchId}. Participants puuids:`,
//               matchData.info.participants.map((p: any) => p.puuid).slice(0, 12)
//             );
//             continue;
//           }


//           // Calculate kill participation
//           const teamKills = matchData.info.participants
//             .filter((p: any) => p.teamId === participant.teamId)
//             .reduce((sum: number, p: any) => sum + p.kills, 0);

//           const killParticipation = teamKills > 0
//             ? Math.round(((participant.kills + participant.assists) / teamKills) * 100)
//             : 0;

//           const riotData: RiotMatchData = {
//             matchId,
//             championName: participant.championName,
//             championId: participant.championId,
//             kills: participant.kills,
//             deaths: participant.deaths,
//             assists: participant.assists,
//             goldEarned: participant.goldEarned,
//             totalDamageDealtToChampions: participant.totalDamageDealtToChampions,
//             champLevel: participant.champLevel,
//             totalMinionsKilled: participant.totalMinionsKilled,
//             neutralMinionsKilled: participant.neutralMinionsKilled,
//             visionScore: participant.visionScore,
//             items: [
//               participant.item0,
//               participant.item1,
//               participant.item2,
//               participant.item3,
//               participant.item4,
//               participant.item5,
//               participant.item6
//             ],
//             win: participant.win,
//             gameDuration: matchData.info.gameDuration,
//             gameMode: matchData.info.gameMode,
//             teamPosition: participant.teamPosition || 'UNKNOWN',
//             doubleKills: participant.doubleKills || 0,
//             tripleKills: participant.tripleKills || 0,
//             quadraKills: participant.quadraKills || 0,
//             pentaKills: participant.pentaKills || 0,
//             killParticipation
//           };

//           return { matchId, riotData };
//         } else {
//         }
//       } catch (error) {
//         console.error(`    ⚠️ Error checking match ${matchId}:`, error);
//         // Continue to next match
//       }
//     }

//     return null;
//   };

//   // Fetch the list of local recording files from the backend and try to
//   // enrich each with Riot participant data (if PUUID is available).
//   useEffect(() => {
//     const fetchMatches = async () => {
//       try {
//         // Get data directory from localStorage
//         const dataDirectory = localStorage.getItem('toolkit_data_directory');

//         if (!dataDirectory) {
//           setError('Data directory not configured. Please set it up in Toolkit Setup.');
//           setLoading(false);
//           return;
//         }


//         const encodedDataDir = encodeURIComponent(dataDirectory);
//         const url = `${API_BASE_URL}/api/matches/list-matches?game_type=league of legends&data_directory=${encodedDataDir}`;


//         const response = await fetch(url);

//         if (!response.ok) {
//           const errorText = await response.text();
//           console.error('Error response text:', errorText);
//           let errorData;
//           try {
//             errorData = JSON.parse(errorText);
//           } catch {
//             throw new Error(`Server error: ${response.status} - ${errorText}`);
//           }
//           throw new Error(errorData.detail || 'Failed to fetch matches');
//         }

//         const data = await response.json();

//         if (data.success) {
//           // Initialize matches with loading state
//           const enrichedMatches: EnrichedMatch[] = data.matches.map((m: Match) => ({
//             ...m,
//             loading: true
//           }));

//           setMatches(enrichedMatches);

//           // Fetch Riot data for each match if we have PUUID
//           if (currentPuuid) {
//             // Detect platform first
//             const platform = await detectPlatform(currentPuuid);
//             setPlatformDetected(platform);

//             // Match each local file to a Riot match by timestamp using a per-file time window
//             const TIME_WINDOW_MS = 60 * 60 * 1000; // 1 hour window around local timestamp to fetch candidate IDs

//             const enrichmentPromises = enrichedMatches.map(async (match) => {
//               const localTimestamp = extractTimestampFromFilename(match.filename);

//               if (!localTimestamp) {
//                 console.warn(`Could not extract timestamp from: ${match.filename}`);
//                 return { ...match, loading: false };
//               }

//               // Fetch candidate match IDs from Riot within the time window
//               const candidates = await fetchMatchIdsWindow(currentPuuid, localTimestamp.getTime(), TIME_WINDOW_MS, 50);

//               if (candidates.length === 0) {
//                 console.warn(`❌ No Riot match IDs returned for ${match.filename} in window ±${TIME_WINDOW_MS / 60000}min`);
//                 return { ...match, loading: false };
//               }

//               const matchResult = await findMatchingRiotMatch(localTimestamp, candidates, currentPuuid);

//               if (matchResult) {
//                 return {
//                   ...match,
//                   riotData: matchResult.riotData,
//                   loading: false
//                 };
//               } else {
//                 console.warn(`❌ No Riot match found for: ${match.filename} after checking ${candidates.length} candidates`);
//                 return { ...match, loading: false };
//               }
//             });

//             const fullyEnrichedMatches = await Promise.all(enrichmentPromises);
//             setMatches(fullyEnrichedMatches);

//             const matchedCount = fullyEnrichedMatches.filter(m => m.riotData).length;
//           } else {
//             // No PUUID, just mark as not loading
//             setMatches(enrichedMatches.map(m => ({ ...m, loading: false })));
//           }
//         } else {
//           setError('Failed to load matches');
//         }
//       } catch (err) {
//         console.error('Error fetching matches:', err);
//         console.error('Error type:', typeof err);
//         console.error('Error stack:', err instanceof Error ? err.stack : 'N/A');

//         if (err instanceof Error) {
//           setError(err.message);
//         } else {
//           setError('Could not connect to server. Make sure FastAPI is running on port 8000.');
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchMatches();
//   }, [currentPuuid]); // Re-fetch when PUUID becomes available

//   const handleMatchClick = (match: EnrichedMatch) => {
//     setSelectedMatch(match.filename);
//   };

//   const handleViewFeedback = () => {
//     if (selectedMatch) {
//       // Navigate to the feedback review page with the match filename as a route parameter.
//       // Only include user/puuid when they are present and valid (avoid propagating 'Unknown').
//       const params = new URLSearchParams();
//       if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
//       if (currentPuuid) params.set('puuid', currentPuuid);
//       const qs = params.toString();
//       navigate(`/player/lol-feedbackreview/${selectedMatch}${qs ? `?${qs}` : ''}`);
//     }
//   };

//   const handleViewDashboard = () => {
//     if (selectedMatch) {
//       const params = new URLSearchParams();
//       params.set('matchId', selectedMatch);
//       if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
//       if (currentPuuid) params.set('puuid', currentPuuid);
//       navigate(`/player/lol-matchdashboard?${params.toString()}`);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="p-6 bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen">
//         <div className="flex items-center justify-center h-64">
//           <div className="animate-pulse">
//             <div className="text-yellow-400 text-xl mb-2 font-bold">Loading matches...</div>
//             <div className="text-yellow-300/60 text-sm font-semibold">Scanning data directory...</div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen">
//       {/* Header */}
//       <div className="mb-8">
//         <button
//           onClick={() => {
//             const params = new URLSearchParams();
//             if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
//             if (currentPuuid) params.set('puuid', currentPuuid);
//             const qs = params.toString();
//             navigate(`/player/lol-dashboard${qs ? `?${qs}` : ''}`);
//           }}
//           className="flex items-center gap-2 text-yellow-300/60 hover:text-yellow-400 mb-4 transition-colors font-bold"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//           </svg>
//           Back to Dashboard
//         </button>

//         <div className="flex items-center gap-2 mb-4">
//           <span className="text-2xl">🎮</span>
//           <h2 className="text-sm font-bold text-yellow-300/60 uppercase tracking-wider">
//             LEAGUE OF LEGENDS
//           </h2>
//         </div>
//         <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 mb-2">Match Recordings</h1>
//         <p className="text-yellow-300/60 font-semibold">
//           Select a match to review feedback or analyze performance
//         </p>
//         {currentRiotId && currentRiotId !== 'Unknown' && (
//           <p className="text-yellow-400 mt-2 font-black">Playing as: {decodeURIComponent(currentRiotId)}</p>
//         )}
//       </div>

//       {error && (
//         <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
//           <span className="text-2xl">⚠️</span>
//           <div className="flex-1">
//             <p className="text-red-400 font-bold mb-1">{error}</p>
//             {error.includes('Data directory not configured') && (
//               <button
//                 onClick={() => navigate('/player/toolkitsetup')}
//                 className="mt-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black text-sm rounded transition-all duration-300 font-black shadow-lg shadow-yellow-500/30"
//               >
//                 Go to Toolkit Setup
//               </button>
//             )}
//             {error.includes('not found') && (
//               <p className="text-red-300 text-sm mt-2 font-semibold">
//                 Make sure the data directory path is correct in Toolkit Setup.
//               </p>
//             )}
//           </div>
//         </div>
//       )}

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Match List */}
//         <div className="lg:col-span-2">
//           <div className="bg-gradient-to-br from-gray-950 to-black border-2 border-yellow-500/20 rounded-xl p-6 shadow-lg">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-white font-black text-lg">Available Matches ({matches.length})</h3>
//               {matches.length > 0 && (
//                 <button
//                   onClick={() => {
//                     const fetchMatches = async () => {
//                       setLoading(true);
//                       const dataDirectory = localStorage.getItem('toolkit_data_directory');
//                       if (dataDirectory) {
//                         const encodedDataDir = encodeURIComponent(dataDirectory);
//                         const response = await fetch(
//                           `${API_BASE_URL}/api/matches/list-matches?game_type=league of legends&data_directory=${encodedDataDir}`
//                         );
//                         const data = await response.json();
//                         if (data.success) setMatches(data.matches);
//                         setLoading(false);
//                       }
//                     };
//                     fetchMatches();
//                   }}
//                   className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1 font-bold"
//                 >
//                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                   </svg>
//                   Refresh
//                 </button>
//               )}
//             </div>

//             {matches.length === 0 && !error ? (
//               <div className="text-center py-12">
//                 <div className="text-6xl mb-4">📁</div>
//                 <p className="text-yellow-300/60 mb-2 font-semibold">No League of Legends matches found</p>
//                 <p className="text-gray-500 text-sm mt-2 font-medium">
//                   Play some games and they'll appear here!
//                 </p>
//                 <p className="text-yellow-300/40 text-xs mt-4 font-semibold">
//                   Looking for files in: {localStorage.getItem('toolkit_data_directory') || 'Not set'}
//                 </p>
//               </div>
//             ) : (
//               <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
//                 {matches.map((match) => {
//                   const riotData = match.riotData;
//                   const kda = riotData
//                     ? `${riotData.kills}/${riotData.deaths}/${riotData.assists}`
//                     : null;
//                   const kdaRatio = riotData && riotData.deaths > 0
//                     ? ((riotData.kills + riotData.assists) / riotData.deaths).toFixed(2)
//                     : riotData ? (riotData.kills + riotData.assists).toFixed(2) : null;
//                   const cs = riotData
//                     ? riotData.totalMinionsKilled + riotData.neutralMinionsKilled
//                     : null;
//                   const csPerMin = riotData && riotData.gameDuration > 0
//                     ? (cs! / (riotData.gameDuration / 60)).toFixed(1)
//                     : null;

//                   return (
//                     <div
//                       key={match.filename}
//                       onClick={() => handleMatchClick(match)}
//                       className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${selectedMatch === match.filename
//                         ? 'bg-yellow-500/20 border-yellow-500/60 shadow-lg shadow-yellow-500/20'
//                         : 'bg-gradient-to-br from-gray-900 to-black border-yellow-500/20 hover:border-yellow-500/40'
//                         }`}
//                     >
//                       {/* Loading State */}
//                       {match.loading && (
//                         <div className="flex items-center gap-2 text-yellow-400 text-xs mb-2">
//                           <div className="animate-spin">⚙️</div>
//                           <span>Loading match details...</span>
//                         </div>
//                       )}

//                       {/* Header with Champion Info */}
//                       <div className="flex items-start justify-between mb-2">
//                         <div className="flex-1">
//                           {riotData ? (
//                             <div className="flex items-center gap-3">
//                               {/* Champion Icon Placeholder */}
//                               <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
//                                 <span className="text-xl font-black text-yellow-400">
//                                   {riotData.championName.substring(0, 2).toUpperCase()}
//                                 </span>
//                               </div>
//                               <div>
//                                 <h4 className="text-white font-black text-sm mb-0.5">
//                                   {riotData.championName}
//                                 </h4>
//                                 <div className="flex items-center gap-2">
//                                   <span className={`text-xs font-bold ${riotData.win ? 'text-green-400' : 'text-red-400'}`}>
//                                     {riotData.win ? '🏆 Victory' : '💀 Defeat'}
//                                   </span>
//                                   <span className="text-yellow-300/60 text-xs">•</span>
//                                   <span className="text-yellow-300/60 text-xs font-semibold">
//                                     {Math.floor(riotData.gameDuration / 60)}m {riotData.gameDuration % 60}s
//                                   </span>
//                                 </div>
//                               </div>
//                             </div>
//                           ) : (
//                             <>
//                               <h4 className="text-white font-bold mb-1 text-sm">
//                                 {match.display_name}
//                               </h4>
//                               <p className="text-yellow-300/60 text-xs font-semibold">{match.date}</p>
//                             </>
//                           )}
//                         </div>
//                         {selectedMatch === match.filename && (
//                           <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
//                             <span className="text-black text-xs font-black">✓</span>
//                           </div>
//                         )}
//                       </div>

//                       {/* Stats Row */}
//                       {riotData && (
//                         <div className="grid grid-cols-4 gap-2 my-3 pb-3 border-b border-yellow-500/20">
//                           <div className="text-center">
//                             <p className="text-yellow-300/60 text-[10px] uppercase font-bold mb-1">KDA</p>
//                             <p className="text-white font-black text-xs">{kda}</p>
//                             <p className="text-yellow-400 text-[10px] font-bold">{kdaRatio}:1</p>
//                           </div>
//                           <div className="text-center">
//                             <p className="text-yellow-300/60 text-[10px] uppercase font-bold mb-1">CS</p>
//                             <p className="text-white font-black text-xs">{cs}</p>
//                             <p className="text-yellow-400 text-[10px] font-bold">{csPerMin}/min</p>
//                           </div>
//                           <div className="text-center">
//                             <p className="text-yellow-300/60 text-[10px] uppercase font-bold mb-1">Gold</p>
//                             <p className="text-white font-black text-xs">{(riotData.goldEarned / 1000).toFixed(1)}k</p>
//                             <p className="text-yellow-400 text-[10px] font-bold">Level {riotData.champLevel}</p>
//                           </div>
//                           <div className="text-center">
//                             <p className="text-yellow-300/60 text-[10px] uppercase font-bold mb-1">KP</p>
//                             <p className="text-white font-black text-xs">{riotData.killParticipation}%</p>
//                             <p className="text-yellow-400 text-[10px] font-bold">Vision {riotData.visionScore}</p>
//                           </div>
//                         </div>
//                       )}

//                       {/* Items Row */}
//                       {riotData && (
//                         <div className="flex gap-1 mb-3">
//                           {riotData.items.slice(0, 6).map((itemId, idx) => (
//                             <div
//                               key={idx}
//                               className={`w-6 h-6 rounded border ${itemId > 0
//                                 ? 'bg-gray-800 border-yellow-500/30'
//                                 : 'bg-gray-900/50 border-gray-700/30'
//                                 } flex items-center justify-center`}
//                             >
//                               {itemId > 0 ? (
//                                 <img
//                                   src={`https://ddragon.leagueoflegends.com/cdn/15.1.1/img/item/${itemId}.png`}
//                                   alt={`Item ${itemId}`}
//                                   className="w-full h-full rounded"
//                                   onError={(e) => {
//                                     e.currentTarget.style.display = 'none';
//                                   }}
//                                 />
//                               ) : (
//                                 <span className="text-gray-600 text-[8px]">•</span>
//                               )}
//                             </div>
//                           ))}
//                         </div>
//                       )}

//                       {/* Badges */}
//                       <div className="flex gap-2 flex-wrap">
//                         {match.has_video && (
//                           <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1 font-bold border border-green-500/30">
//                             <span>🎥</span> Video
//                           </span>
//                         )}
//                         {match.has_merged_data && (
//                           <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded flex items-center gap-1 font-bold border border-yellow-500/30">
//                             <span>📊</span> Data
//                           </span>
//                         )}
//                         {!match.has_video && (
//                           <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded flex items-center gap-1 font-semibold border border-gray-600/30">
//                             <span>⚠️</span> No Video
//                           </span>
//                         )}
//                         {riotData && riotData.pentaKills > 0 && (
//                           <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1 font-bold border border-purple-500/30 animate-pulse">
//                             <span>🏆</span> PENTA!
//                           </span>
//                         )}
//                         {riotData && riotData.quadraKills > 0 && !riotData.pentaKills && (
//                           <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded flex items-center gap-1 font-bold border border-pink-500/30">
//                             <span>⚡</span> Quadra
//                           </span>
//                         )}
//                         {riotData && riotData.tripleKills > 0 && !riotData.quadraKills && (
//                           <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1 font-bold border border-blue-500/30">
//                             <span>⭐</span> Triple
//                           </span>
//                         )}
//                         {riotData && riotData.teamPosition && riotData.teamPosition !== 'UNKNOWN' && (
//                           <span className="px-2 py-1 bg-gray-700/20 text-gray-300 text-xs rounded font-semibold border border-gray-600/30">
//                             {riotData.teamPosition}
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Action Panel */}
//         <div className="space-y-6">
//           <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black text-center mb-6">ACTIONS</h3>

//             {!selectedMatch ? (
//               <div className="text-center py-8">
//                 <div className="text-4xl mb-3">👈</div>
//                 <p className="text-yellow-300/60 text-sm font-semibold">Select a match to continue</p>
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 <button
//                   onClick={handleViewFeedback}
//                   disabled={!matches.find(m => m.filename === selectedMatch)?.has_video}
//                   className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-lg font-black transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30"
//                 >
//                   <span>🎬</span> Video Feedback Review
//                 </button>

//                 <button
//                   onClick={handleViewDashboard}
//                   className="w-full py-3 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-black transition-all duration-300 flex items-center justify-center gap-2 border border-yellow-500/20"
//                 >
//                   <span>📊</span> Match Dashboard
//                 </button>

//                 {!matches.find(m => m.filename === selectedMatch)?.has_video && (
//                   <p className="text-yellow-400 text-xs text-center pt-2 font-bold">
//                     ⚠️ Video file not found for this match
//                   </p>
//                 )}

//                 <div className="pt-4 border-t border-yellow-500/20">
//                   <p className="text-yellow-300/60 text-xs text-center break-words font-semibold">
//                     {matches.find(m => m.filename === selectedMatch)?.display_name}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Info Card */}
//           <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
//             <h3 className="text-white font-black mb-4">📋 Quick Info</h3>
//             <div className="space-y-3 text-sm">
//               <div className="flex justify-between">
//                 <span className="text-yellow-300/60 font-semibold">Total Matches:</span>
//                 <span className="text-white font-black">{matches.length}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="text-yellow-300/60 font-semibold">With Video:</span>
//                 <span className="text-green-400 font-black">
//                   {matches.filter(m => m.has_video).length}
//                 </span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="text-yellow-300/60 font-semibold">With Data:</span>
//                 <span className="text-yellow-400 font-black">
//                   {matches.filter(m => m.has_merged_data).length}
//                 </span>
//               </div>
//             </div>
//           </div>

//           {/* Debug Info (remove in production) */}
//           {import.meta.env.DEV && (
//             <div className="bg-gradient-to-br from-gray-900 to-black border border-yellow-500/20 rounded-xl p-4">
//               <h4 className="text-yellow-300/60 font-bold text-xs mb-2">🔧 Debug Info</h4>
//               <div className="text-yellow-300/40 text-xs space-y-1 font-semibold">
//                 <p>Data Dir: {localStorage.getItem('toolkit_data_directory') || 'Not set'}</p>
//                 <p>Matches Found: {matches.length}</p>
//                 <p>Game Filter: League of Legends</p>
//                 <p>PUUID: {currentPuuid ? '✓ Available' : '❌ Missing'}</p>
//                 <p>Riot Data: {matches.filter(m => m.riotData).length}/{matches.length}</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoLRecordingList;



import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { API_BASE_URL } from '../../services/api';
import { getUser } from '../../utils/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiotMatchData {
  matchId: string;
  championName: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  champLevel: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  items: number[];
  win: boolean;
  gameDuration: number;
  gameMode: string;
  teamPosition: string;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  killParticipation: number;
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
  has_input?: boolean;
  video_path: string | null;
  merged_data_path: string | null;
}

interface EnrichedMatch extends Match {
  riotData?: RiotMatchData;
  loading?: boolean;
}

type DataSource = 'local' | 'hive';

// ─── Component ────────────────────────────────────────────────────────────────

const LoLRecordingList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getUser();

  const [matches,       setMatches]       = useState<EnrichedMatch[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [currentRiotId, setCurrentRiotId] = useState('');
  const [currentPuuid,  setCurrentPuuid]  = useState('');
  const [matchFilter,   setMatchFilter]   = useState('all');

  // Default to hive, persisted in localStorage
  const [dataSource, setDataSource] = useState<DataSource>(() =>
    (localStorage.getItem('player_lol_recording_source') as DataSource) || 'hive'
  );

  const REGION = 'europe';

  // Persist source preference
  useEffect(() => {
    localStorage.setItem('player_lol_recording_source', dataSource);
  }, [dataSource]);

  // ── Riot ID / PUUID resolution ────────────────────────────────────────────
  useEffect(() => {
    const riotIdFromUrl = searchParams.get('user');
    const puuidFromUrl  = searchParams.get('puuid');

    if (riotIdFromUrl) {
      sessionStorage.setItem('current_riot_id', riotIdFromUrl);
      sessionStorage.setItem('current_lol_riot_id', riotIdFromUrl);
      setCurrentRiotId(riotIdFromUrl);
    } else {
      const saved = sessionStorage.getItem('current_riot_id') || sessionStorage.getItem('current_lol_riot_id');
      if (saved) {
        setCurrentRiotId(saved);
        sessionStorage.setItem('current_riot_id', saved);
      }
    }

    if (puuidFromUrl) {
      sessionStorage.setItem('current_lol_puuid', puuidFromUrl);
      setCurrentPuuid(puuidFromUrl);
    } else {
      const saved = sessionStorage.getItem('current_lol_puuid');
      if (saved) setCurrentPuuid(saved);
    }
  }, [searchParams]);

  // Fetch PUUID if missing — runs only once when riotId is set but puuid isn't
  useEffect(() => {
    const fetchPuuid = async () => {
      if (currentRiotId && currentRiotId !== 'Unknown' && !currentPuuid) {
        try {
          const [gameName, tagLine] = currentRiotId.split('#');
          const res = await api.get(`/riot/account/${REGION}/${gameName}/${tagLine}`);
          setCurrentPuuid(res.data.puuid);
          sessionStorage.setItem('current_lol_puuid', res.data.puuid);
        } catch (e) {
          console.error('❌ Error fetching PUUID:', e);
        }
      }
    };
    fetchPuuid();
  }, [currentRiotId]); // intentionally omit currentPuuid to avoid re-trigger loop

  // ── Load matches when source changes ─────────────────────────────────────
  useEffect(() => {
    if (dataSource === 'hive') {
      // Check sessionStorage cache first
      const cached = sessionStorage.getItem('hive_lol_matches_cache');
      if (cached) {
        try {
          const { matches: cm, cachedAt } = JSON.parse(cached);
          if (Date.now() - cachedAt < 5 * 60 * 1000 && cm?.length > 0) {
            setMatches(cm);
            setLoading(false);
            return;
          }
        } catch { /* fall through */ }
      }
      fetchHiveMatches();
    } else {
      fetchLocalMatches();
    }
  }, [dataSource]);

  // ── Hive fetch ────────────────────────────────────────────────────────────
  const fetchHiveMatches = async () => {
    setLoading(true);
    setError('');
    setMatches([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/hive/list-matches?game_type=league of legends`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        const result = (data.matches || []).map((m: Match) => ({ ...m, loading: false }));
        setMatches(result);
        sessionStorage.setItem('hive_lol_matches_cache', JSON.stringify({
          matches: result,
          cachedAt: Date.now(),
        }));
      } else {
        setError('Failed to load matches from Hive');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to Hive. Make sure you are on the university network.');
    } finally {
      setLoading(false);
    }
  };

  // ── Local fetch (with Riot enrichment) ───────────────────────────────────
  const fetchLocalMatches = async () => {
    setLoading(true);
    setError('');
    setMatches([]);
    try {
      const dataDirectory = localStorage.getItem('toolkit_data_directory');
      if (!dataDirectory) {
        setError('Data directory not configured. Please set it up in Toolkit Setup.');
        setLoading(false);
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/matches/list-matches?game_type=league of legends&data_directory=${encodeURIComponent(dataDirectory)}`
      );
      if (!res.ok) {
        const errText = await res.text();
        let errData;
        try { errData = JSON.parse(errText); } catch { throw new Error(`Server error: ${res.status}`); }
        throw new Error(errData.detail || 'Failed to fetch matches');
      }

      const data = await res.json();
      if (!data.success) { setError('Failed to load matches'); return; }

      const enrichedMatches: EnrichedMatch[] = data.matches.map((m: Match) => ({ ...m, loading: true }));
      setMatches(enrichedMatches);

      // Riot enrichment — only if PUUID available
      if (currentPuuid) {
        const TIME_WINDOW_MS = 60 * 60 * 1000;

        const enrichmentPromises = enrichedMatches.map(async (match) => {
          const localTimestamp = extractTimestampFromFilename(match.filename);
          if (!localTimestamp) return { ...match, loading: false };

          const candidates = await fetchMatchIdsWindow(currentPuuid, localTimestamp.getTime(), TIME_WINDOW_MS, 50);
          if (candidates.length === 0) return { ...match, loading: false };

          const result = await findMatchingRiotMatch(localTimestamp, candidates, currentPuuid);
          return result
            ? { ...match, riotData: result.riotData, loading: false }
            : { ...match, loading: false };
        });

        const fullyEnriched = await Promise.all(enrichmentPromises);
        setMatches(fullyEnriched);
      } else {
        setMatches(enrichedMatches.map(m => ({ ...m, loading: false })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const refreshMatches = () => {
    if (dataSource === 'hive') {
      sessionStorage.removeItem('hive_lol_matches_cache');
      fetchHiveMatches();
    } else {
      fetchLocalMatches();
    }
  };

  // ── Riot helpers (unchanged from doc 15) ─────────────────────────────────
  const extractTimestampFromFilename = (filename: string): Date | null => {
    const parts = filename.split('_');
    let dateStr = '', timeStr = '';
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].match(/^\d{2}-\d{2}-\d{4}$/)) {
        dateStr = parts[i];
        if (i + 1 < parts.length && parts[i + 1].match(/^\d{2}-\d{2}-\d{2}$/)) timeStr = parts[i + 1];
        break;
      }
    }
    if (!dateStr || !timeStr) return null;
    const [day, month, year] = dateStr.split('-').map(Number);
    const [hour, minute, second] = timeStr.split('-').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  };

  const fetchMatchIdsWindow = async (puuid: string, localMs: number, windowMs: number, count: number): Promise<string[]> => {
    try {
      const res = await api.get(`/riot/matches/${REGION}/${puuid}?count=${count}&startTime=${Math.max(0, localMs - windowMs)}&endTime=${localMs + windowMs}`);
      return res.data || [];
    } catch { return []; }
  };

  const findMatchingRiotMatch = async (
    localTimestamp: Date,
    matchIds: string[],
    puuid: string
  ): Promise<{ matchId: string; riotData: RiotMatchData } | null> => {
    const TIME_TOLERANCE_MS = 10 * 60 * 6000;
    for (const matchId of matchIds) {
      try {
        const res = await api.get(`/riot/match/${REGION}/${matchId}`);
        const md = res.data;
        const gameStartMs = md.info.gameStartTimestamp || md.info.gameCreation;
        const gameEndMs = md.info.gameEndTimestamp || (gameStartMs + (md.info.gameDuration || 0) * 1000);
        if (Math.abs(new Date(gameEndMs).getTime() - localTimestamp.getTime()) > TIME_TOLERANCE_MS) continue;

        const p = md.info.participants.find((x: any) => x.puuid === puuid);
        if (!p) continue;

        const teamKills = md.info.participants.filter((x: any) => x.teamId === p.teamId).reduce((s: number, x: any) => s + x.kills, 0);
        return {
          matchId,
          riotData: {
            matchId, championName: p.championName, championId: p.championId,
            kills: p.kills, deaths: p.deaths, assists: p.assists,
            goldEarned: p.goldEarned, totalDamageDealtToChampions: p.totalDamageDealtToChampions,
            champLevel: p.champLevel, totalMinionsKilled: p.totalMinionsKilled,
            neutralMinionsKilled: p.neutralMinionsKilled, visionScore: p.visionScore,
            items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
            win: p.win, gameDuration: md.info.gameDuration, gameMode: md.info.gameMode,
            teamPosition: p.teamPosition || 'UNKNOWN',
            doubleKills: p.doubleKills || 0, tripleKills: p.tripleKills || 0,
            quadraKills: p.quadraKills || 0, pentaKills: p.pentaKills || 0,
            killParticipation: teamKills > 0 ? Math.round(((p.kills + p.assists) / teamKills) * 100) : 0,
          }
        };
      } catch { continue; }
    }
    return null;
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredMatches = matches.filter(m => {
    switch (matchFilter) {
      case 'complete':     return !!(m.has_video && m.has_emotions && m.has_gaze && m.has_input);
      case 'has_video':    return !!m.has_video;
      case 'has_emotions': return !!m.has_emotions;
      case 'has_gaze':     return !!m.has_gaze;
      default:             return true;
    }
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleViewFeedback = () => {
    if (!selectedMatch) return;
    const params = new URLSearchParams();
    params.set('source', dataSource);
    if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
    if (currentPuuid) params.set('puuid', currentPuuid);
    navigate(`/player/lol-feedbackreview/${selectedMatch}?${params.toString()}`);
  };

  const handleViewDashboard = () => {
    if (!selectedMatch) return;
    const params = new URLSearchParams();
    params.set('matchId', selectedMatch);
    params.set('source', dataSource);
    if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
    if (currentPuuid) params.set('puuid', currentPuuid);
    navigate(`/player/lol-matchdashboard?${params.toString()}`);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="text-yellow-400 text-xl mb-2 font-bold">Loading matches...</div>
          <div className="text-yellow-300/60 text-sm font-semibold">
            {dataSource === 'hive' ? 'Connecting to Hive server...' : 'Scanning data directory...'}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-black via-gray-900 to-yellow-900/10 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (currentRiotId && currentRiotId !== 'Unknown') params.set('user', currentRiotId);
            if (currentPuuid) params.set('puuid', currentPuuid);
            navigate(`/player/lol-dashboard${params.toString() ? `?${params}` : ''}`);
          }}
          className="flex items-center gap-2 text-yellow-300/60 hover:text-yellow-400 mb-4 transition-colors font-bold"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎮</span>
          <h2 className="text-sm font-bold text-yellow-300/60 uppercase tracking-wider">LEAGUE OF LEGENDS</h2>
        </div>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 mb-2">
          Match Recordings
        </h1>
        <p className="text-yellow-300/60 font-semibold">Select a match to review feedback or analyze performance</p>
        {currentRiotId && currentRiotId !== 'Unknown' && (
          <p className="text-yellow-400 mt-2 font-black">Playing as: {decodeURIComponent(currentRiotId)}</p>
        )}
      </div>

      {/* Data Source Toggle */}
      <div className="mb-6 bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-white font-bold text-sm mb-1">Data Source</h3>
            <p className="text-yellow-300/60 text-xs">
              {dataSource === 'hive'
                ? 'Reading files from Hive server (10.4.28.2) — university network required'
                : 'Reading files from local toolkit data directory'}
            </p>
          </div>
          <div className="flex items-center bg-gray-900 rounded-lg p-1 gap-1">
            <button
              onClick={() => setDataSource('local')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                dataSource === 'local' ? 'bg-yellow-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              💻 Local
            </button>
            <button
              onClick={() => setDataSource('hive')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                dataSource === 'hive' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              🖥️ Hive Server
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-red-400 font-bold mb-1">{error}</p>
            {error.includes('Data directory not configured') && (
              <button onClick={() => navigate('/player/toolkitsetup')}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-sm rounded font-black">
                Go to Toolkit Setup
              </button>
            )}
            {dataSource === 'hive' && (
              <p className="text-red-300 text-sm mt-2 font-semibold">Make sure you are on the university network or VPN.</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Match List */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-gray-950 to-black border-2 border-yellow-500/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-black text-lg">
                  Available Matches ({filteredMatches.length}{filteredMatches.length !== matches.length ? ` of ${matches.length}` : ''})
                </h3>
                {dataSource === 'hive' && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-bold border border-blue-500/30">HIVE</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={matchFilter}
                  onChange={e => setMatchFilter(e.target.value)}
                  className="text-xs font-bold bg-gray-900 border border-gray-600 text-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-yellow-500 cursor-pointer"
                >
                  <option value="all">All matches</option>
                  <option value="complete">Complete only</option>
                  <option value="has_video">Has video</option>
                  <option value="has_emotions">Has emotions</option>
                  <option value="has_gaze">Has gaze</option>
                </select>
                <button onClick={refreshMatches} className="text-yellow-400 hover:text-yellow-300 text-sm flex items-center gap-1 font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {filteredMatches.length === 0 && !error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">{dataSource === 'hive' ? '🖥️' : '📁'}</div>
                <p className="text-yellow-300/60 mb-2 font-semibold">
                  {dataSource === 'hive' ? 'No LoL matches found on Hive server' : 'No League of Legends matches found'}
                </p>
                {dataSource === 'local' && (
                  <p className="text-yellow-300/40 text-xs mt-4 font-semibold">
                    Looking for files in: {localStorage.getItem('toolkit_data_directory') || 'Not set'}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredMatches.map((match) => {
                  const rd = match.riotData;
                  const kda = rd ? `${rd.kills}/${rd.deaths}/${rd.assists}` : null;
                  const kdaRatio = rd ? (rd.deaths > 0 ? ((rd.kills + rd.assists) / rd.deaths).toFixed(2) : (rd.kills + rd.assists).toFixed(2)) : null;
                  const cs = rd ? rd.totalMinionsKilled + rd.neutralMinionsKilled : null;
                  const csPerMin = rd && rd.gameDuration > 0 ? (cs! / (rd.gameDuration / 60)).toFixed(1) : null;

                  return (
                    <div
                      key={match.filename}
                      onClick={() => setSelectedMatch(match.filename)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                        selectedMatch === match.filename
                          ? 'bg-yellow-500/20 border-yellow-500/60 shadow-lg shadow-yellow-500/20'
                          : 'bg-gradient-to-br from-gray-900 to-black border-yellow-500/20 hover:border-yellow-500/40'
                      }`}
                    >
                      {match.loading && (
                        <div className="flex items-center gap-2 text-yellow-400 text-xs mb-2">
                          <div className="animate-spin">⚙️</div>
                          <span>Loading match details...</span>
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          {rd ? (
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
                                <span className="text-xl font-black text-yellow-400">{rd.championName.substring(0, 2).toUpperCase()}</span>
                              </div>
                              <div>
                                <h4 className="text-white font-black text-sm mb-0.5">{rd.championName}</h4>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold ${rd.win ? 'text-green-400' : 'text-red-400'}`}>
                                    {rd.win ? '🏆 Victory' : '💀 Defeat'}
                                  </span>
                                  <span className="text-yellow-300/60 text-xs">•</span>
                                  <span className="text-yellow-300/60 text-xs font-semibold">
                                    {Math.floor(rd.gameDuration / 60)}m {rd.gameDuration % 60}s
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="text-white font-bold mb-1 text-sm">{match.display_name}</h4>
                              <p className="text-yellow-300/60 text-xs font-semibold">{match.date}</p>
                            </>
                          )}
                        </div>
                        {selectedMatch === match.filename && (
                          <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-black text-xs font-black">✓</span>
                          </div>
                        )}
                      </div>

                      {rd && (
                        <div className="grid grid-cols-4 gap-2 my-3 pb-3 border-b border-yellow-500/20">
                          {[
                            { label:'KDA',   top: kda,                              bot: `${kdaRatio}:1` },
                            { label:'CS',    top: String(cs),                       bot: `${csPerMin}/min` },
                            { label:'Gold',  top: `${(rd.goldEarned/1000).toFixed(1)}k`, bot: `Level ${rd.champLevel}` },
                            { label:'KP',    top: `${rd.killParticipation}%`,       bot: `Vision ${rd.visionScore}` },
                          ].map(({ label, top, bot }) => (
                            <div key={label} className="text-center">
                              <p className="text-yellow-300/60 text-[10px] uppercase font-bold mb-1">{label}</p>
                              <p className="text-white font-black text-xs">{top}</p>
                              <p className="text-yellow-400 text-[10px] font-bold">{bot}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {rd && (
                        <div className="flex gap-1 mb-3">
                          {rd.items.slice(0, 6).map((itemId, idx) => (
                            <div key={idx} className={`w-6 h-6 rounded border ${itemId > 0 ? 'bg-gray-800 border-yellow-500/30' : 'bg-gray-900/50 border-gray-700/30'} flex items-center justify-center`}>
                              {itemId > 0 ? (
                                <img src={`https://ddragon.leagueoflegends.com/cdn/15.1.1/img/item/${itemId}.png`}
                                  alt={`Item ${itemId}`} className="w-full h-full rounded"
                                  onError={e => { e.currentTarget.style.display = 'none'; }} />
                              ) : <span className="text-gray-600 text-[8px]">•</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {match.has_video    && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded flex items-center gap-1 font-bold border border-green-500/30">🎥 Video</span>}
                        {match.has_merged_data && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded flex items-center gap-1 font-bold border border-yellow-500/30">📊 Data</span>}
                        {match.has_emotions && <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded flex items-center gap-1 font-bold border border-orange-500/30">😊 Emotions</span>}
                        {match.has_gaze     && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1 font-bold border border-purple-500/30">👁️ Gaze</span>}
                        {!match.has_video   && <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded flex items-center gap-1 border border-gray-600/30">⚠️ No Video</span>}
                        {rd?.pentaKills > 0  && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded flex items-center gap-1 font-bold border border-purple-500/30 animate-pulse">🏆 PENTA!</span>}
                        {rd?.quadraKills > 0 && !rd.pentaKills  && <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded flex items-center gap-1 font-bold border border-pink-500/30">⚡ Quadra</span>}
                        {rd?.tripleKills > 0 && !rd.quadraKills && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded flex items-center gap-1 font-bold border border-blue-500/30">⭐ Triple</span>}
                        {rd?.teamPosition && rd.teamPosition !== 'UNKNOWN' && <span className="px-2 py-1 bg-gray-700/20 text-gray-300 text-xs rounded font-semibold border border-gray-600/30">{rd.teamPosition}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black text-center mb-6">ACTIONS</h3>
            {!selectedMatch ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">👈</div>
                <p className="text-yellow-300/60 text-sm font-semibold">Select a match to continue</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button onClick={handleViewFeedback}
                  disabled={!matches.find(m => m.filename === selectedMatch)?.has_video}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-lg font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/30">
                  🎬 Video Feedback Review
                </button>
                <button onClick={handleViewDashboard}
                  className="w-full py-3 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-black flex items-center justify-center gap-2 border border-yellow-500/20">
                  📊 Match Dashboard
                </button>
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

          <div className="bg-gradient-to-br from-gray-950 to-black border border-yellow-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-white font-black mb-4">📋 Quick Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-yellow-300/60 font-semibold">Source:</span>
                <span className={`font-black ${dataSource === 'hive' ? 'text-blue-400' : 'text-yellow-400'}`}>
                  {dataSource === 'hive' ? '🖥️ Hive' : '💻 Local'}
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
              <div className="flex justify-between">
                <span className="text-yellow-300/60 font-semibold">Riot Matched:</span>
                <span className="text-blue-400 font-black">{matches.filter(m => m.riotData).length}</span>
              </div>
            </div>
          </div>

          {import.meta.env.DEV && (
            <div className="bg-gradient-to-br from-gray-900 to-black border border-yellow-500/20 rounded-xl p-4">
              <h4 className="text-yellow-300/60 font-bold text-xs mb-2">🔧 Debug Info</h4>
              <div className="text-yellow-300/40 text-xs space-y-1 font-semibold">
                <p>Source: {dataSource}</p>
                <p>Data Dir: {localStorage.getItem('toolkit_data_directory') || 'Not set'}</p>
                <p>Matches: {matches.length} | Filtered: {filteredMatches.length}</p>
                <p>PUUID: {currentPuuid ? '✓' : '❌'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoLRecordingList;