# import csv
# import io
# import os
# from pathlib import PurePosixPath

# import paramiko
# from dotenv import load_dotenv
# from fastapi import APIRouter, HTTPException, Query, Request
# from fastapi.responses import Response, StreamingResponse

# load_dotenv()

# router = APIRouter()

# HIVE_HOST      = os.getenv("HIVE_HOST",      "10.4.28.2")
# HIVE_USER      = os.getenv("HIVE_USER",      "kowalski")
# HIVE_PASSWORD  = os.getenv("HIVE_PASSWORD",  "")
# HIVE_BASE_PATH = os.getenv("HIVE_BASE_PATH", "/mnt/raid0/esports/sftp_data")



# def _get_sftp() -> tuple[paramiko.SSHClient, paramiko.SFTPClient]:
#     ssh = paramiko.SSHClient()
#     ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
#     ssh.connect(HIVE_HOST, username=HIVE_USER, password=HIVE_PASSWORD, timeout=10)
#     return ssh, ssh.open_sftp()


# def _listdir_safe(sftp: paramiko.SFTPClient, path: str) -> list[str]:
#     try:
#         return sftp.listdir(path)
#     except FileNotFoundError:
#         return []
#     except Exception:
#         return []


# def _parse_filename_date(filename: str) -> str:
#     parts = filename.split("_")
#     if len(parts) >= 2:
#         date_str = parts[-2]
#         time_str = parts[-1]
#         if "-" in date_str and "-" in time_str:
#             try:
#                 day, month, year = date_str.split("-")
#                 hour, minute, _ = time_str.split("-")
#                 return f"{day}/{month}/{year} {hour}:{minute}"
#             except ValueError:
#                 pass
#     return filename


# def _normalize_video_filename(filename: str) -> str:
#     for old, new in [
#         ("_merged.csv", ".mp4"),
#         ("_merged.mp4", ".mp4"),
#         (".csv",        ".mp4"),
#     ]:
#         if filename.endswith(old):
#             return filename[: -len(old)] + new
#     if not filename.endswith(".mp4"):
#         return filename + ".mp4"
#     return filename


# @router.get("/list-matches")
# def list_hive_matches(game_type: str = "valorant"):
#     ssh, sftp = None, None
#     try:
#         ssh, sftp = _get_sftp()

#         merged_dir   = f"{HIVE_BASE_PATH}/merged"
#         videos_dir   = f"{HIVE_BASE_PATH}/video"
#         emotions_dir = f"{HIVE_BASE_PATH}/emotion"
#         gaze_dir     = f"{HIVE_BASE_PATH}/gaze"
#         input_dir    = f"{HIVE_BASE_PATH}/input"

#         merged_files   = _listdir_safe(sftp, merged_dir)
#         video_files    = _listdir_safe(sftp, videos_dir)
#         emotions_files = _listdir_safe(sftp, emotions_dir)
#         gaze_files     = _listdir_safe(sftp, gaze_dir)
#         input_files    = _listdir_safe(sftp, input_dir)

#         video_stems    = {PurePosixPath(f).stem for f in video_files}
#         emotions_stems = {PurePosixPath(f).stem for f in emotions_files}
#         gaze_stems     = {PurePosixPath(f).stem for f in gaze_files}
#         input_stems    = {PurePosixPath(f).stem for f in input_files}

#         filtered = [f for f in merged_files if game_type.lower() in f.lower()]

#         matches = []
#         for filename in filtered:
#             stem = PurePosixPath(filename).stem
#             matches.append({
#                 "filename":         filename,
#                 "display_name":     filename,
#                 "game_type":        game_type,
#                 "date":             _parse_filename_date(stem),
#                 "has_video":        stem in video_stems,
#                 "has_merged_data":  True,
#                 "has_emotions":     stem in emotions_stems,
#                 "has_gaze":         stem in gaze_stems,
#                 "has_input":        stem in input_stems,
#                 "video_path":       None,
#                 "merged_data_path": None,
#             })

