import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'home_screen.dart';
import 'orders_screen.dart';
import 'menu_screen.dart';
import 'management_screen.dart';
import 'reports_screen.dart';
import 'profile_tab.dart';
import '../widgets/branch_selector.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;
    final role = user?.role ?? '';

    // Define navigation items based on role
    final List<Map<String, dynamic>> navItems = _getNavItems(role);

    return Scaffold(
      backgroundColor: const Color(0xFF1A1A2E),
      appBar: AppBar(
        leadingWidth: 56,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12),
          child: GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ProfileTab()),
              );
            },
            child: const CircleAvatar(
              backgroundColor: Color(0xFFE94560),
              child: Icon(Icons.person, color: Colors.white, size: 20),
            ),
          ),
        ),
        title: Text(navItems[_selectedIndex]['title'], style: const TextStyle(color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: BranchSelector(),
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: navItems.map<Widget>((item) => item['screen'] as Widget).toList(),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 10,
              spreadRadius: 2,
            ),
          ],
        ),
        child: BottomNavigationBar(
          items: navItems.map<BottomNavigationBarItem>((item) {
            return BottomNavigationBarItem(
              icon: Icon(item['icon']),
              activeIcon: Icon(item['activeIcon']),
              label: item['title'],
            );
          }).toList(),
          currentIndex: _selectedIndex,
          selectedItemColor: const Color(0xFFE94560),
          unselectedItemColor: Colors.white.withOpacity(0.5),
          backgroundColor: const Color(0xFF16213E),
          onTap: (index) {
            setState(() {
              _selectedIndex = index;
            });
          },
          type: BottomNavigationBarType.fixed,
          showUnselectedLabels: true,
          elevation: 0,
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _getNavItems(String role) {
    List<Map<String, dynamic>> items = [
      {
        'title': 'Home',
        'icon': Icons.dashboard_outlined,
        'activeIcon': Icons.dashboard,
        'screen': const HomeTab(),
      },
      {
        'title': 'Orders',
        'icon': Icons.assignment_outlined,
        'activeIcon': Icons.assignment,
        'screen': const OrdersScreen(),
      },
    ];

    // Add Menu for ADMIN, SUPER_ADMIN, and MANAGER
    if (role == 'ADMIN' || role == 'SUPER_ADMIN' || role == 'MANAGER') {
      items.add({
        'title': 'Menu',
        'icon': Icons.restaurant_menu,
        'activeIcon': Icons.restaurant_menu_rounded,
        'screen': const MenuScreen(),
      });
    }

    // Add Management only for ADMIN and SUPER_ADMIN
    if (role == 'ADMIN' || role == 'SUPER_ADMIN') {
      items.add({
        'title': 'Manage',
        'icon': Icons.settings_outlined,
        'activeIcon': Icons.settings,
        'screen': const ManagementScreen(),
      });
    }

    // Add Reports for all roles (or filter based on role if needed)
    // The user didn't specify, but usually reports are for all roles
    items.add({
      'title': 'Reports',
      'icon': Icons.bar_chart_outlined,
      'activeIcon': Icons.bar_chart_rounded,
      'screen': const ReportsScreen(),
    });

    return items;
  }
}
