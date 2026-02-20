import 'package:flutter/material.dart';

class AppRouter {
  AppRouter._();

  static const auth = '/auth';
  static const emailVerification = '/email-verification';
  static const home = '/home';
  static const bookingForm = '/booking-form';
  static const payment = '/payment';
  static const qrCode = '/qr-code';
  static const myBookings = '/my-bookings';
  static const profile = '/profile';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case auth:
        return _buildRoute(
          settings,
          () {
            // Lazy import to avoid circular deps
            return const _DeferredAuthScreen();
          },
        );
      case emailVerification:
        final email = settings.arguments as String? ?? '';
        return _buildRoute(
            settings, () => _DeferredEmailVerificationScreen(email: email));
      case home:
        return _buildRoute(settings, () => const _DeferredHomeScreen());
      case bookingForm:
        final slotNumber = settings.arguments as int;
        return _buildRoute(
            settings, () => _DeferredBookingFormScreen(slotNumber: slotNumber));
      case payment:
        final args = settings.arguments as Map<String, dynamic>;
        return _buildRoute(settings, () => _DeferredPaymentScreen(args: args));
      case qrCode:
        final args = settings.arguments as Map<String, dynamic>;
        return _buildRoute(settings, () => _DeferredQRCodeScreen(args: args));
      case myBookings:
        return _buildRoute(settings, () => const _DeferredMyBookingsScreen());
      case profile:
        return _buildRoute(settings, () => const _DeferredProfileScreen());
      default:
        return _buildRoute(settings, () => const _DeferredAuthScreen());
    }
  }

  static PageRouteBuilder _buildRoute(
      RouteSettings settings, Widget Function() builder) {
    return PageRouteBuilder(
      settings: settings,
      pageBuilder: (context, animation, secondaryAnimation) => builder(),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(opacity: animation, child: child);
      },
      transitionDuration: const Duration(milliseconds: 200),
    );
  }
}

// Deferred screen wrappers to avoid importing all screens in router
class _DeferredAuthScreen extends StatelessWidget {
  const _DeferredAuthScreen();
  @override
  Widget build(BuildContext context) {
    // Will be replaced with actual import
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class _DeferredEmailVerificationScreen extends StatelessWidget {
  final String email;
  const _DeferredEmailVerificationScreen({required this.email});
  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class _DeferredHomeScreen extends StatelessWidget {
  const _DeferredHomeScreen();
  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class _DeferredBookingFormScreen extends StatelessWidget {
  final int slotNumber;
  const _DeferredBookingFormScreen({required this.slotNumber});
  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class _DeferredPaymentScreen extends StatelessWidget {
  final Map<String, dynamic> args;
  const _DeferredPaymentScreen({required this.args});
  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class _DeferredQRCodeScreen extends StatelessWidget {
  final Map<String, dynamic> args;
  const _DeferredQRCodeScreen({required this.args});
  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class _DeferredMyBookingsScreen extends StatelessWidget {
  const _DeferredMyBookingsScreen();
  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

class _DeferredProfileScreen extends StatelessWidget {
  const _DeferredProfileScreen();
  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
