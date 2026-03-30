import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  User? _user;
  String? _selectedBranchId;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  String? get selectedBranchId => _selectedBranchId;
  bool _isManagementRole(String role) =>
      role == 'ADMIN' || role == 'SUPER_ADMIN' || role == 'MANAGER';

  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.login(email, password);
      _user = User.fromJson(response['user']);
      
      // Initialize selected branch
      if (_user!.branches.isNotEmpty) {
        _selectedBranchId = _user!.branches.first.id;
      }
      
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> refreshUser() async {
    try {
      final response = await _apiService.getMe();
      _user = User.fromJson(response);
      
      // Update selected branch if it's currently null but branches exist
      if (_selectedBranchId == null && _user!.branches.isNotEmpty) {
        _selectedBranchId = _user!.branches.first.id;
      }
      
      notifyListeners();
    } catch (e) {
      // Handle error silently or log it
      debugPrint('Error refreshing user: $e');
    }
  }

  void setSelectedBranch(String branchId) {
    if (_selectedBranchId != branchId) {
      _selectedBranchId = branchId;
      notifyListeners();
      // In a real app, you might want to refresh data for the new branch here
    }
  }

  Future<void> logout() async {
    await _apiService.logout();
    _user = null;
    _selectedBranchId = null;
    notifyListeners();
  }

  Future<void> checkAuth() async {
    final isLoggedIn = await _apiService.isLoggedIn();
    if (isLoggedIn) {
      // In a real app, you might fetch the user profile here
      // For now, we'll just assume they are logged in if a token exists
      // or we can implement a getMe() in ApiService
    }
    notifyListeners();
  }
}
