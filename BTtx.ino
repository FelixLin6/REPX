#include <Arduino.h>
#include <Wire.h>

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Nano ESP32 I2C defaults: SDA=A4, SCL=A5 (recommended)
#define IMU_WIRE Wire

static const uint8_t IMU0_ADDR = 0x68; // AD0 -> GND
static const uint8_t IMU1_ADDR = 0x69; // AD0 -> 3.3V

// MPU6050 registers
static const uint8_t REG_PWR_MGMT1   = 0x6B;
static const uint8_t REG_GYRO_CONFIG = 0x1B;
static const uint8_t REG_ACC_CONFIG  = 0x1C;
static const uint8_t REG_ACC_XOUT_H  = 0x3B;

struct ImuState {
  uint8_t addr;
  float rollDeg  = 0.0f;
  float pitchDeg = 0.0f;
  float yawDeg   = 0.0f; // gyro-integrated; drifts
  float biasX = 0.0f;
  float biasY = 0.0f;
  float biasZ = 0.0f;
};

static int16_t toI16(uint8_t hi, uint8_t lo) {
  return (int16_t)((hi << 8) | lo);
}

static void writeReg(uint8_t addr, uint8_t reg, uint8_t val) {
  IMU_WIRE.beginTransmission(addr);
  IMU_WIRE.write(reg);
  IMU_WIRE.write(val);
  IMU_WIRE.endTransmission(true);
}

static bool readBytes(uint8_t addr, uint8_t startReg, uint8_t *buf, size_t n) {
  IMU_WIRE.beginTransmission(addr);
  IMU_WIRE.write(startReg);
  if (IMU_WIRE.endTransmission(false) != 0) return false;

  size_t got = IMU_WIRE.requestFrom((int)addr, (int)n, (int)true);
  if (got != n) return false;

  for (size_t i = 0; i < n; i++) buf[i] = (uint8_t)IMU_WIRE.read();
  return true;
}

static bool imuPing(uint8_t addr) {
  IMU_WIRE.beginTransmission(addr);
  return (IMU_WIRE.endTransmission(true) == 0);
}

static void imuInit(ImuState &imu) {
  writeReg(imu.addr, REG_PWR_MGMT1, 0x00);
  delay(50);
  writeReg(imu.addr, REG_GYRO_CONFIG, 0x00); // ±250 dps
  writeReg(imu.addr, REG_ACC_CONFIG, 0x00);  // ±2g
}

static void imuCalibrateGyro(ImuState &imu) {
  const int samples = 800;
  float sumX = 0.0f, sumY = 0.0f, sumZ = 0.0f;
  uint8_t buf[14];

  for (int i = 0; i < samples; i++) {
    if (readBytes(imu.addr, REG_ACC_XOUT_H, buf, sizeof(buf))) {
      int16_t rawGx = toI16(buf[8],  buf[9]);
      int16_t rawGy = toI16(buf[10], buf[11]);
      int16_t rawGz = toI16(buf[12], buf[13]);
      sumX += ((float)rawGx) / 131.0f;
      sumY += ((float)rawGy) / 131.0f;
      sumZ += ((float)rawGz) / 131.0f;
    }
    delay(2);
  }

  imu.biasX = sumX / (float)samples;
  imu.biasY = sumY / (float)samples;
  imu.biasZ = sumZ / (float)samples;
}

static void imuInitAnglesFromAccel(ImuState &imu) {
  uint8_t b[14];
  if (!readBytes(imu.addr, REG_ACC_XOUT_H, b, sizeof(b))) return;

  int16_t rawAx = toI16(b[0], b[1]);
  int16_t rawAy = toI16(b[2], b[3]);
  int16_t rawAz = toI16(b[4], b[5]);

  float ax = ((float)rawAx) / 16384.0f;
  float ay = ((float)rawAy) / 16384.0f;
  float az = ((float)rawAz) / 16384.0f;

  float roll  = atan2f(ay, az) * (180.0f / PI);
  float pitch = atan2f(-ax, sqrtf(ay * ay + az * az)) * (180.0f / PI);

  imu.rollDeg = roll;
  imu.pitchDeg = pitch;
  imu.yawDeg = 0.0f;
}

