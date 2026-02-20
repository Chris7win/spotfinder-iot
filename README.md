<div align="center">
  
<img src="https://img.shields.io/badge/STM32-F103C8T6-blue?style=for-the-badge&logo=stmicroelectronics&logoColor=white"/>
<img src="https://img.shields.io/badge/ESP8266-WiFi%20Module-orange?style=for-the-badge&logo=espressif&logoColor=white"/>
<img src="https://img.shields.io/badge/MQTT-Protocol-purple?style=for-the-badge&logo=eclipse-mosquitto&logoColor=white"/>
<img src="https://img.shields.io/badge/IoT-Smart%20Parking-green?style=for-the-badge"/>

# 🚗 SpotFinder IoT
### Real-Time IoT-Enabled Smart Parking System
*with Cloud Connectivity & Mobile Application*

**STM32 • ESP8266 • MQTT • Cloud • Mobile • Web**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-STM32%20%7C%20ESP8266-informational?style=flat-square)](https://www.st.com/)
[![Protocol](https://img.shields.io/badge/Protocol-MQTT%20%7C%20JSON-9cf?style=flat-square)](https://mqtt.org/)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)]()


</div>

---

## ⚡ What It Is

**SpotFinder IoT** is a real-time smart parking management system that eliminates urban parking frustration by providing instant slot availability updates to drivers. Built on the **STM32F103C8T6** microcontroller and powered by open IoT protocols, it bridges embedded hardware with cloud infrastructure and mobile accessibility — making parking smarter, faster, and greener.

> 💡 *Average drivers waste **17 hours/year** searching for parking. SpotFinder IoT cuts that search time by up to **70%**.*

---

## 🧠 System Flow

IR Sensors → STM32 (Processing + Debounce)
→ ESP8266 (WiFi + MQTT)
→ Cloud MQTT Broker (JSON)
→ Mobile App / Web Dashboard


Local LCD display shows live slot count at the entrance.

---

## 🛠 Tech Stack

### 🔩 Embedded Layer
- STM32F103C8T6 (Blue Pill)
- HAL Libraries
- IR Proximity Sensors
- LCD (I2C)
- Debouncing Logic

### 📡 Communication
- ESP8266 WiFi Module
- MQTT Protocol
- JSON Payloads
- Pub/Sub Architecture

### ☁ Cloud & Interface
- MQTT Broker (Mosquitto / HiveMQ)
- Android Application
- iOS Application
- Web Dashboard (Real-Time View)

---

## 📈 Why It Matters

- ⏱ Reduces parking search time by up to 70%
- 🚦 Decreases urban congestion
- 🌱 Lowers fuel waste and emissions
- 📊 Improves space utilization
- 🔌 Scales from 4 slots to 100+

---

## 🚀 Getting Started

```bash
git clone https://github.com/your-username/spotfinder-iot.git
git checkout hardware   # STM32 + ESP8266 code
git checkout dashboard  # Web interface
git checkout mobile     # Android / iOS app
Flash firmware via STM32CubeIDE.
Upload ESP8266 sketch via Arduino IDE.
Run dashboard locally or deploy.

👥 Team
Bhuvanesh N

Chriswin J

Janarthanan M

Embedded Systems & IoT Project — ECE

📄 License
MIT License — free to use, modify, and distribute with attribution.


---
