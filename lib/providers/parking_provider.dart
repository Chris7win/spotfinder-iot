import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/booking.dart';
import '../models/parking_slot.dart';
import '../services/mqtt_service.dart';
import '../services/supabase_service.dart';

class ParkingProvider extends ChangeNotifier {
  final _supabase = SupabaseService();
  final MqttService _mqtt;

  // Slots start with 4 defaults — updated ONLY by MQTT
  final List<ParkingSlot> _slots = List.generate(
    4,
    (i) => ParkingSlot(
      slotNumber: i + 1,
      physicalStatus: 'free',
      displayStatus: 'FREE',
      lastUpdated: DateTime.now(),
      isActive: true,
    ),
  );

  List<Booking> _activeBookings = [];
  bool _isLoading = false;
  bool _mqttConnected = false;
  String? _error;
  String? _currentUserId;
  StreamSubscription? _slotSub;
  StreamSubscription? _connSub;

  ParkingProvider(this._mqtt) {
    _slotSub = _mqtt.slotUpdates.listen(_onMqttUpdate);
    _connSub = _mqtt.connectionStatus.listen((connected) {
      _mqttConnected = connected;
      notifyListeners();
    });
  }

  List<ParkingSlot> get slots => _slots;
  bool get isLoading => _isLoading;
  bool get isMqttConnected => _mqttConnected;
  String? get error => _error;

  int get availableCount =>
      _slots.where((s) => s.displayStatus == 'FREE').length;
  int get totalSlots => _slots.length;

  /// Called on HomeScreen init and pull-to-refresh.
  /// Fetches bookings from Supabase to overlay BOOKED/YOUR_BOOKING on MQTT data.
  Future<void> loadSlots({String? currentUserId}) async {
    _currentUserId = currentUserId;
    _isLoading = true;
    notifyListeners();

    try {
      // Only fetch bookings from Supabase — slot status comes from MQTT
      _activeBookings = await _supabase.getAllActiveBookings();
      _resolveDisplayStatuses();
      _error = null;
    } catch (e) {
      _error = 'Failed to load bookings.';
      debugPrint('ParkingProvider.loadSlots error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  /// Called when MQTT publishes new sensor data.
  /// Updates physicalStatus and immediately re-resolves display statuses.
  void _onMqttUpdate(Map<int, String> updates) {
    for (final entry in updates.entries) {
      final idx = _slots.indexWhere((s) => s.slotNumber == entry.key);
      if (idx != -1) {
        _slots[idx] = _slots[idx].copyWith(
          physicalStatus: entry.value,
          lastUpdated: DateTime.now(),
        );
      }
    }
    // Re-resolve display statuses after every MQTT update
    _resolveDisplayStatuses();
    notifyListeners();
  }

  /// Combines MQTT sensor data + Supabase booking data into final displayStatus.
  void _resolveDisplayStatuses() {
    final nowUtc = DateTime.now().toUtc();

    for (int i = 0; i < _slots.length; i++) {
      final slot = _slots[i];
      String displayStatus = 'FREE';

      // Physical sensor check first — OCCUPIED always wins
      if (slot.physicalStatus == 'occupied') {
        displayStatus = 'OCCUPIED';
      } else {
        // Find relevant booking (active now or starting within 30 mins)
        final relevantBooking = _activeBookings.where((b) {
          if (b.slotNumber != slot.slotNumber) return false;

          final startUtc = b.bookingStart.toUtc();
          final endUtc = b.bookingEnd.toUtc();

          final isSoon =
              nowUtc.isAfter(startUtc.subtract(const Duration(minutes: 30))) &&
                  nowUtc.isBefore(startUtc);
          final isActive = nowUtc.isAfter(startUtc) && nowUtc.isBefore(endUtc);

          return isSoon || isActive;
        }).firstOrNull;

        if (relevantBooking != null) {
          if (relevantBooking.userName == _currentUserId) {
            displayStatus = 'YOUR_BOOKING';
          } else {
            displayStatus = 'BOOKED';
          }
        }
      }

      _slots[i] = slot.copyWith(displayStatus: displayStatus);
    }
  }

  Booking? getActiveBookingForSlot(int slotNumber, String? currentUserId) {
    return _activeBookings
        .where(
          (b) => b.slotNumber == slotNumber && b.userName == currentUserId,
        )
        .firstOrNull;
  }

  void refreshDisplayStatuses(String? currentUserId) {
    _currentUserId = currentUserId;
    _resolveDisplayStatuses();
    notifyListeners();
  }

  @override
  void dispose() {
    _slotSub?.cancel();
    _connSub?.cancel();
    super.dispose();
  }
}