#         return {
#             "success": True,
#             "source":  "hive",
#             "matches": matches,
#             "directory_stats": {
#                 "merged":   len(merged_files),
#                 "videos":   len(video_files),
#                 "emotions": len(emotions_files),
#                 "gaze":     len(gaze_files),
#                 "input":    len(input_files),
#             },
#         }

#     except paramiko.AuthenticationException:
#         raise HTTPException(status_code=401, detail="Hive SFTP authentication failed — check credentials in .env")
#     except paramiko.SSHException as e:
#         raise HTTPException(status_code=503, detail=f"SSH error: {e}")
#     except TimeoutError:
#         raise HTTPException(status_code=504, detail="Hive connection timed out — are you on the university network?")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Hive error: {str(e)}")
#     finally:
#         if sftp: sftp.close()
#         if ssh:  ssh.close()



# @router.get("/video/{filename}")
# async def get_hive_video(filename: str, request: Request):
#     safe        = os.path.basename(filename)
#     safe        = _normalize_video_filename(safe)
#     remote_path = f"{HIVE_BASE_PATH}/video/{safe}"

#     ssh, sftp = None, None
#     try:
#         ssh, sftp = _get_sftp()

#         # Get file size without reading the file
#         try:
#             file_size = sftp.stat(remote_path).st_size or 0
#         except FileNotFoundError:
#             raise HTTPException(status_code=404, detail=f"Video not found on Hive: {safe}")

#         range_header = request.headers.get("range")
#         chunk_size   = 1024 * 1024  

#         # Parse range
#         if not range_header:
#             start, end = 0, file_size - 1
#         else:
#             try:
#                 unit, _, range_part = range_header.partition("=")
#                 if unit != "bytes":
#                     raise ValueError()
#                 start_str, _, end_str = range_part.partition("-")
#                 start = int(start_str) if start_str else 0
#                 end   = int(end_str)   if end_str   else file_size - 1
#                 if end >= file_size: end = file_size - 1
#                 if start > end:      raise ValueError()
#             except Exception:
#                 sftp.close(); ssh.close()
#                 return Response(status_code=416)

#         content_length = end - start + 1

#         def generate():
#             try:
#                 fh = sftp.open(remote_path, "rb")
#                 fh.seek(start)
#                 remaining = content_length
#                 while remaining > 0:
#                     data = fh.read(min(chunk_size, remaining))
#                     if not data:
#                         break
#                     remaining -= len(data)
#                     yield data
#                 fh.close()
#             finally:
#                 try: sftp.close()
#                 except Exception: pass
#                 try: ssh.close()
#                 except Exception: pass

#         headers = {
#             "Content-Range":  f"bytes {start}-{end}/{file_size}",
#             "Accept-Ranges":  "bytes",
#             "Content-Length": str(content_length),
#             "Cache-Control":  "no-cache",
#             "Content-Type":   "video/mp4",
#         }

#         return StreamingResponse(
#             generate(),
#             status_code=206 if range_header else 200,
#             headers=headers,
#         )

#     except HTTPException:
#         raise
#     except paramiko.AuthenticationException:
#         if sftp: sftp.close()
#         if ssh:  ssh.close()
#         raise HTTPException(status_code=401, detail="Hive SFTP authentication failed")
#     except Exception as e:
#         if sftp: sftp.close()
#         if ssh:  ssh.close()
#         raise HTTPException(status_code=500, detail=f"Hive video error: {str(e)}")



# @router.get("/csv-summary")
# def hive_csv_summary(subdir: str, filename: str):
#     ssh, sftp = None, None
#     try:
#         ssh, sftp = _get_sftp()
#         remote_path = f"{HIVE_BASE_PATH}/{subdir}/{filename}"

