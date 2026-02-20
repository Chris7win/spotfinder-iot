import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';

class MqttService {
  MqttServerClient? _client;
  final _slotController = StreamController<Map<int, String>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();
  Timer? _reconnectTimer;
  bool _isConnecting = false;
  int _retryCount = 0;
  static const _maxRetries = 5;

  Stream<Map<int, String>> get slotUpdates => _slotController.stream;
  Stream<bool> get connectionStatus => _connectionController.stream;
  bool get isConnected =>
      _client?.connectionStatus?.state == MqttConnectionState.connected;

  Future<void> connect({
    required String broker,
    required int port,
    required String clientId,
    required String topic,
    String? username,
    String? password,
  }) async {
    // Prevent overlapping connection attempts
    if (_isConnecting) return;
    _isConnecting = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;

    try {
      _client?.disconnect();
      _client = MqttServerClient.withPort(broker, clientId, port);
      _client!.logging(on: false);
      _client!.keepAlivePeriod = 30;
      _client!.autoReconnect = true;
      _client!.onAutoReconnect = () {
        debugPrint('MQTT: Auto-reconnecting...');
        _connectionController.add(false);
      };
      _client!.onAutoReconnected = () {
        debugPrint('MQTT: Auto-reconnected');
        _retryCount = 0;
        _connectionController.add(true);
      };
      _client!.onDisconnected = () {
        debugPrint('MQTT: Disconnected');
        _connectionController.add(false);
        _scheduleReconnect(broker, port, clientId, topic, username, password);
      };

      // TLS setup for port 8883
      if (port == 8883) {
        _client!.secure = true;
        _client!.securityContext = SecurityContext.defaultContext;
      } else {
        _client!.secure = false;
      }

      final connMessage = MqttConnectMessage()
          .withClientIdentifier(clientId)
          .startClean()
          .withWillQos(MqttQos.atLeastOnce);

      _client!.connectionMessage = connMessage;

      debugPrint(
          'MQTT: Connecting to $broker:$port (attempt ${_retryCount + 1})...');

      if (username != null && username.isNotEmpty) {
        await _client!.connect(username, password);
      } else {
        await _client!.connect();
      }

      if (_client!.connectionStatus!.state == MqttConnectionState.connected) {
        debugPrint('MQTT: Connected successfully');
        _retryCount = 0;
        _connectionController.add(true);

        _client!.subscribe(topic, MqttQos.atLeastOnce);
        _client!.updates!.listen(_onMessage);
      } else {
        debugPrint('MQTT: Connection failed - ${_client!.connectionStatus}');
        _connectionController.add(false);
        _scheduleReconnect(broker, port, clientId, topic, username, password);
      }
    } catch (e) {
      debugPrint('MQTT: Connection error - $e');
      _connectionController.add(false);
      _scheduleReconnect(broker, port, clientId, topic, username, password);
    } finally {
      _isConnecting = false;
    }
  }

  void _scheduleReconnect(
    String broker,
    int port,
    String clientId,
    String topic,
    String? username,
    String? password,
  ) {
    _reconnectTimer?.cancel();
    _retryCount++;

    if (_retryCount > _maxRetries) {
      debugPrint(
          'MQTT: Max retries ($_maxRetries) reached. Stopping reconnect. Call connect() to retry.');
      return;
    }

    // Exponential backoff: 5s, 10s, 20s, 40s, 80s
    final delay = Duration(seconds: 5 * (1 << (_retryCount - 1)));
    debugPrint(
        'MQTT: Retrying in ${delay.inSeconds}s (attempt $_retryCount/$_maxRetries)');

    _reconnectTimer = Timer(delay, () {
      connect(
        broker: broker,
        port: port,
        clientId: clientId,
        topic: topic,
        username: username,
        password: password,
      );
    });
  }

  void _onMessage(List<MqttReceivedMessage<MqttMessage?>> messages) {
    for (final msg in messages) {
      final payload = msg.payload as MqttPublishMessage;
      final payloadString = MqttPublishPayload.bytesToStringAsString(
        payload.payload.message,
      );

      try {
        final data = jsonDecode(payloadString) as Map<String, dynamic>;
        _handleSlotUpdate(data);
      } catch (e) {
        debugPrint('MQTT: Parse error - $e');
      }
    }
  }

  void _handleSlotUpdate(Map<String, dynamic> data) {
    final slots = data['slots'] as List<dynamic>?;
    if (slots == null) return;

    final updates = <int, String>{};
    for (final slot in slots) {
      final id = slot['id'] as int?;
      final status = slot['status'] as String?;
      if (id != null && status != null) {
        updates[id] = status;
      }
    }

    if (updates.isNotEmpty) {
      _slotController.add(updates);
    }
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _client?.disconnect();
    _client = null;
  }

  void dispose() {
    disconnect();
    _slotController.close();
    _connectionController.close();
  }
}
