import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/user.dart';

class BranchSelector extends StatelessWidget {
  const BranchSelector({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    // Only show for management roles
    final bool isManagement = user?.role == 'ADMIN' || 
                             user?.role == 'SUPER_ADMIN' || 
                             user?.role == 'MANAGER';

    if (!isManagement) {
      return const SizedBox.shrink();
    }

    final branches = user?.branches ?? [];

    if (branches.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.redAccent.withOpacity(0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.redAccent.withOpacity(0.2)),
        ),
        child: InkWell(
          onTap: () => authProvider.refreshUser(),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 16),
              SizedBox(width: 4),
              Text(
                'No Branch',
                style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: authProvider.selectedBranchId,
          icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFFE94560), size: 18),
          elevation: 16,
          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
          dropdownColor: const Color(0xFF16213E),
          borderRadius: BorderRadius.circular(15),
          onChanged: (String? newValue) {
            if (newValue != null) {
              authProvider.setSelectedBranch(newValue);
            }
          },
          items: branches.map<DropdownMenuItem<String>>((Branch branch) {
            return DropdownMenuItem<String>(
              value: branch.id,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(branch.name),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}
