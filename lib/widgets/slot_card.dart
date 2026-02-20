import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_colors.dart';
import '../models/booking.dart';
import '../models/parking_slot.dart';

class SlotCard extends StatelessWidget {
  final ParkingSlot slot;
  final Booking? userBooking;
  final VoidCallback? onTap;
  final VoidCallback? onViewQR;
  final VoidCallback? onEndSession;

  const SlotCard({
    super.key,
    required this.slot,
    this.userBooking,
    this.onTap,
    this.onViewQR,
    this.onEndSession,
  });

  Color get _statusColor {
    switch (slot.displayStatus) {
      case 'FREE':
        return AppColors.slotAvailable;
      case 'OCCUPIED':
        return AppColors.slotOccupied;
      case 'BOOKED':
        return AppColors.slotBooked;
      case 'YOUR_BOOKING':
        return AppColors.slotUserActive;
      default:
        return AppColors.textDisabled;
    }
  }

  String get _statusLabel {
    switch (slot.displayStatus) {
      case 'FREE':
        return 'AVAILABLE';
      case 'OCCUPIED':
        return 'OCCUPIED';
      case 'BOOKED':
        return 'BOOKED';
      case 'YOUR_BOOKING':
        return 'YOUR SPOT';
      default:
        return 'UNKNOWN';
    }
  }

  String _getBookedTime() {
    if (userBooking == null) return '';
    final start = userBooking!.arrivingTime;
    final end = userBooking!.bookingEnd;
    return '${_fmtTime(start)}-${_fmtTime(end)}';
  }

  String _fmtTime(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final m = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }

  Color _getTimerColor() {
    if (userBooking == null) return AppColors.textPrimary;
    final remaining = userBooking!.timeRemaining;
    if (remaining.inMinutes <= 10) return AppColors.actionDanger;
    if (remaining.inMinutes <= 30) return AppColors.statusWarning;
    return AppColors.actionSuccess;
  }

  @override
  Widget build(BuildContext context) {
    final isTappable = slot.displayStatus == 'FREE';
    final isUserBooking = slot.displayStatus == 'YOUR_BOOKING';

    return GestureDetector(
      onTap: isTappable ? onTap : null,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.bgSecondary,
          border: Border.all(color: _statusColor, width: 2),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
                color: _statusColor.withValues(alpha: 0.25), blurRadius: 12),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Slot number
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  '${slot.slotNumber}',
                  style: GoogleFonts.poppins(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _statusColor),
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Status badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _statusLabel,
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: _statusColor,
                  letterSpacing: 0.5,
                ),
              ),
            ),

            // Timer for user booking
            if (isUserBooking && userBooking != null) ...[
              const SizedBox(height: 6),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.timer_outlined, size: 13, color: _getTimerColor()),
                  const SizedBox(width: 4),
                  Text(
                    _getBookedTime(),
                    style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _getTimerColor()),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (onViewQR != null)
                    _SmallButton(
                      icon: Icons.qr_code,
                      color: AppColors.brandCyan,
                      onTap: onViewQR!,
                    ),
                  if (onViewQR != null && onEndSession != null)
                    const SizedBox(width: 6),
                  if (onEndSession != null)
                    _SmallButton(
                      icon: Icons.close,
                      color: AppColors.actionDanger,
                      onTap: onEndSession!,
                    ),
                ],
              ),
            ],

            // Tap hint for free slots
            if (isTappable) ...[
              const SizedBox(height: 6),
              Text('Tap to book',
                  style: GoogleFonts.inter(
                      fontSize: 10, color: AppColors.textTertiary)),
            ],
          ],
        ),
      ),
    );
  }
}

class _SmallButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _SmallButton(
      {required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          border: Border.all(color: color),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, size: 14, color: color),
      ),
    );
  }
}
