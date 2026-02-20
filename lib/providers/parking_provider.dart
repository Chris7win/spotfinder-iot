import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/booking.dart';
import '../models/parking_slot.dart';
import '../services/mqtt_service.dart';
import '../services/supabase_service.dart';

class ParkingProvider extends ChangeNotifier {
  final _supabase = SupabaseService();
  final MqttService _mqtt;
  List<ParkingSlot> _slots = [];
  List<Booking> _activeBookings = [];
  bool _isLoading = false;
  bool _mqttConnected = false;
  String? _error;
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

  Future<void> loadSlots({String? currentUserId}) async {
    _isLoading = true;
    notifyListeners();

    try {
      _slots = await _supabase.getActiveSlots();
      _activeBookings = await _supabase.getAllActiveBookings();
      _resolveDisplayStatuses(currentUserId);
      _error = null;
    } catch (e) {
      _error = 'Failed to load slots.';
      debugPrint('ParkingProvider.loadSlots error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

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
    notifyListeners();
  }

  void _resolveDisplayStatuses(String? currentUserId) {
    final nowUtc = DateTime.now().toUtc();

    for (int i = 0; i < _slots.length; i++) {
      final slot = _slots[i];
      String displayStatus = 'FREE';

      // Physical sensor check first
      if (slot.physicalStatus == 'occupied') {
        displayStatus = 'OCCUPIED';
      } else {
        // Find the most relevant booking for this slot (currently active or starting soon)
        final relevantBooking = _activeBookings.where((b) {
          if (b.slotNumber != slot.slotNumber) return false;

          final startUtc = b.bookingStart.toUtc();
          final endUtc = b.bookingEnd.toUtc();

          // Must be happening now OR starting within 30 mins
          final isSoon =
              nowUtc.isAfter(startUtc.subtract(const Duration(minutes: 30))) &&
                  nowUtc.isBefore(startUtc);
          final isActive = nowUtc.isAfter(startUtc) && nowUtc.isBefore(endUtc);

          return isSoon || isActive;
        }).firstOrNull;

        if (relevantBooking != null) {
          if (relevantBooking.userId == currentUserId) {
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
          (b) => b.slotNumber == slotNumber && b.userId == currentUserId,
        )
        .firstOrNull;
  }

  void refreshDisplayStatuses(String? currentUserId) {
    _resolveDisplayStatuses(currentUserId);
    notifyListeners();
  }

  @override
  void dispose() {
    _slotSub?.cancel();
    _connSub?.cancel();
    super.dispose();
  }
}
