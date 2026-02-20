import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../config/app_router.dart';
import '../models/booking.dart';
import '../providers/auth_provider.dart';
import '../providers/booking_provider.dart';
import '../providers/parking_provider.dart';
import '../widgets/slot_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshData();
    });
  }

  void _refreshData() {
    final userId = context.read<AuthProvider>().userId;
    context.read<ParkingProvider>().loadSlots(currentUserId: userId);
    context.read<BookingProvider>().loadBookings();
  }

  void _showProfileSheet() {
    final auth = context.read<AuthProvider>();
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgSecondary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.textDisabled,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),

            // Avatar
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                    colors: [AppColors.brandCyan, Color(0xFF0EA5E9)]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: Text(
                  auth.user?.initials ?? '?',
                  style: GoogleFonts.poppins(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.bgPrimary),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Name + email
            Text(auth.user?.fullName ?? 'User',
                style: GoogleFonts.poppins(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary)),
            const SizedBox(height: 4),
            Text(auth.user?.email ?? '',
                style: GoogleFonts.inter(
                    fontSize: 13, color: AppColors.textTertiary)),
            const SizedBox(height: 24),

            // Sign-out button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () => _signOut(ctx),
                icon: const Icon(Icons.logout, size: 20),
                label: Text('Sign Out',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.actionDanger,
                  side: const BorderSide(color: AppColors.actionDanger),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _signOut(BuildContext sheetContext) async {
    Navigator.pop(sheetContext); // close sheet
    final auth = context.read<AuthProvider>();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Sign Out',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        content: Text('Are you sure?', style: GoogleFonts.inter(fontSize: 14)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.actionDanger),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await auth.signOut();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _DashboardTab(
            onRefresh: _refreshData,
            onProfileTap: _showProfileSheet,
          ),
          _BookingsTab(onRefresh: _refreshData),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (i) => setState(() => _currentIndex = i),
          items: const [
            BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home),
                label: 'Home'),
            BottomNavigationBarItem(
                icon: Icon(Icons.calendar_today_outlined),
                activeIcon: Icon(Icons.calendar_today),
                label: 'Bookings'),
          ],
        ),
      ),
    );
  }
}

// ── Dashboard Tab ───────────────────────────────────────────────────────

