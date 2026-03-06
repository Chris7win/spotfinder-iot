import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/booking.dart';
import '../services/supabase_service.dart';

class BookingProvider extends ChangeNotifier {
  final _supabase = SupabaseService();
  List<Booking> _bookings = [];
  bool _isLoading = false;
  String? _error;
  String? _userId;
  Timer? _refreshTimer;

  List<Booking> get bookings => _bookings;
  List<Booking> get activeBookings => _bookings
      .where((b) => b.status == 'active' || b.status == 'pending')
      .toList();
  List<Booking> get historyBookings => _bookings
      .where((b) => b.status != 'active' && b.status != 'pending')
      .toList();
  bool get isLoading => _isLoading;
  String? get error => _error;

  void setUserId(String? userId) {
    if (_userId == userId) return;
    _userId = userId;
    if (userId != null) {
      loadBookings();
      _startRefreshTimer();
    } else {
      _bookings = [];
      _refreshTimer?.cancel();
      notifyListeners();
    }
  }

  void _startRefreshTimer() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      notifyListeners(); // Refresh timers
    });
  }

  Future<void> loadBookings() async {
    if (_userId == null) return;
    _isLoading = true;
    notifyListeners();

    try {
      _bookings = await _supabase.getUserBookings(_userId!);
      _error = null;
    } catch (e) {
      _error = 'Failed to load bookings.';
      debugPrint('BookingProvider.loadBookings error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<Booking?> createBooking({
    required int slotNumber,
    required DateTime bookingStart,
    required DateTime bookingEnd,
    required String vehicleType,
    required String vehicleRegNo,
    required String userPhone,
    required String userName,
    required String durationLabel,
    required double paymentAmount,
  }) async {
    if (_userId == null) return null;

    try {
      // Check for time conflicts (including 30m buffer)
      final conflict = await _supabase.getConflictingBooking(
          slotNumber, bookingStart, bookingEnd);
      if (conflict != null) {
        final localStart = conflict.bookingStart.toLocal();
        final localEnd = conflict.bookingEnd.toLocal();
        final startStr =
            "${localStart.hour}:${localStart.minute.toString().padLeft(2, '0')}";
        final endStr =
            "${localEnd.hour}:${localEnd.minute.toString().padLeft(2, '0')}";
        _error = 'Conflict: Slot reserved from $startStr to $endStr';
        notifyListeners();
        return null;
      }

      final qrData = _generateQRData(
        slotNumber: slotNumber,
        bookingStart: bookingStart,
        bookingEnd: bookingEnd,
        vehicleRegNo: vehicleRegNo,
        paymentAmount: paymentAmount,
      );

      final booking = await _supabase.createBooking({
        'slot_id': slotNumber,
        'arrival_time': bookingStart.toUtc().toIso8601String(),
        'duration': durationLabel,
        'status': 'pending',
        'amount': paymentAmount,
        'payment_status': 'paid',
        'vehicle_type': vehicleType,
        'vehicle_number': vehicleRegNo,
        'phone': userPhone,
        'user_name': userName,
        'qr_token': qrData,
      });

      if (booking != null) {
        _bookings.insert(0, booking);
        _error = null;
        notifyListeners();
      }
      return booking;
    } catch (e) {
      _error = e.toString();
      debugPrint('BookingProvider.createBooking error: $e');
      notifyListeners();
      return null;
    }
  }

  String _generateQRData({
    required int slotNumber,
    required DateTime bookingStart,
    required DateTime bookingEnd,
    required String vehicleRegNo,
    required double paymentAmount,
  }) {
    // Keep under 100 chars for varchar(100) qr_token column
    final ts = bookingStart.millisecondsSinceEpoch ~/ 1000;
    return 'SF-S${slotNumber}-T$ts-${vehicleRegNo.toUpperCase()}-${paymentAmount.toStringAsFixed(0)}';
  }

  Future<bool> endSession(String bookingId) async {
    try {
      final success = await _supabase.updateBooking(bookingId, {
        'status': 'completed',
      });
      if (success) await loadBookings();
      return success;
    } catch (e) {
      _error = 'Failed to end session.';
      debugPrint('BookingProvider.endSession error: $e');
      notifyListeners();
      return false;
    }
  }

  Future<bool> cancelBooking(String bookingId) async {
    try {
      final success = await _supabase.updateBooking(bookingId, {
        'status': 'cancelled',
      });
      if (success) await loadBookings();
      return success;
    } catch (e) {
      _error = 'Failed to cancel booking.';
      debugPrint('BookingProvider.cancelBooking error: $e');
      notifyListeners();
      return false;
    }
  }

  Future<void> checkAndActivateBooking(int slotNumber) async {
    if (_userId == null) return;
    try {
      final booking = activeBookings
          .where(
            (b) => b.slotNumber == slotNumber && b.status == 'pending',
          )
          .firstOrNull;

      if (booking != null) {
        await _supabase.updateBooking(booking.id, {
          'status': 'active',
        });
        await loadBookings();
      }
    } catch (e) {
      debugPrint('BookingProvider.checkAndActivateBooking error: $e');
    }
  }

  Future<Map<String, dynamic>?> getStats() async {
    if (_userId == null) return null;
    return await _supabase.getBookingStats(_userId!);
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