static bool imuUpdate(ImuState &imu, float dt, float alpha) {
  uint8_t buf[14];
  if (!readBytes(imu.addr, REG_ACC_XOUT_H, buf, sizeof(buf))) return false;

  int16_t rawAx = toI16(buf[0],  buf[1]);
  int16_t rawAy = toI16(buf[2],  buf[3]);
  int16_t rawAz = toI16(buf[4],  buf[5]);
  int16_t rawGx = toI16(buf[8],  buf[9]);
  int16_t rawGy = toI16(buf[10], buf[11]);
  int16_t rawGz = toI16(buf[12], buf[13]);

  float ax = ((float)rawAx) / 16384.0f;
  float ay = ((float)rawAy) / 16384.0f;
  float az = ((float)rawAz) / 16384.0f;

  float gx = ((float)rawGx) / 131.0f - imu.biasX;
  float gy = ((float)rawGy) / 131.0f - imu.biasY;
  float gz = ((float)rawGz) / 131.0f - imu.biasZ;

  float accRoll  = atan2f(ay, az) * (180.0f / PI);
  float accPitch = atan2f(-ax, sqrtf(ay * ay + az * az)) * (180.0f / PI);

  imu.rollDeg  = alpha * (imu.rollDeg  + gx * dt) + (1.0f - alpha) * accRoll;
  imu.pitchDeg = alpha * (imu.pitchDeg + gy * dt) + (1.0f - alpha) * accPitch;

  imu.yawDeg += gz * dt; // drift
  if (imu.yawDeg > 180.0f) imu.yawDeg -= 360.0f;
  if (imu.yawDeg < -180.0f) imu.yawDeg += 360.0f;

  return true;
}

// ---------- BLE (Nordic UART-style UUIDs, TX notify) ----------
static const char *BLE_NAME = "IMU-Joints";
static const char *SVC_UUID  = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
static const char *TX_UUID   = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";

BLECharacteristic *txChar = nullptr;
volatile bool bleConnected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) override { bleConnected = true; }
  void onDisconnect(BLEServer *pServer) override {
    bleConnected = false;
    BLEDevice::startAdvertising();
  }
};

static int16_t packAngle(float deg) {
  // deg * 100 => 0.01 deg resolution
  float x = deg * 100.0f;
  if (x > 32767.0f) x = 32767.0f;
  if (x < -32768.0f) x = -32768.0f;
  return (int16_t)x;
}

struct __attribute__((packed)) Packet {
  int16_t r0, p0, y0;
  int16_t r1, p1, y1;
  uint16_t seq;
};

// Two IMUs
ImuState imu0;
ImuState imu1;

uint32_t lastMicros = 0;
uint16_t seqNum = 0;

void setup() {
  Serial.begin(115200);
  imu0.addr = IMU0_ADDR;
  imu1.addr = IMU1_ADDR;

  // I2C on Nano ESP32: use defaults (A4/A5), but explicit begin is fine too
  IMU_WIRE.begin();
  IMU_WIRE.setClock(400000);

  bool ok0 = imuPing(IMU0_ADDR);
  bool ok1 = imuPing(IMU1_ADDR);
  Serial.print("IMU0 present: "); Serial.println(ok0 ? "YES" : "NO");
  Serial.print("IMU1 present: "); Serial.println(ok1 ? "YES" : "NO");

  imuInit(imu0);
  imuInit(imu1);

  Serial.println("Calibrating IMU0...");
  imuCalibrateGyro(imu0);
  Serial.println("Calibrating IMU1...");
  imuCalibrateGyro(imu1);

  imuInitAnglesFromAccel(imu0);
  imuInitAnglesFromAccel(imu1);

  // BLE init
  BLEDevice::init(BLE_NAME);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *svc = server->createService(SVC_UUID);
  txChar = svc->createCharacteristic(
    TX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  txChar->addDescriptor(new BLE2902());
  svc->start();

  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SVC_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("BLE advertising as IMU-Joints");
  lastMicros = micros();
}

void loop() {
  static uint32_t lastSendMs = 0;

  uint32_t now = micros();
  float dt = (float)(now - lastMicros) * 1.0e-6f;
  lastMicros = now;
  if (dt <= 0.0f || dt > 0.1f) dt = 0.01f;

  const float alpha = 0.98f;

  if (!imuUpdate(imu0, dt, alpha)) return;
  // if (!imuUpdate(imu1, dt, alpha)) return;

  // Send at 50 Hz over BLE
  if (millis() - lastSendMs >= 20) {
    lastSendMs = millis();

    if (bleConnected && txChar != nullptr) {
      Packet pkt;
      pkt.r0 = packAngle(imu0.rollDeg);
      pkt.p0 = packAngle(imu0.pitchDeg);
      pkt.y0 = packAngle(imu0.yawDeg);
      pkt.r1 = packAngle(imu1.rollDeg);
      pkt.p1 = packAngle(imu1.pitchDeg);
      pkt.y1 = packAngle(imu1.yawDeg);
      pkt.seq = seqNum++;

      txChar->setValue((uint8_t*)&pkt, sizeof(pkt));
      txChar->notify();
    }

    // Optional USB debug
    Serial.printf("dPitch: %.2f\n", imu1.pitchDeg - imu0.pitchDeg);
  }
}