"""用 edge-tts 生成所有旁白音频。读 storyboard.py，输出 audio/XX.mp3"""
import asyncio
import os
import sys
import edge_tts

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from storyboard import SHOTS

AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

# 选用自然亲切的女声，语速略慢便于听清
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-5%"  # 略慢

async def gen_one(text: str, out_path: str):
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(out_path)

async def main():
    for shot in SHOTS:
        out = os.path.join(AUDIO_DIR, f"{shot['id']}.mp3")
        print(f"[TTS] {shot['id']} -> {out}")
        await gen_one(shot["narration"], out)
    print("all done.")

if __name__ == "__main__":
    asyncio.run(main())
