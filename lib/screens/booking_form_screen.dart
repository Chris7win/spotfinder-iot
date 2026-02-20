import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../config/app_router.dart';
import '../providers/auth_provider.dart';

class BookingFormScreen extends StatefulWidget {
  final int slotNumber;
  const BookingFormScreen({super.key, required this.slotNumber});

  @override
  State<BookingFormScreen> createState() => _BookingFormScreenState();
}

class _BookingFormScreenState extends State<BookingFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _regNoController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  String _selectedVehicleType = '2_wheeler';
  String _selectedDuration = '1hr';
  TimeOfDay? _arrivingTime;
  bool _initialized = false;

  final Map<String, double> _durationPricing = {
    '30min': 20.0,
    '1hr': 30.0,
    '2hr': 50.0,
    '4hr': 80.0,
  };

  final Map<String, String> _durationLabels = {
    '30min': '30 min',
    '1hr': '1 hour',
    '2hr': '2 hours',
    '4hr': '4 hours',
  };

  final Map<String, Duration> _durationValues = {
    '30min': const Duration(minutes: 30),
    '1hr': const Duration(hours: 1),
    '2hr': const Duration(hours: 2),
    '4hr': const Duration(hours: 4),
  };

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initialized) {
      _initialized = true;
      final user = context.read<AuthProvider>().user;
      if (user != null) {
        _nameController.text = user.fullName;
        _phoneController.text = user.phone ?? '';
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _regNoController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _selectArrivingTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.brandCyan,
              surface: AppColors.bgSecondary,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _arrivingTime = picked);
    }
  }

  void _proceedToPayment() {
    if (!_formKey.currentState!.validate()) return;
    if (_arrivingTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please select arriving time'),
            backgroundColor: AppColors.actionDanger),
      );
      return;
    }

    final now = DateTime.now();
    final arrivingDateTime = DateTime(now.year, now.month, now.day,
        _arrivingTime!.hour, _arrivingTime!.minute);
    final duration = _durationValues[_selectedDuration]!;
    final bookingEnd = arrivingDateTime.add(duration);
    final amount = _durationPricing[_selectedDuration]!;

    Navigator.pushNamed(context, AppRouter.payment, arguments: {
      'slotNumber': widget.slotNumber,
      'bookingStart': arrivingDateTime,
      'bookingEnd': bookingEnd,
      'vehicleType': _selectedVehicleType,
      'vehicleRegNo': _regNoController.text.trim(),
      'userPhone': _phoneController.text.trim(),
      'userAddress': _addressController.text.trim(),
      'arrivingTime': arrivingDateTime,
      'paymentAmount': amount,
      'durationLabel': _durationLabels[_selectedDuration]!,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Book Slot ${widget.slotNumber}')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Slot info
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.bgSecondary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.slotAvailable, width: 2),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.slotAvailable.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text('${widget.slotNumber}',
                            style: GoogleFonts.poppins(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: AppColors.slotAvailable)),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Parking Slot ${widget.slotNumber}',
                            style: GoogleFonts.poppins(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary)),
                        Text('Available',
                            style: GoogleFonts.inter(
                                fontSize: 13, color: AppColors.slotAvailable)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Name
              _sectionLabel('Full Name'),
              TextFormField(
                controller: _nameController,
                style: GoogleFonts.inter(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.person_outline,
                        color: AppColors.textTertiary)),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),

              // Vehicle type
              _sectionLabel('Vehicle Type'),
              DropdownButtonFormField<String>(
                initialValue: _selectedVehicleType,
                dropdownColor: AppColors.bgSecondary,
                style: GoogleFonts.inter(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.directions_car_outlined,
                        color: AppColors.textTertiary)),
                items: const [
                  DropdownMenuItem(value: 'cycle', child: Text('Cycle')),
                  DropdownMenuItem(
                      value: '2_wheeler',
                      child: Text('2 Wheeler (Bike/Scooter)')),
                  DropdownMenuItem(
                      value: '4_wheeler', child: Text('4 Wheeler (Car)')),
                  DropdownMenuItem(
                      value: 'heavy_duty',
                      child: Text('Heavy Duty (Truck/Bus)')),
                ],
                onChanged: (v) => setState(() => _selectedVehicleType = v!),
              ),
              const SizedBox(height: 16),

              // Registration number
              _sectionLabel('Vehicle Registration No.'),
              TextFormField(
                controller: _regNoController,
                textCapitalization: TextCapitalization.characters,
                style: GoogleFonts.inter(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'e.g. KA01AB1234',
                  prefixIcon: Icon(Icons.confirmation_number_outlined,
                      color: AppColors.textTertiary),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),

              // Phone
              _sectionLabel('Phone Number'),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                style: GoogleFonts.inter(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.phone_outlined,
                        color: AppColors.textTertiary)),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Required';
                  if (v.trim().length < 10) return 'Enter valid phone number';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Address
              _sectionLabel('Address'),
              TextFormField(
                controller: _addressController,
                style: GoogleFonts.inter(color: AppColors.textPrimary),
                maxLines: 2,
                decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.location_on_outlined,
                        color: AppColors.textTertiary)),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 24),

              // Duration selection
              _sectionLabel('Select Duration'),
              const SizedBox(height: 8),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 4,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 0.85,
                children: _durationPricing.entries.map((e) {
                  final isSelected = _selectedDuration == e.key;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedDuration = e.key),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.bgTertiary
                            : AppColors.bgSecondary,
                        border: Border.all(
                          color: isSelected
                              ? AppColors.brandCyan
                              : AppColors.borderLight,
                          width: isSelected ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _durationLabels[e.key]!,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isSelected
                                  ? AppColors.brandCyan
                                  : AppColors.textSecondary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '₹${e.value.toStringAsFixed(0)}',
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? AppColors.brandGreen
                                  : AppColors.textTertiary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),

              // Arriving time
              _sectionLabel('Arriving Time'),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _selectArrivingTime,
                child: Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.bgTertiary,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.access_time,
                          color: AppColors.textTertiary),
                      const SizedBox(width: 12),
                      Text(
                        _arrivingTime != null
                            ? _arrivingTime!.format(context)
                            : 'Select time',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: _arrivingTime != null
                              ? AppColors.textPrimary
                              : AppColors.textDisabled,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Submit
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _proceedToPayment,
                  child: Text(
                    'PROCEED TO PAYMENT',
                    style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text,
          style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary)),
    );
  }
}