#         try:
#             file_size_mb = round((sftp.stat(remote_path).st_size or 0) / (1024 * 1024), 2)
#         except FileNotFoundError:
#             raise HTTPException(status_code=404, detail=f"File not found on Hive: {subdir}/{filename}")

#         with sftp.open(remote_path, "r") as f:
#             content = f.read().decode("utf-8", errors="replace")

#         reader  = csv.DictReader(io.StringIO(content))
#         headers = reader.fieldnames or []
#         rows    = list(reader)

#         return {
#             "file_size_mb": file_size_mb,
#             "total_rows":   len(rows),
#             "columns":      list(headers),
#             "column_count": len(headers),
#             "sample_rows":  rows[:5],
#         }

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Hive csv-summary error: {str(e)}")
#     finally:
#         if sftp: sftp.close()
#         if ssh:  ssh.close()



# @router.get("/read-csv")
# def read_hive_csv(
#     subdir:    str,
#     filename:  str,
#     max_rows:  int = 500,
#     skip_rows: int = 0,
# ):
#     ssh, sftp = None, None
#     try:
#         ssh, sftp = _get_sftp()
#         remote_path = f"{HIVE_BASE_PATH}/{subdir}/{filename}"

#         try:
#             with sftp.open(remote_path, "r") as f:
#                 content = f.read().decode("utf-8", errors="replace")
#         except FileNotFoundError:
#             raise HTTPException(status_code=404, detail=f"File not found on Hive: {subdir}/{filename}")

#         reader   = csv.DictReader(io.StringIO(content))
#         headers  = reader.fieldnames or []
#         all_rows = list(reader)
#         paged    = all_rows[skip_rows: skip_rows + max_rows]

#         return {
#             "headers":       list(headers),
#             "data":          paged,
#             "rows_returned": len(paged),
#             "total_rows":    len(all_rows),
#         }

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Hive read-csv error: {str(e)}")
#     finally:
#         if sftp: sftp.close()
#         if ssh:  ssh.close()







import csv
import io
import os
from pathlib import PurePosixPath

import paramiko
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse

load_dotenv()

router = APIRouter()

HIVE_HOST      = os.getenv("HIVE_HOST",      "10.4.28.2")
HIVE_USER      = os.getenv("HIVE_USER",      "kowalski")
HIVE_PASSWORD  = os.getenv("HIVE_PASSWORD",  "bg1337#@!")
HIVE_BASE_PATH = os.getenv("HIVE_BASE_PATH", "/mnt/raid0/esports/sftp_data")


def _get_sftp() -> tuple[paramiko.SSHClient, paramiko.SFTPClient]:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HIVE_HOST, username=HIVE_USER, password=HIVE_PASSWORD, timeout=10)
    return ssh, ssh.open_sftp()


def _listdir_safe(sftp: paramiko.SFTPClient, path: str) -> list[str]:
    try:
        return sftp.listdir(path)
    except FileNotFoundError:
        return []
    except Exception:
        return []


def _parse_filename_date(filename: str) -> str:
    parts = filename.split("_")
    if len(parts) >= 2:
        date_str = parts[-2]
        time_str = parts[-1]
        if "-" in date_str and "-" in time_str:
            try:
                day, month, year = date_str.split("-")
                hour, minute, _ = time_str.split("-")
                return f"{day}/{month}/{year} {hour}:{minute}"
            except ValueError:
                pass
    return filename


def _normalize_video_filename(filename: str) -> str:
    """Strip CSV/merged suffixes and ensure .mp4 extension."""
    for old, new in [
        ("_merged.csv", ".mp4"),
        ("_merged.mp4", ".mp4"),
        (".csv",        ".mp4"),
    ]:
        if filename.endswith(old):
            return filename[: -len(old)] + new
    if not filename.endswith(".mp4"):
        return filename + ".mp4"
    return filename



