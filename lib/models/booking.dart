import 'dart:convert';

class Booking {
  final String id;
  final String userId;
  final int slotNumber;
  final DateTime bookingStart;
  final DateTime bookingEnd;
  final String status;
  final double paymentAmount;
  final String paymentStatus;
  final String vehicleType;
  final String vehicleRegNo;
  final String userPhone;
  final String userAddress;
  final DateTime arrivingTime;
  final String? qrCode;
  final DateTime? arrivedAt;
  final DateTime? departedAt;
  final DateTime createdAt;

  Booking({
    required this.id,
    required this.userId,
    required this.slotNumber,
    required this.bookingStart,
    required this.bookingEnd,
    required this.status,
    required this.paymentAmount,
    required this.paymentStatus,
    required this.vehicleType,
    required this.vehicleRegNo,
    required this.userPhone,
    required this.userAddress,
    required this.arrivingTime,
    this.qrCode,
    this.arrivedAt,
    this.departedAt,
    required this.createdAt,
  });

  factory Booking.fromMap(Map<String, dynamic> map) {
    return Booking(
      id: map['id'] as String,
      userId: map['user_id'] as String,
      slotNumber: map['slot_number'] as int,
      bookingStart: DateTime.parse(map['booking_start'] as String),
      bookingEnd: DateTime.parse(map['booking_end'] as String),
      status: map['status'] as String? ?? 'pending',
      paymentAmount: (map['payment_amount'] as num?)?.toDouble() ?? 0.0,
      paymentStatus: map['payment_status'] as String? ?? 'unpaid',
      vehicleType: map['vehicle_type'] as String? ?? '2_wheeler',
      vehicleRegNo: map['vehicle_reg_no'] as String? ?? '',
      userPhone: map['user_phone'] as String? ?? '',
      userAddress: map['user_address'] as String? ?? '',
      arrivingTime: map['arriving_time'] != null
          ? DateTime.parse(map['arriving_time'] as String)
          : DateTime.now(),
      qrCode: map['qr_code'] as String?,
      arrivedAt: map['arrived_at'] != null
          ? DateTime.parse(map['arrived_at'] as String)
          : null,
      departedAt: map['departed_at'] != null
          ? DateTime.parse(map['departed_at'] as String)
          : null,
      createdAt: map['created_at'] != null
          ? DateTime.parse(map['created_at'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toInsertMap() {
    return {
      'user_id': userId,
      'slot_number': slotNumber,
      'booking_start': bookingStart.toIso8601String(),
      'booking_end': bookingEnd.toIso8601String(),
      'status': status,
      'payment_amount': paymentAmount,
      'payment_status': paymentStatus,
      'vehicle_type': vehicleType,
      'vehicle_reg_no': vehicleRegNo,
      'user_phone': userPhone,
      'user_address': userAddress,
      'arriving_time': arrivingTime.toIso8601String(),
      'qr_code': qrCode,
    };
  }

  String generateQRData() {
    final data = {
      'booking_id': id,
      'slot': slotNumber,
      'user': userId,
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
