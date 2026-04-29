class Branch {
  final String id;
  final String name;
  final String? location;
  final bool isActive;

  Branch({
    required this.id,
    required this.name,
    this.location,
    this.isActive = true,
  });

  factory Branch.fromJson(Map<String, dynamic> json) {
    return Branch(
      id: json['id'],
      name: json['name'],
      location: json['location'],
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'location': location,
      'isActive': isActive,
    };
  }
}

class User {
  final String id;
  final String email;
  final String name;
  final String role;
  final String? tenantId;
  final List<String> branchIds;
  final List<Branch> branches;

  User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.tenantId,
    this.branchIds = const [],
    this.branches = const [],
  });

  factory User.fromJson(Map<String, dynamic> json) {
    var branchList = json['branches'] as List? ?? [];
    List<Branch> branches = branchList.map((i) => Branch.fromJson(i)).toList();
    
    return User(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      role: json['role'] ?? '',
      tenantId: json['tenantId'],
      branchIds: List<String>.from(json['branchIds'] ?? []),
      branches: branches,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'tenantId': tenantId,
      'branchIds': branchIds,
      'branches': branches.map((b) => b.toJson()).toList(),
    };
  }
}
