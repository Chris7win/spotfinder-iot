import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../config/app_colors.dart';
import '../config/app_router.dart';
import '../models/booking.dart';

class QRCodeScreen extends StatelessWidget {
  final Booking booking;
  const QRCodeScreen({super.key, required this.booking});

  String _formatTime(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final m = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }

  @override
  Widget build(BuildContext context) {
    final qrData = booking.qrCode ?? booking.generateQRData();

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 24),

              // Success icon
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.actionSuccess.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle,
                    size: 48, color: AppColors.actionSuccess),
              ),
              const SizedBox(height: 16),
              Text('Booking Confirmed!',
                  style: GoogleFonts.poppins(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 32),

              // QR code
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                        color: AppColors.brandCyan.withValues(alpha: 0.3),
                        blurRadius: 30,
                        spreadRadius: 5),
                  ],
                ),
                child: QrImageView(
                  data: qrData,
                  version: QrVersions.auto,
                  size: 220,
                  backgroundColor: Colors.white,
                  eyeStyle: const QrEyeStyle(
                      color: Color(0xFF1E293B), eyeShape: QrEyeShape.square),
                  dataModuleStyle: const QrDataModuleStyle(
                      color: Color(0xFF1E293B),
                      dataModuleShape: QrDataModuleShape.square),
                ),
              ),
              const SizedBox(height: 32),

              // Details card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.bgSecondary,
                  border: Border.all(color: AppColors.brandCyan),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    _detailRow(
                        'Slot', '#${booking.slotNumber}', AppColors.brandCyan),
                    const SizedBox(height: 10),
                    _detailRow(
                        'Time',
                        '${_formatTime(booking.bookingStart)} - ${_formatTime(booking.bookingEnd)}',
                        null),
                    const SizedBox(height: 10),
                    _detailRow(
                        'Amount Paid',
                        '₹${booking.paymentAmount.toStringAsFixed(2)}',
                        AppColors.brandGreen),
                    const SizedBox(height: 10),
                    _detailRow('Vehicle', booking.vehicleRegNo, null),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.download, size: 18),
                      label: Text('SAVE QR',
                          style:
                              GoogleFonts.inter(fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.brandCyan,
                        side: const BorderSide(color: AppColors.brandCyan),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('QR code saved!'),
                              backgroundColor: AppColors.actionSuccess),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.home, size: 18),
                      label: Text('GO HOME',
                          style:
                              GoogleFonts.inter(fontWeight: FontWeight.w600)),
                      style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14)),
                      onPressed: () {
                        Navigator.pushNamedAndRemoveUntil(
                            context, AppRouter.home, (route) => false);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value, Color? valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style:
                GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary)),
        Text(
          value,
          style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: valueColor ?? AppColors.textPrimary),
        ),
      ],
    );
  }
}
