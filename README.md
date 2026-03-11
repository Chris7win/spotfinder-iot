<div align="center">

# 🅿️ SpotFinder — IoT Smart Parking Dashboard

**Real-time parking management powered by IoT sensors, live data, and intelligent analytics.**

![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-IoT%20Sensors-660066?logo=eclipsemosquitto&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## About SpotFinder

**SpotFinder** is a full-stack smart parking ecosystem that combines **hardware IoT sensors**, a **real-time web dashboard**, and a **companion mobile app** to solve urban parking chaos.

The system uses **IR sensors** connected to an ESP32/Arduino microcontroller to detect vehicle presence in physical parking slots. Sensor data is published over **MQTT (WebSocket)** and flows into this dashboard in real time — giving parking operators instant visibility into every slot, every session, and every rupee earned.

This repository contains the **Admin & Client Dashboard** — the operational nerve center of SpotFinder.

---

## The SpotFinder Ecosystem

| Component | Description |
|---|---|
| **🔧 Hardware Layer** | IR sensors + ESP32 microcontroller detecting vehicle occupancy for slots 1–4 |
| **📡 MQTT Broker** | Mosquitto WebSocket broker relaying live sensor data (`spotfinder/slots` topic) |
| **🖥️ Web Dashboard** | This repo — React-based admin panel + public-facing client view |
| **📱 Mobile App** | SpotFinder Android app for users to book slots, pay, and get QR-based entry |
| **☁️ Backend** | Supabase (PostgreSQL + Realtime subscriptions + Authentication) |

### How It Works

```
IR Sensors → ESP32 → MQTT Broker → Web Dashboard (Real-time)
                                  ↕
                              Supabase DB ← Mobile App (Bookings)
                                  ↕
                          Admin Dashboard (Full Control)
```

**Slots 1–4** are hardware-controlled by physical IR sensors. **Slots 5–20** are software-managed expansion slots — allowing the system to scale beyond physical hardware.

---

## Features

### 🌐 Public Client Dashboard

- **Live parking grid** — real-time slot availability merging MQTT sensor data with database state
- **Smart hero section** — time-aware greetings, rotating taglines, and a live available-spot counter
- **Dynamic pricing display** — rates pulled from the database in real time
- **Mobile app CTA** — direct download link for the SpotFinder Android companion app
- **MQTT status indicator** — live/offline connection badge

### 🔐 Admin Dashboard (8 Tabs)

#### Overview
- Live slot tiles with color-coded status (Available / Occupied / Reserved / Inactive)
- Hardware heartbeat monitoring (Live / Stale / Offline)
- Key metrics: occupancy %, revenue, cars parked, active sessions
- Recent activity feed and system health panel (MQTT, Supabase, sensor status)

#### Slot Monitor
- Card view and table view toggle for all 20 slots
- Per-slot details: MQTT status, sensor reading, booking state, vehicle, heartbeat
- Admin actions: **Force Free**, **Force Occupied**, **Disable** per slot
- Slot counter widget to activate/deactivate slots (1–20 range)

#### Walk-in Manager
- Walk-in registration: customer info, vehicle details, slot selection, payment method (Cash/UPI)
- **Live session table** with real-time elapsed timer (HH:MM:SS)
- Dynamic pricing: fixed-duration uses rate table; open sessions calculate hourly rate live
- Per-session: **End Session**, **Generate Bill**, **Print 80mm PDF Receipt**, **Send WhatsApp Receipt**

#### Bookings Manager
- **QR Code Verifier**: enter/scan token → view booking details with rendered QR
- Booking filters by date, slot, and status (Pending → Confirmed → Completed → Cancelled)
- Full lifecycle management: Confirm → End Session → Generate Bill
- Per-booking actions: View QR, Confirm, Cancel, End Session, PDF Bill, WhatsApp Receipt

#### Bill Center
- Summary cards: bills today, revenue today, walk-in vs booking split
- Filterable bill table (date, type, payment status)
- Per-bill: **Print receipt** (80mm thermal format), **WhatsApp**, **Detail modal**

#### Accounting & Revenue
- Income overview panels: Walk-in (Today/Week/Month + Cash vs UPI) and App Booking
- **Interactive charts**: Walk-in vs Booking daily income (bar), Revenue Trend (line)
- Combined monthly revenue display
- **Export**: Monthly PDF Report (jsPDF) + Excel download (SheetJS)
- Usage analytics: Peak Hour, Most Used Slot, Total Cars

#### Daily Records
- Historical date picker to review any past day
- Summary: Total Cars, Bookings, Walk-ins, Revenue
- Slot-wise breakdown table (sessions, hours, revenue per slot)
- Full activity log with entry/exit times and durations

#### Settings
- **General**: Parking lot name, address, operating hours
- **Security**: Change admin password (Supabase re-auth flow)
- **System Info**: Slot counts, hardware config, MQTT broker URL, Supabase connection status

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · Vite 7 · React Router DOM 7 |
| **Styling** | Tailwind CSS 4 · Custom component CSS |
| **Backend & Database** | Supabase (PostgreSQL + Realtime + Auth) |
| **IoT Protocol** | MQTT 5 over WebSocket |
| **Charts & Visualization** | Recharts (Bar, Line) |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **Excel Export** | SheetJS (xlsx) |
| **CSV Parsing** | PapaParse |
| **QR Codes** | qrcode.react |
| **Icons** | Lucide React |

---

## Database Schema

| Table | Purpose |
|---|---|
| `parking_slots` | Slot state — active, occupied, booked, vehicle ID, location |
| `slot_status` | Hardware heartbeat tracking per sensor slot |
| `bookings` | App-based reservations with QR tokens & arrival time |
| `walk_in_sessions` | Manual walk-in sessions with entry/exit & billing |
| `bills` | Unified billing for walk-in + booking (payment method/status) |
| `parking_logs` | Entry/exit log with duration tracking |
| `pricing` | Configurable duration → price mapping |

---

## MQTT Payload Format

Published by the ESP32 hardware on topic `spotfinder/slots`:

```json
{
  "slot1": 0,
  "slot2": 1,
  "slot3": 0,
  "slot4": 1,
  "free": 2,
  "total": 4,
  "ts": 1741689600
}
```

`0` = free, `1` = occupied — updated in real time by IR sensors.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- A **Supabase** project with the required tables
- MQTT broker (default: `test.mosquitto.org`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/spotfinder-iot-dashboard.git
cd spotfinder-iot-dashboard

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_EMAILS=admin@example.com
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── App.jsx                  # Routes — Client (/) and Admin (/admin)
├── main.jsx                 # App entry point
├── index.css                # Global styles + Tailwind
├── components/
│   ├── Navbar.jsx           # Dual-mode navbar (Client / Admin)
│   ├── LoginModal.jsx       # Supabase email/password auth
│   ├── ProtectedRoute.jsx   # Auth guard with email whitelist
│   ├── SlotGrid.jsx         # Live parking slot grid
│   ├── SlotCard.jsx         # Individual slot card with status
│   └── StatsBar.jsx         # Stat summary cards
├── hooks/
│   └── useMqttSlots.js      # MQTT WebSocket hook for live sensor data
├── pages/
│   ├── ClientDashboard.jsx  # Public-facing live parking view
│   └── AdminDashboard.jsx   # Admin panel with 8 management tabs
├── tabs/
│   ├── Overview.jsx         # Dashboard overview with health metrics
│   ├── SlotMonitor.jsx      # Real-time slot monitoring & control
│   ├── WalkInManager.jsx    # Walk-in session management
│   ├── BookingsManager.jsx  # App booking lifecycle management
│   ├── BillCenter.jsx       # Billing & receipt center
│   ├── Accounting.jsx       # Revenue analytics & exports
│   ├── DailyRecords.jsx     # Historical daily reports
│   ├── SlotConfig.jsx       # Slot configuration & toggling
│   ├── PricingManager.jsx   # Duration-based pricing CRUD
│   ├── Settings.jsx         # System settings & security
│   └── Analytics.jsx        # Usage analytics & charts
└── supabase/
    └── client.js            # Supabase client initialization
```

---

## Screenshots

> _Coming soon — screenshots of the Client Dashboard, Admin Overview, Slot Monitor, Walk-in Manager, and Accounting panels._

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

## License

This project is part of the **SpotFinder IoT Smart Parking** ecosystem.

---

<div align="center">

**Built with ❤️ for smarter parking**

*SpotFinder — Because every spot matters.*

</div>
