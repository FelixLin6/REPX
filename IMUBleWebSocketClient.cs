using UnityEngine;
using NativeWebSocket;
using System;

public class IMUBleWebSocketClient : MonoBehaviour
{
    [Header("Assign ArmControlLive")]
    public ArmControlLive armControl;      // Drag your ArmControlLive here
    public string url = "ws://localhost:8765"; // Match your Python websocket server

    private WebSocket websocket;

    async void Start()
    {
        websocket = new WebSocket(url);

        websocket.OnOpen += () =>
        {
            Debug.Log("WebSocket connected!");
        };

        websocket.OnError += (e) =>
        {
            Debug.LogError("WebSocket error: " + e);
        };

        websocket.OnClose += (e) =>
        {
            Debug.Log("WebSocket closed!");
        };

        websocket.OnMessage += (bytes) =>
        {
            string message = System.Text.Encoding.UTF8.GetString(bytes);
            ParseIMUMessage(message);
        };

        await websocket.Connect();
    }

    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        websocket?.DispatchMessageQueue();
#endif
    }

    private void ParseIMUMessage(string msg)
    {
        // Expected JSON from ble_bridge.py:
        // {
        //   "seq": int,
        //   "r0": float, "p0": float, "y0": float,
        //   "r1": float, "p1": float, "y1": float,
        //   "dP": float, "dR": float, "dY": float
        // }
        try
        {
            var payload = JsonUtility.FromJson<IMUPacket>(msg);
            if (payload == null) return;

            Quaternion upperQuat = EulerToQuaternion(payload.r0, payload.p0, payload.y0);
            Quaternion foreQuat = EulerToQuaternion(payload.r1, payload.p1, payload.y1);

            if (armControl != null)
            {
                armControl.UpdateArmData(upperQuat, foreQuat);
            }
        }
        catch (Exception e)
        {
            Debug.LogWarning("Failed to parse IMU message: " + e.Message);
        }
    }

    [Serializable]
    private class IMUPacket
    {
        public int seq;
        public float r0, p0, y0;
        public float r1, p1, y1;
        public float dP, dR, dY;
    }

    private Quaternion EulerToQuaternion(float roll, float pitch, float yaw)
    {
        // Convert degrees to radians
        float r = roll * Mathf.Deg2Rad;
        float p = pitch * Mathf.Deg2Rad;
        float y = yaw * Mathf.Deg2Rad;

        // Unity uses left-handed Y-up; convert ZYX -> Unity
        return Quaternion.Euler(pitch, yaw, roll);
    }

    private async void OnApplicationQuit()
    {
        if (websocket != null)
            await websocket.Close();
    }
}