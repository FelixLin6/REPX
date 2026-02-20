"""
Local BLE → WebSocket bridge for ESP32 IMU data.

Usage:
  python3 -m pip install bleak websockets
  python3 ble_bridge.py

Then the web app can subscribe to ws://localhost:8765 for live JSON packets.
"""

import asyncio
import json
import struct
from typing import Optional

from bleak import BleakClient, BleakScanner
from websockets import serve

NAME = "IMU-Joints"
TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
WS_HOST = "localhost"
WS_PORT = 8765

clients = set()


def parse_packet(data: bytearray) -> Optional[dict]:
  if len(data) < 14:
    return None
  r0, p0, y0, r1, p1, y1, seq = struct.unpack("<hhhhhhH", data[:14])
  return {
      "seq": seq,
      "r0": r0 / 100,
      "p0": p0 / 100,
      "y0": y0 / 100,
      "r1": r1 / 100,
      "p1": p1 / 100,
      "y1": y1 / 100,
      "dP": (p1 - p0) / 100,
      "dR": (r1 - r0) / 100,
      "dY": (y1 - y0) / 100,
  }


async def broadcast(payload: dict):
  if not clients:
    return
  msg = json.dumps(payload)
  await asyncio.gather(*(ws.send(msg) for ws in list(clients)), return_exceptions=True)


async def ws_handler(ws):
  clients.add(ws)
  try:
    await ws.wait_closed()
  finally:
    clients.discard(ws)


async def run_ble():
  dev = await BleakScanner.find_device_by_filter(lambda d, ad: d.name == NAME)
  if not dev:
    print(f"Device '{NAME}' not found.")
    return

  async with BleakClient(dev) as client:
    print(f"Connected to {dev.address}. Subscribing to {TX_UUID}...")

    async def on_notify(_handle, data: bytearray):
      parsed = parse_packet(data)
      if parsed:
        await broadcast(parsed)

    await client.start_notify(TX_UUID, lambda h, d: asyncio.create_task(on_notify(h, d)))
    print("Streaming notifications. Press Ctrl+C to stop.")

    while True:
      await asyncio.sleep(1)


async def main():
  ws_server = await serve(ws_handler, WS_HOST, WS_PORT)
  print(f"WebSocket server listening on ws://{WS_HOST}:{WS_PORT}")
  try:
    await run_ble()
  finally:
    ws_server.close()
    await ws_server.wait_closed()


if __name__ == "__main__":
  asyncio.run(main())
