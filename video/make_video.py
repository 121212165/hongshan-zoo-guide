"""FFmpeg 合成最终视频：每段图片+音频 → concat → 烧字幕 → output.mp4
- 输入：shots/01-09.png + audio/01-09.mp3 + storyboard 旁白文本
- 输出：video/output.mp4（1280x720, 30fps, h264+aac, 带中文字幕）
"""
import os
import re
import sys
import subprocess
from pathlib import Path
import imageio_ffmpeg

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from storyboard import SHOTS

BASE = Path(__file__).parent.resolve()
SHOTS_DIR = BASE / "shots"
AUDIO_DIR = BASE / "audio"
TMP_DIR = BASE / "tmp"
TMP_DIR.mkdir(exist_ok=True)

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def run(cmd: list, desc: str):
    print(f"\n[RUN] {desc}")
    print("  " + " ".join(f'"{c}"' if " " in c else c for c in cmd[:6]) + " ...")
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("  STDERR:", r.stderr[-1500:])
        raise RuntimeError(f"FFmpeg 失败: {desc}")
    print("  OK")

def get_duration(mp3: Path) -> float:
    """从 FFmpeg stderr 解析 Duration: 00:00:05.23"""
    r = subprocess.run([FFMPEG, "-i", str(mp3)], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", r.stderr)
    if not m:
        raise RuntimeError(f"无法解析时长: {mp3}")
    h, mi, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mi * 60 + s

def fmt_ts(sec: float) -> str:
    """SRT 时间戳：00:00:05,230"""
    h = int(sec // 3600)
    mi = int((sec % 3600) // 60)
    s = sec % 60
    ms = int(round((s - int(s)) * 1000))
    return f"{h:02d}:{mi:02d}:{int(s):02d},{ms:03d}"

def wrap_text(text: str, max_chars: int = 18) -> str:
    """按标点 + 字数断行，返回多行字符串"""
    # 在 ，。；！？—— 处断行
    parts = re.split(r"(?<=[，。；！？——])", text)
    lines = []
    cur = ""
    for p in parts:
        if not p:
            continue
        if len(cur) + len(p) <= max_chars:
            cur += p
        else:
            if cur:
                lines.append(cur)
            cur = p
    if cur:
        lines.append(cur)
    # 再处理超长行
    final = []
    for ln in lines:
        while len(ln) > max_chars:
            final.append(ln[:max_chars])
            ln = ln[max_chars:]
        if ln:
            final.append(ln)
    return "\n".join(final)

def main():
    # ===== 1. 获取每段时长，生成片段 mp4 =====
    durations = []
    for shot in SHOTS:
        sid = shot["id"]
        png = SHOTS_DIR / f"{sid}.png"
        mp3 = AUDIO_DIR / f"{sid}.mp3"
        mp4 = TMP_DIR / f"{sid}.mp4"
        if not png.exists() or not mp3.exists():
            raise FileNotFoundError(f"缺少素材: {png} / {mp3}")
        dur = get_duration(mp3)
        durations.append(dur)
        print(f"[SEG] {sid} 时长 {dur:.2f}s")

        # 图片循环 + 音频 → mp4 片段
        cmd = [
            FFMPEG, "-y",
            "-loop", "1", "-i", str(png),
            "-i", str(mp3),
            "-c:v", "libx264", "-tune", "stillimage",
            "-pix_fmt", "yuv420p", "-r", "30",
            "-t", f"{dur:.3f}",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            "-vf", "scale=1280:720,format=yuv420p",
            str(mp4),
        ]
        run(cmd, f"生成片段 {sid}.mp4")

    # ===== 2. 生成 concat 列表 =====
    list_file = TMP_DIR / "list.txt"
    with open(list_file, "w", encoding="utf-8") as f:
        for shot in SHOTS:
            mp4 = TMP_DIR / f"{shot['id']}.mp4"
            # FFmpeg concat demuxer 用正斜杠 + 单引号
            f.write(f"file '{mp4.as_posix()}'\n")
    print(f"\n[LIST] {list_file}")

    # ===== 3. 生成 SRT 字幕 =====
    srt_file = BASE / "subtitles.srt"
    with open(srt_file, "w", encoding="utf-8") as f:
        t = 0.0
        for i, shot in enumerate(SHOTS, 1):
            start = t
            end = t + durations[i - 1]
            f.write(f"{i}\n")
            f.write(f"{fmt_ts(start)} --> {fmt_ts(end)}\n")
            f.write(wrap_text(shot["narration"]) + "\n\n")
            t = end
    print(f"[SRT] {srt_file} (总时长 {t:.1f}s)")

    # ===== 4. concat + 烧字幕 → output.mp4 =====
    output = BASE / "output.mp4"
    # subtitles filter 路径：Windows 下用正斜杠，转义冒号
    srt_path = str(srt_file).replace("\\", "/").replace(":", r"\:")
    vf = (
        f"subtitles='{srt_path}'"
        ":force_style='FontName=Microsoft YaHei,FontSize=22,"
        "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
        "BackColour=&HAA000000,BorderStyle=4,Outline=0,Shadow=0,"
        "Alignment=2,MarginV=40'"
    )
    cmd = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0", "-i", str(list_file),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "192k",
        str(output),
    ]
    run(cmd, "concat + 烧字幕 → output.mp4")

    print(f"\n{'='*50}")
    print(f"✅ 视频生成完成: {output}")
    print(f"   大小: {output.stat().st_size // 1024} KB")
    print(f"   时长: {t:.1f}s")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
