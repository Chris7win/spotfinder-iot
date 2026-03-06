import { useState, useEffect, useRef } from 'react'
import mqtt from 'mqtt'

const BROKER   = 'ws://test.mosquitto.org:8081'
const TOPIC    = 'spotfinder/slots'
const HW_SLOTS = [1, 2, 3, 4]   // hardware-connected slot IDs

/**
 * useMqttSlots — connects to the MQTT broker over WebSocket and
 * parses the SpotFinder IOT slot payload.
 *
 * Returns:
 *   mqttSlots  — array of { slot_id: number, is_occupied: boolean }
 *                for hardware slots 1-4
 *   connected  — boolean, true when broker is connected
 *   free       — number of free hardware slots (from payload)
 *   total      — total hardware slots (from payload)
 *   lastTs     — timestamp from last payload (payload.ts)
 *   lastSeen   — JS Date of last received message
 */
export function useMqttSlots() {
  // Start with empty array so the dashboard falls back to Supabase data
  // until a real MQTT payload is received
  const [mqttSlots, setMqttSlots] = useState([])
  const [connected, setConnected] = useState(false)
  const [free,      setFree]      = useState(null)
  const [total,     setTotal]     = useState(null)
  const [lastTs,    setLastTs]    = useState(null)
  const [lastSeen,  setLastSeen]  = useState(null)

  const clientRef = useRef(null)

  useEffect(() => {
    const client = mqtt.connect(BROKER, {
      clientId: `spotfinder-dash-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    })

    clientRef.current = client

    client.on('connect', () => {
      setConnected(true)
      client.subscribe(TOPIC, { qos: 0 })
    })

    client.on('reconnect', () => setConnected(false))
    client.on('offline',   () => setConnected(false))
    client.on('error',     ()  => setConnected(false))

    client.on('message', (_topic, message) => {
      try {
        const payload = JSON.parse(message.toString())

        // Payload shape: { slot1:0, slot2:1, slot3:0, slot4:1, free:2, total:4, ts:12345 }
        // 0 = free, 1 = occupied
        const slots = HW_SLOTS.map(id => ({
          slot_id:     id,
          is_occupied: payload[`slot${id}`] === 1,
        }))

        setMqttSlots(slots)
        setFree(payload.free    ?? null)
        setTotal(payload.total  ?? null)
        setLastTs(payload.ts    ?? null)
        setLastSeen(new Date())
      } catch {
        // malformed payload — ignore silently
      }
    })

    return () => {
      client.end(true)
    }
  }, [])

  return { mqttSlots, connected, free, total, lastTs, lastSeen }
}
