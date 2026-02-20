class ParkingSlot {
  final int slotNumber;
  final String physicalStatus;
  final String displayStatus;
  final String? bookedByUserId;
  final DateTime lastUpdated;
  final bool isActive;

  const ParkingSlot({
    required this.slotNumber,
    this.physicalStatus = 'free',
    this.displayStatus = 'FREE',
    this.bookedByUserId,
    required this.lastUpdated,
    this.isActive = true,
  });

  factory ParkingSlot.fromMap(Map<String, dynamic> map) {
    return ParkingSlot(
      slotNumber: map['slot_number'] as int,
      physicalStatus: map['physical_status'] as String? ?? 'free',
      displayStatus: map['display_status'] as String? ?? 'F',
      bookedByUserId: map['booked_by'] as String?,
      lastUpdated: map['last_updated'] != null
          ? DateTime.parse(map['last_updated'] as String)
          : DateTime.now(),
      isActive: map['is_active'] as bool? ?? true,
    );
  }

  bool get isFree => physicalStatus == 'free' && displayStatus == 'FREE';
  bool get isOccupied =>
      physicalStatus == 'occupied' || displayStatus == 'OCCUPIED';

  ParkingSlot copyWith({
    int? slotNumber,
    String? physicalStatus,
    String? displayStatus,
    String? Function()? bookedByUserId,
    DateTime? lastUpdated,
    bool? isActive,
  }) {
    return ParkingSlot(
      slotNumber: slotNumber ?? this.slotNumber,
      physicalStatus: physicalStatus ?? this.physicalStatus,
      displayStatus: displayStatus ?? this.displayStatus,
      bookedByUserId:
          bookedByUserId != null ? bookedByUserId() : this.bookedByUserId,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      isActive: isActive ?? this.isActive,
    );
  }
}
