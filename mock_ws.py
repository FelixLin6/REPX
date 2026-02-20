# mock_ws.py
# mock workout session
import asyncio
import json
import random
import websockets

HOST, PORT = "localhost", 8765
HZ = 50  # sampling rate to match app assumptions
DT = 1 / HZ

# 12 rep cycle emphasizing large, obvious movements:
REP_PROFILES = [
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 1
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 2
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 3
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 4
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 5
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 6
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 7
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 8
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 9
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 10
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 11
    {"label": "big_full", "total_s": 1.8, "rom": 150, "sway": 2, "jerky": False},   # rep 12
]

REST_BETWEEN_REPS_S = (0.4, 1.0)  # random rest window

async def handler(ws):
    seq = 0
    while True:
        for profile in REP_PROFILES:
            total_s = profile["total_s"]
            rom = profile["rom"]
            sway = profile["sway"]
            is_jerky = profile.get("jerky", False)
            steps_per_phase = max(1, int((total_s / 2) * HZ))

            for phase in ("up", "down"):
                for i in range(steps_per_phase):
                    seq = (seq + 1) % 65536
                    frac = i / steps_per_phase
                    base = frac if phase == "up" else (1 - frac)
                    dP = rom * base
                    if is_jerky:
                        jitter = 6 if (i % 2 == 0) else -6
                        dP += jitter
                    # upper arm sway ramps with the rep; sway > ~12 should trigger "swinging"
                    p0 = sway * base

                    payload = {
                        "seq": seq,
                        "r0": 0,
                        "p0": p0,
                        "y0": 0,
                        "r1": 0,
                        "p1": 0,
                        "y1": 0,
                        "dP": dP,
                        "dR": 0,
                        "dY": 0,
                    }
                    await ws.send(json.dumps(payload))
                    await asyncio.sleep(DT)

            # brief rest between reps to look more realistic
            rest = random.uniform(*REST_BETWEEN_REPS_S)
            rest_steps = int(rest * HZ)
            for _ in range(rest_steps):
                seq = (seq + 1) % 65536
                await ws.send(
                    json.dumps(
                        {
                            "seq": seq,
                            "r0": 0,
                            "p0": 0,
                            "y0": 0,
                            "r1": 0,
                            "p1": 0,
                            "y1": 0,
                            "dP": 0,
                            "dR": 0,
                            "dY": 0,
                        }
                    )
                )
                await asyncio.sleep(DT)

async def main():
    async with websockets.serve(handler, HOST, PORT):
        print(f"Mock feed on ws://{HOST}:{PORT}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())