class _DashboardTab extends StatelessWidget {
  final VoidCallback onRefresh;
  final VoidCallback onProfileTap;
  const _DashboardTab({required this.onRefresh, required this.onProfileTap});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        color: AppColors.brandCyan,
        onRefresh: () async => onRefresh(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildTopBar(context),
              const SizedBox(height: 24),
              _buildStatsBar(),
              const SizedBox(height: 24),
              Text('Parking Slots',
                  style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              Text('Tap available slot to book',
                  style: GoogleFonts.inter(
                      fontSize: 13, color: AppColors.textTertiary)),
              const SizedBox(height: 16),
              _buildSlotGrid(context),
              const SizedBox(height: 24),
              _buildConnectionStatus(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.asset('assets/images/logo.png',
              height: 40, width: 40, fit: BoxFit.cover),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('SPOT-IOT',
                  style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.brandCyan)),
              Text('Main Parking',
                  style: GoogleFonts.inter(
                      fontSize: 12, color: AppColors.textTertiary)),
            ],
          ),
        ),
        Consumer<AuthProvider>(
          builder: (context, auth, _) => GestureDetector(
            onTap: onProfileTap,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.bgTertiary,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  auth.user?.initials ?? '?',
                  style: GoogleFonts.poppins(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatsBar() {
    return Consumer<ParkingProvider>(
      builder: (context, provider, _) {
        final available = provider.availableCount;
        final total = provider.totalSlots;
        final progress = total > 0 ? (total - available) / total : 0.0;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.bgSecondary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Available',
                      style: GoogleFonts.inter(
                          fontSize: 14, color: AppColors.textSecondary)),
                  Text('$available / $total',
                      style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.brandCyan)),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: AppColors.bgTertiary,
                  valueColor:
                      const AlwaysStoppedAnimation<Color>(AppColors.brandCyan),
                  minHeight: 6,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSlotGrid(BuildContext context) {
    return Consumer2<ParkingProvider, BookingProvider>(
      builder: (context, parkingProvider, bookingProvider, _) {
        if (parkingProvider.isLoading) {
          return const SizedBox(
            height: 200,
            child: Center(child: CircularProgressIndicator()),
          );
        }

        final slots = parkingProvider.slots;
        if (slots.isEmpty) {
          return Container(
            height: 200,
            alignment: Alignment.center,
            child: Text('No slots available',
                style: GoogleFonts.inter(color: AppColors.textTertiary)),
          );
        }

        final userId = context.read<AuthProvider>().userId;

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 14,
            crossAxisSpacing: 14,
            childAspectRatio: 0.85,
          ),
          itemCount: slots.length,
          itemBuilder: (context, index) {
            final slot = slots[index];
            final userBooking = parkingProvider.getActiveBookingForSlot(
                slot.slotNumber, userId);

            return SlotCard(
              slot: slot,
              userBooking: userBooking,
              onTap: slot.displayStatus == 'FREE'
                  ? () => Navigator.pushNamed(context, AppRouter.bookingForm,
                      arguments: slot.slotNumber)
                  : null,
              onViewQR: userBooking != null
                  ? () => Navigator.pushNamed(context, AppRouter.qrCode,
                      arguments: {'booking': userBooking})
                  : null,
              onEndSession: userBooking != null
                  ? () =>
                      _confirmEndSession(context, userBooking, bookingProvider)
                  : null,
            );
          },
        );
      },
    );
  }

  void _confirmEndSession(
      BuildContext context, Booking booking, BookingProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('End Session?',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        content: Text(
            'This will end your parking session for Slot ${booking.slotNumber}.',
            style: GoogleFonts.inter(fontSize: 14)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await provider.endSession(booking.id);
              onRefresh();
            },
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.actionDanger),
            child: const Text('End Session'),
          ),
        ],
      ),
    );
  }

  Widget _buildConnectionStatus() {
    return Consumer<ParkingProvider>(
      builder: (context, provider, _) {
        final connected = provider.isMqttConnected;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.bgSecondary,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: connected
                      ? AppColors.statusOnline
                      : AppColors.statusOffline,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                connected ? 'Live Updates Active' : 'Connecting...',
                style: GoogleFonts.inter(
                    fontSize: 12, color: AppColors.textTertiary),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ── Bookings Tab ────────────────────────────────────────────────────────

class _BookingsTab extends StatelessWidget {
  final VoidCallback onRefresh;
  const _BookingsTab({required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Text('My Bookings',
                style: GoogleFonts.poppins(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary)),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: Consumer<BookingProvider>(
              builder: (context, provider, _) {
                if (provider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }
                final active = provider.activeBookings;
                if (active.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.local_parking,
                            size: 48, color: AppColors.textDisabled),
                        const SizedBox(height: 12),
                        Text('No active bookings',
                            style: GoogleFonts.inter(
                                color: AppColors.textTertiary)),
                        const SizedBox(height: 4),
                        Text('Book a slot from the Home tab',
                            style: GoogleFonts.inter(
                                fontSize: 12, color: AppColors.textDisabled)),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  color: AppColors.brandCyan,
                  onRefresh: () => provider.loadBookings(),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: active.length,
                    itemBuilder: (context, index) {
                      return _ActiveBookingCard(
                        booking: active[index],
                        onRefresh: onRefresh,
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Active Booking Card ─────────────────────────────────────────────────

class _ActiveBookingCard extends StatelessWidget {
  final Booking booking;
  final VoidCallback onRefresh;
  const _ActiveBookingCard({required this.booking, required this.onRefresh});

  String _formatTime(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final m = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }

  String _formatDuration(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes % 60;
    if (h > 0 && m > 0) return '${h}h ${m}m';
    if (h > 0) return '${h}h';
    return '${m}m';
  }

  @override
  Widget build(BuildContext context) {
    final bookedDuration = booking.bookedDuration;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.bgSecondary.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.brandCyan.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Slot ${booking.slotNumber}',
                  style: GoogleFonts.poppins(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary)),
              _statusBadge(booking.status),
            ],
          ),
          const SizedBox(height: 16),
          _infoRow(Icons.access_time_rounded, 'Period',
              '${_formatTime(booking.arrivingTime)} — ${_formatTime(booking.bookingEnd)}'),
          const SizedBox(height: 10),
          _infoRow(Icons.timer_outlined, 'Duration',
              _formatDuration(bookedDuration)),
          const SizedBox(height: 10),
          _infoRow(Icons.directions_car_filled_rounded, 'Vehicle',
              booking.vehicleRegNo),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _actionButton(
                  label: 'VIEW QR',
                  icon: Icons.qr_code_scanner,
                  color: AppColors.brandCyan,
                  onPressed: () => Navigator.pushNamed(
                      context, AppRouter.qrCode,
                      arguments: {'booking': booking}),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _actionButton(
                  label: 'END',
                  icon: Icons.close,
                  color: AppColors.actionDanger,
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        backgroundColor: AppColors.bgSecondary,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        title: const Text('End Session?'),
                        content: const Text(
                            'Are you sure you want to end this parking session?'),
                        actions: [
                          TextButton(
                              onPressed: () => Navigator.pop(ctx, false),
                              child: const Text('CANCEL')),
                          ElevatedButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.actionDanger),
                            child: const Text('END NOW'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true && context.mounted) {
                      await context
                          .read<BookingProvider>()
                          .endSession(booking.id);
                      onRefresh();
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statusBadge(String status) {
    final isActive = status == 'active';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: (isActive ? AppColors.actionSuccess : AppColors.statusWarning)
            .withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
            color:
                isActive ? AppColors.actionSuccess : AppColors.statusWarning),
      ),
      child: Text(status.toUpperCase(),
          style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: isActive
                  ? AppColors.actionSuccess
                  : AppColors.statusWarning)),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.textTertiary),
        const SizedBox(width: 10),
        Text('$label:',
            style:
                GoogleFonts.inter(fontSize: 14, color: AppColors.textTertiary)),
        const SizedBox(width: 6),
        Text(value,
            style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary)),
      ],
    );
  }

  Widget _actionButton(
      {required String label,
      required IconData icon,
      required Color color,
      required VoidCallback onPressed}) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.5)),
          color: color.withValues(alpha: 0.05),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 8),
            Text(label,
                style: GoogleFonts.inter(
                    fontSize: 12, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
