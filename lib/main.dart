import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/app_colors.dart';
import 'config/app_theme.dart';
import 'models/booking.dart';
import 'providers/auth_provider.dart';
import 'providers/booking_provider.dart';
import 'providers/parking_provider.dart';
import 'services/mqtt_service.dart';

// Screen imports
import 'screens/auth_screen.dart';
import 'screens/email_verification_screen.dart';
import 'screens/home_screen.dart';
import 'screens/booking_form_screen.dart';
import 'screens/payment_screen.dart';
import 'screens/qr_code_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AppColors.bgPrimary,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  await dotenv.load(fileName: '.env');

  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    anonKey: dotenv.env['SUPABASE_ANON_KEY']!,
  );

  final mqttService = MqttService();
  mqttService.connect(
    broker: dotenv.env['MQTT_BROKER_HOST']!,
    port: int.parse(dotenv.env['MQTT_BROKER_PORT'] ?? '8883'),
    clientId: dotenv.env['MQTT_CLIENT_ID'] ?? 'spotfinder_flutter_client',
    topic: dotenv.env['MQTT_TOPIC'] ?? 'spotfinder/parking/status',
    username: dotenv.env['MQTT_USERNAME'],
    password: dotenv.env['MQTT_PASSWORD'],
  );

  runApp(SpotFinderApp(mqttService: mqttService));
}

class SpotFinderApp extends StatelessWidget {
  final MqttService mqttService;
  const SpotFinderApp({super.key, required this.mqttService});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => BookingProvider()),
        ChangeNotifierProvider(create: (_) => ParkingProvider(mqttService)),
      ],
      child: MaterialApp(
        title: 'SPOT-IOT',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const _AuthGate(),
        onGenerateRoute: _generateRoute,
      ),
    );
  }

  static Route<dynamic> _generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case '/auth':
        return _fadeRoute(settings, const AuthScreen());
      case '/email-verification':
        final email = settings.arguments as String? ?? '';
        return _fadeRoute(settings, EmailVerificationScreen(email: email));
      case '/home':
        return _fadeRoute(settings, const HomeScreen());
      case '/booking-form':
        final slotNumber = settings.arguments as int;
        return _fadeRoute(settings, BookingFormScreen(slotNumber: slotNumber));
      case '/payment':
        final args = settings.arguments as Map<String, dynamic>;
        return _fadeRoute(settings, PaymentScreen(args: args));
      case '/qr-code':
        final args = settings.arguments as Map<String, dynamic>;
        final booking = args['booking'] as Booking;
        return _fadeRoute(settings, QRCodeScreen(booking: booking));
      default:
        return _fadeRoute(settings, const AuthScreen());
    }
  }

  static PageRouteBuilder _fadeRoute(RouteSettings settings, Widget page) {
    return PageRouteBuilder(
      settings: settings,
      pageBuilder: (_, __, ___) => page,
      transitionsBuilder: (_, animation, __, child) {
        return FadeTransition(opacity: animation, child: child);
      },
      transitionDuration: const Duration(milliseconds: 200),
    );
  }
}

/// Auth gate widget that listens to auth state and navigates accordingly.
/// Avoids the bug of calling setUserId during build.
class _AuthGate extends StatefulWidget {
  const _AuthGate();

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  String? _lastUserId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _wireProviders();
    });
  }

  void _wireProviders() {
    final auth = context.read<AuthProvider>();
    final userId = auth.userId;
    if (userId != _lastUserId) {
      _lastUserId = userId;
      context.read<BookingProvider>().setUserId(userId);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        // Wire booking provider only when userId actually changes
        final userId = auth.userId;
        if (userId != _lastUserId) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              _lastUserId = userId;
              context.read<BookingProvider>().setUserId(userId);
            }
          });
        }

        if (auth.isAuthenticated && auth.isEmailVerified) {
          return const HomeScreen();
        }
        return const AuthScreen();
      },
    );
  }
}
