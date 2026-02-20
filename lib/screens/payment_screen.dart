import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../config/app_router.dart';
import '../providers/auth_provider.dart';
import '../providers/booking_provider.dart';

class PaymentScreen extends StatefulWidget {
  final Map<String, dynamic> args;
  const PaymentScreen({super.key, required this.args});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isProcessing = false;
  String? _error;

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    if (_passwordController.text.isEmpty) {
      setState(() => _error = 'Enter your password');
      return;
    }

    setState(() {
      _isProcessing = true;
      _error = null;
    });

    final auth = context.read<AuthProvider>();
    final bookingProvider = context.read<BookingProvider>();

    // Step 1: Verify password
    debugPrint('PaymentScreen: Verifying password...');
    final verificationError =
        await auth.verifyPassword(_passwordController.text);
    debugPrint('PaymentScreen: Verification result = $verificationError');

    if (verificationError != null) {
      if (!mounted) return;
      setState(() {
        _isProcessing = false;
        _error = verificationError;
      });
      return;
    }

    // Step 2: Create booking
    debugPrint('PaymentScreen: Creating booking...');
    final booking = await bookingProvider.createBooking(
      slotNumber: widget.args['slotNumber'] as int,
      bookingStart: widget.args['bookingStart'] as DateTime,
      bookingEnd: widget.args['bookingEnd'] as DateTime,
      vehicleType: widget.args['vehicleType'] as String,
      vehicleRegNo: widget.args['vehicleRegNo'] as String,
      userPhone: widget.args['userPhone'] as String,
      userAddress: widget.args['userAddress'] as String,
      arrivingTime: widget.args['arrivingTime'] as DateTime,
      paymentAmount: widget.args['paymentAmount'] as double,
    );

    if (!mounted) return;

    if (booking != null) {
      debugPrint('PaymentScreen: Booking created successfully');
      Navigator.pushNamedAndRemoveUntil(
        context,
        AppRouter.qrCode,
        (route) => route.settings.name == AppRouter.home,
        arguments: {'booking': booking},
      );
    } else {
      debugPrint('PaymentScreen: Booking failed - ${bookingProvider.error}');
      setState(() {
        _isProcessing = false;
        _error = bookingProvider.error ?? 'Booking failed. Please try again.';
      });
    }
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final m = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }

  @override
  Widget build(BuildContext context) {
    final amount = widget.args['paymentAmount'] as double;
    final slotNumber = widget.args['slotNumber'] as int;
    final durationLabel = widget.args['durationLabel'] as String;
    final bookingStart = widget.args['bookingStart'] as DateTime;
    final bookingEnd = widget.args['bookingEnd'] as DateTime;
    final regNo = widget.args['vehicleRegNo'] as String;

    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 20),

            // Amount
            Text('Total Amount',
                style: GoogleFonts.inter(
                    fontSize: 16, color: AppColors.textSecondary)),
            const SizedBox(height: 8),
            Text(
              '₹${amount.toStringAsFixed(2)}',
              style: GoogleFonts.poppins(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: AppColors.brandGreen),
            ),
            Text('for $durationLabel',
                style: GoogleFonts.inter(
                    fontSize: 14, color: AppColors.textTertiary)),
            const SizedBox(height: 32),

            // Details card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.bgSecondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _detailRow('Slot', '#$slotNumber'),
                  const SizedBox(height: 10),
                  _detailRow('Time',
                      '${_formatTime(bookingStart)} - ${_formatTime(bookingEnd)}'),
                  const SizedBox(height: 10),
                  _detailRow('Vehicle', regNo),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Password input
            TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              style: GoogleFonts.inter(color: AppColors.textPrimary),
              decoration: InputDecoration(
                labelText: 'Enter password to confirm',
                prefixIcon: const Icon(Icons.lock_outline,
                    color: AppColors.textTertiary),
                suffixIcon: IconButton(
                  icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_off
                          : Icons.visibility,
                      color: AppColors.textTertiary),
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!,
                  style: GoogleFonts.inter(
                      fontSize: 13, color: AppColors.actionDanger)),
            ],

            const SizedBox(height: 32),

            // Pay button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isProcessing ? null : _pay,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.actionSuccess,
                  foregroundColor: Colors.white,
                  shadowColor: AppColors.actionSuccess.withValues(alpha: 0.4),
                  elevation: 8,
                ),
                child: _isProcessing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : Text('PAY NOW',
                        style: GoogleFonts.inter(
                            fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style:
                GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary)),
        Text(value,
            style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
      ],
    );
  }
}