@router.get("/list-matches")
def list_hive_matches(game_type: str = "valorant"):
    ssh, sftp = None, None
    try:
        ssh, sftp = _get_sftp()

        merged_dir   = f"{HIVE_BASE_PATH}/merged"
        videos_dir   = f"{HIVE_BASE_PATH}/video"
        emotions_dir = f"{HIVE_BASE_PATH}/emotion"
        gaze_dir     = f"{HIVE_BASE_PATH}/gaze"
        input_dir    = f"{HIVE_BASE_PATH}/input"

        merged_files   = _listdir_safe(sftp, merged_dir)
        video_files    = _listdir_safe(sftp, videos_dir)
        emotions_files = _listdir_safe(sftp, emotions_dir)
        gaze_files     = _listdir_safe(sftp, gaze_dir)
        input_files    = _listdir_safe(sftp, input_dir)

        def base_stem(filename: str) -> str:
            """
            Strip extension + known data suffixes so all directories
            can be cross-referenced on the same base name.
            e.g. '3rd_game_P038_valorant_17-11-2025_15-02-02_merged.csv'
                 → '3rd_game_P038_valorant_17-11-2025_15-02-02'
            """
            stem = PurePosixPath(filename).stem
            for suffix in ("_merged", "_emotion", "_gaze", "_input"):
                if stem.endswith(suffix):
                    stem = stem[: -len(suffix)]
                    break
            return stem

        video_stems    = {base_stem(f) for f in video_files}
        emotions_stems = {base_stem(f) for f in emotions_files}
        gaze_stems     = {base_stem(f) for f in gaze_files}
        input_stems    = {base_stem(f) for f in input_files}

        filtered = [f for f in merged_files if game_type.lower() in f.lower()]

        matches = []
        for filename in filtered:
            stem = base_stem(filename)
            matches.append({
                "filename":         filename,
                "display_name":     stem,
                "game_type":        game_type,
                "date":             _parse_filename_date(stem),
                "has_video":        stem in video_stems,
                "has_merged_data":  True,
                "has_emotions":     stem in emotions_stems,
                "has_gaze":         stem in gaze_stems,
                "has_input":        stem in input_stems,
                "video_path":       None,
                "merged_data_path": None,
            })

        def _sort_key(m: dict) -> int:
            """Parse DD/MM/YYYY HH:MM from display date for descending sort."""
            try:
                date_part, time_part = m["date"].split(" ")
                day, month, year = date_part.split("/")
                hour, minute = time_part.split(":")
                from datetime import datetime
                return datetime(int(year), int(month), int(day),
                                int(hour), int(minute)).timestamp()
            except Exception:
                return 0

        matches.sort(key=_sort_key, reverse=True)

        return {
            "success": True,
            "source":  "hive",
            "matches": matches,
            "directory_stats": {
                "merged":   len(merged_files),
                "videos":   len(video_files),
                "emotions": len(emotions_files),
                "gaze":     len(gaze_files),
                "input":    len(input_files),
            },
        }

    except paramiko.AuthenticationException:
        raise HTTPException(status_code=401, detail="Hive SFTP authentication failed — check credentials in .env")
    except paramiko.SSHException as e:
        raise HTTPException(status_code=503, detail=f"SSH error: {e}")
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Hive connection timed out — are you on the university network?")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hive error: {str(e)}")
    finally:
        if sftp: sftp.close()
        if ssh:  ssh.close()



