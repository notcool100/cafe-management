import 'package:flutter/material.dart';
import 'employees_screen.dart';
import 'branches_screen.dart';

class ManagementScreen extends StatelessWidget {
  const ManagementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _buildManagementCard(
          context,
          'Staff Management',
          'Manage your cafe team and roles.',
          Icons.people_alt_outlined,
          const EmployeesScreen(),
        ),
        const SizedBox(height: 16),
        _buildManagementCard(
          context,
          'Branch Management',
          'Add, edit, or remove branches.',
          Icons.storefront_outlined,
          const BranchesScreen(),
        ),
      ],
    );
  }

  Widget _buildManagementCard(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon,
    Widget targetScreen,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        leading: Icon(icon, color: const Color(0xFFE94560), size: 30),
        title: Text(
          title,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(color: Colors.white70, fontSize: 13),
        ),
        trailing: const Icon(Icons.chevron_right, color: Colors.white54),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => targetScreen),
          );
        },
      ),
    );
  }
}
