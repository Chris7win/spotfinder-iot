import 'dart:convert';

class Booking {
  final String id; // DB: booking_id
  final int slotNumber; // DB: slot_id
  final DateTime bookingStart; // DB: arrival_time
  final String durationStr; // DB: duration (varchar, e.g. "1 hour")
  final DateTime bookingEnd; // computed from arrival_time + duration
  final String status;
  final double paymentAmount; // DB: amount
  final String paymentStatus;
  final String vehicleType;
  final String vehicleRegNo; // DB: vehicle_number
  final String userPhone; // DB: phone
  final String userName; // DB: user_name
  final String? qrCode; // DB: qr_token
  final DateTime createdAt;

  // Keep arrivingTime as alias for bookingStart for backward compat
  DateTime get arrivingTime => bookingStart;

  Booking({
    required this.id,
    required this.slotNumber,
    required this.bookingStart,
    required this.durationStr,
    required this.bookingEnd,
    required this.status,
    required this.paymentAmount,
    required this.paymentStatus,
    required this.vehicleType,
    required this.vehicleRegNo,
    required this.userPhone,
    required this.userName,
    this.qrCode,
    required this.createdAt,
  });

  factory Booking.fromMap(Map<String, dynamic> map) {
    final arrivalTime = map['arrival_time'] != null
        ? DateTime.parse(map['arrival_time'] as String)
        : DateTime.now();

    final durationStr = map['duration'] as String? ?? '1 hour';
    final endTime = _computeEndTime(arrivalTime, durationStr);

    return Booking(
      id: map['booking_id'] as String,
      slotNumber: map['slot_id'] as int,
      bookingStart: arrivalTime,
      durationStr: durationStr,
      bookingEnd: endTime,
      status: map['status'] as String? ?? 'pending',
      paymentAmount: (map['amount'] as num?)?.toDouble() ?? 0.0,
      paymentStatus: map['payment_status'] as String? ?? 'unpaid',
      vehicleType: map['vehicle_type'] as String? ?? '2_wheeler',
      vehicleRegNo: map['vehicle_number'] as String? ?? '',
      userPhone: map['phone'] as String? ?? '',
      userName: map['user_name'] as String? ?? '',
      qrCode: map['qr_token'] as String?,
      createdAt: map['created_at'] != null
          ? DateTime.parse(map['created_at'] as String)
          : DateTime.now(),
    );
  }

  /// Converts duration string like "1 hour", "2 hours", "30 minutes" to a Duration
  static DateTime _computeEndTime(DateTime start, String durationStr) {
    final lower = durationStr.toLowerCase().trim();

    // Try parsing patterns like "1 hour", "2 hours", "30 minutes", "1.5 hours"
    final hourMatch = RegExp(r'(\d+\.?\d*)\s*hour').firstMatch(lower);
    if (hourMatch != null) {
      final hours = double.parse(hourMatch.group(1)!);
      return start.add(Duration(minutes: (hours * 60).round()));
    }

    final minMatch = RegExp(r'(\d+)\s*min').firstMatch(lower);
    if (minMatch != null) {
      return start.add(Duration(minutes: int.parse(minMatch.group(1)!)));
    }

    // Default: 1 hour
    return start.add(const Duration(hours: 1));
  }

  Map<String, dynamic> toInsertMap() {
    return {
      'slot_id': slotNumber,
      'arrival_time': bookingStart.toIso8601String(),
      'duration': durationStr,
      'status': status,
      'amount': paymentAmount,
      'payment_status': paymentStatus,
      'vehicle_type': vehicleType,
      'vehicle_number': vehicleRegNo,
      'phone': userPhone,
      'user_name': userName,
      'qr_token': qrCode,
    };
  }

  String generateQRData() {
    final data = {
      'booking_id': id,
      'slot': slotNumber,
      'user': userName,
      'start': bookingStart.toIso8601String(),
      'end': bookingEnd.toIso8601String(),
      'vehicle': vehicleRegNo,
      'amount': paymentAmount,
    };
    return jsonEncode(data);
  }

  bool get isActive => status == 'active' || status == 'pending';

  Duration get timeRemaining {
    final now = DateTime.now();
    if (now.isAfter(bookingEnd)) return Duration.zero;
    return bookingEnd.difference(now);
  }

  Duration get bookedDuration => bookingEnd.difference(bookingStart);
}
