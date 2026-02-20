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
    required String userAddress,
    required DateTime arrivingTime,
    required double paymentAmount,
  }) async {
    if (_userId == null) return null;

    try {
      // Check for time conflicts (including 30m buffer)
      final conflict = await _supabase.getConflictingBooking(
          slotNumber, bookingStart, bookingEnd);
      if (conflict != null) {
        final startStr =
            "${conflict.bookingStart.hour}:${conflict.bookingStart.minute.toString().padLeft(2, '0')}";
        final endStr =
            "${conflict.bookingEnd.hour}:${conflict.bookingEnd.minute.toString().padLeft(2, '0')}";
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
        'user_id': _userId,
        'slot_number': slotNumber,
        'booking_start': bookingStart.toUtc().toIso8601String(),
        'booking_end': bookingEnd.toUtc().toIso8601String(),
        'status': 'pending',
        'payment_amount': paymentAmount,
        'payment_status': 'paid',
        'vehicle_type': vehicleType,
        'vehicle_reg_no': vehicleRegNo,
        'user_phone': userPhone,
        'user_address': userAddress,
        'arriving_time': arrivingTime.toUtc().toIso8601String(),
        'qr_code': qrData,
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
    return '{"user":"$_userId","slot":$slotNumber,"start":"${bookingStart.toIso8601String()}","end":"${bookingEnd.toIso8601String()}","vehicle":"$vehicleRegNo","amount":$paymentAmount}';
  }

  Future<bool> endSession(String bookingId) async {
    try {
      final success = await _supabase.updateBooking(bookingId, {
        'status': 'completed',
        'departed_at': DateTime.now().toIso8601String(),
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
          'arrived_at': DateTime.now().toIso8601String(),
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