@router.get("/video/{filename}")
async def get_hive_video(filename: str, request: Request):
    safe        = os.path.basename(filename)
    safe        = _normalize_video_filename(safe)
    remote_path = f"{HIVE_BASE_PATH}/video/{safe}"

    ssh, sftp = None, None
    try:
        ssh, sftp = _get_sftp()

        try:
            file_size = sftp.stat(remote_path).st_size or 0
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f"Video not found on Hive: {safe}")

        range_header = request.headers.get("range")
        chunk_size   = 1024 * 1024  

        if not range_header:
            start, end = 0, file_size - 1
        else:
            try:
                unit, _, range_part = range_header.partition("=")
                if unit != "bytes":
                    raise ValueError()
                start_str, _, end_str = range_part.partition("-")
                start = int(start_str) if start_str else 0
                end   = int(end_str)   if end_str   else file_size - 1
                if end >= file_size: end = file_size - 1
                if start > end:      raise ValueError()
            except Exception:
                sftp.close(); ssh.close()
                return Response(status_code=416)

        content_length = end - start + 1

        def generate():
            try:
                fh = sftp.open(remote_path, "rb")
                fh.seek(start)
                remaining = content_length
                while remaining > 0:
                    data = fh.read(min(chunk_size, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
                fh.close()
            finally:
                try: sftp.close()
                except Exception: pass
                try: ssh.close()
                except Exception: pass

        headers = {
            "Content-Range":  f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges":  "bytes",
            "Content-Length": str(content_length),
            "Cache-Control":  "no-cache",
            "Content-Type":   "video/mp4",
        }

        return StreamingResponse(
            generate(),
            status_code=206 if range_header else 200,
            headers=headers,
        )

    except HTTPException:
        raise
    except paramiko.AuthenticationException:
        if sftp: sftp.close()
        if ssh:  ssh.close()
        raise HTTPException(status_code=401, detail="Hive SFTP authentication failed")
    except Exception as e:
        if sftp: sftp.close()
        if ssh:  ssh.close()
        raise HTTPException(status_code=500, detail=f"Hive video error: {str(e)}")



@router.get("/csv-summary")
def hive_csv_summary(subdir: str, filename: str):
    """
    Return row count, column names and file size for a Hive CSV.
    Mirrors /api/matches/csv-summary so the frontend can use either.
    """
    ssh, sftp = None, None
    try:
        ssh, sftp = _get_sftp()
        remote_path = f"{HIVE_BASE_PATH}/{subdir}/{filename}"

        try:
            file_size_mb = round((sftp.stat(remote_path).st_size or 0) / (1024 * 1024), 2)
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f"File not found on Hive: {subdir}/{filename}")

        with sftp.open(remote_path, "r") as f:
            content = f.read().decode("utf-8", errors="replace")

        reader  = csv.DictReader(io.StringIO(content))
        headers = reader.fieldnames or []
        rows    = list(reader)

        return {
            "file_size_mb": file_size_mb,
            "total_rows":   len(rows),
            "columns":      list(headers),
            "column_count": len(headers),
            "sample_rows":  rows[:5],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hive csv-summary error: {str(e)}")
    finally:
        if sftp: sftp.close()
        if ssh:  ssh.close()


@router.get("/read-csv")
def read_hive_csv(
    subdir:    str,
    filename:  str,
    max_rows:  int = 500,
    skip_rows: int = 0,
):
    """
    Return a page of rows from a Hive CSV file.
    Same JSON shape as /api/matches/read-csv for frontend compatibility.
    Note: for analytics use /api/analytics/hive or /api/analytics/emotion-markers/hive
    which read the full file once and return pre-computed results.
    """
    ssh, sftp = None, None
    try:
        ssh, sftp = _get_sftp()
        remote_path = f"{HIVE_BASE_PATH}/{subdir}/{filename}"

        try:
            with sftp.open(remote_path, "r") as f:
                content = f.read().decode("utf-8", errors="replace")
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail=f"File not found on Hive: {subdir}/{filename}")

        reader   = csv.DictReader(io.StringIO(content))
        headers  = reader.fieldnames or []
        all_rows = list(reader)
        paged    = all_rows[skip_rows: skip_rows + max_rows]

        return {
            "headers":       list(headers),
            "data":          paged,
            "rows_returned": len(paged),
            "total_rows":    len(all_rows),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hive read-csv error: {str(e)}")
    finally:
        if sftp: sftp.close()
        if ssh:  ssh.close()