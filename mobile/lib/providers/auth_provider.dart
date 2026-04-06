import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  User? _user;
  String? _selectedBranchId;
  bool _isLoading = false;
  bool _isInitializing = true;
  String? _error;

  User? get user => _user;
  String? get selectedBranchId => _selectedBranchId;
  bool get isLoading => _isLoading;
  bool get isInitializing => _isInitializing;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.login(email, password);
      _setAuthenticatedUser(User.fromJson(response['user']));
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshUser() async {
    try {
      await _loadCurrentUser();
      _error = null;
      notifyListeners();
    } catch (e) {
      debugPrint('Error refreshing user: $e');
    }
  }

  void setSelectedBranch(String branchId) {
    if (_selectedBranchId != branchId) {
      _selectedBranchId = branchId;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _apiService.logout();
    _clearSession();
    _error = null;
    notifyListeners();
  }

  Future<void> checkAuth() async {
    _isInitializing = true;
    notifyListeners();

    try {
      final isLoggedIn = await _apiService.isLoggedIn();
      if (isLoggedIn) {
        await _loadCurrentUser();
      } else {
        _clearSession();
      }
    } catch (e) {
      debugPrint('Error checking auth state: $e');
      await _apiService.logout();
      _clearSession();
    } finally {
      _isInitializing = false;
      notifyListeners();
    }
  }

  Future<void> _loadCurrentUser() async {
    final response = await _apiService.getMe();
    _setAuthenticatedUser(User.fromJson(response));
  }

  void _setAuthenticatedUser(User user) {
    _user = user;

    if (_user!.branches.isEmpty) {
      _selectedBranchId = null;
      return;
    }

    final branchStillAvailable = _user!.branches.any(
      (branch) => branch.id == _selectedBranchId,
    );

    if (!branchStillAvailable) {
      _selectedBranchId = _user!.branches.first.id;
    }
  }

  void _clearSession() {
    _user = null;
    _selectedBranchId = null;
  }
}
