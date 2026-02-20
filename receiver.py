import asyncio, struct
from bleak import BleakScanner, BleakClient

NAME = "IMU-Joints"
TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

def on_notify(_handle, data: bytearray):
    if len(data) < 14:
        return
    r0,p0,y0,r1,p1,y1,seq = struct.unpack("<hhhhhhH", data[:14])
    # back to degrees (0.01 deg units)
    r0/=100; p0/=100; y0/=100
    r1/=100; p1/=100; y1/=100
    print(f"seq={seq:5d} dP={p1-p0:7.2f} | dR={r1-r0:7.2f} | dY={y1-y0:7.2f}")

async def main():
    dev = await BleakScanner.find_device_by_filter(
        lambda d, ad: d.name == NAME
    )
    if not dev:
        print("Device not found.")
        return

    async with BleakClient(dev) as client:
        await client.start_notify(TX_UUID, on_notify)
        print("Connected. Receiving...")
        while True:
            await asyncio.sleep(1)

asyncio.run(main())