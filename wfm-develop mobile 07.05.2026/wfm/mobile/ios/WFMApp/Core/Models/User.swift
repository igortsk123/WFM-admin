import Foundation

// MARK: - Справочные модели

/// Роль пользователя (справочник)
struct Role: Codable, Equatable, Hashable {
    let id: Int
    let code: String
    let name: String
    let description: String?
}

/// Тип сотрудника (справочник)
struct EmployeeType: Codable, Equatable, Hashable {
    let id: Int
    let code: String
    let name: String
    let description: String?

    enum CodingKeys: String, CodingKey {
        case id, code, name, description
    }
}

/// Должность (справочник)
struct Position: Codable, Equatable, Hashable {
    let id: Int
    let code: String
    let name: String
    let description: String?
    let role: Role?
}

/// Разряд сотрудника (справочник)
struct Rank: Codable, Equatable, Hashable {
    let id: Int
    let code: String
    let name: String
}

/// Магазин
struct Store: Codable, Equatable, Hashable {
    let id: Int
    let name: String
    let address: String?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, address
        case createdAt = "created_at"
    }
}

/// Назначение сотрудника (связь с LAMA)
struct Assignment: Codable, Equatable, Hashable {
    let id: Int
    let externalId: Int?
    let companyName: String?
    let position: Position?
    let rank: Rank?
    let store: Store?
    let dateStart: String?  // YYYY-MM-DD
    let dateEnd: String?    // YYYY-MM-DD

    enum CodingKeys: String, CodingKey {
        case id
        case externalId = "external_id"
        case companyName = "company_name"
        case position, rank
        case store
        case dateStart = "date_start"
        case dateEnd = "date_end"
    }

    var storeName: String? {
        store?.name
    }
}

// MARK: - Привилегии

/// Типы привилегий работников
enum PermissionType: String, Codable, CaseIterable {
    case cashier = "CASHIER"
    case salesFloor = "SALES_FLOOR"
    case selfCheckout = "SELF_CHECKOUT"
    case warehouse = "WAREHOUSE"

    var displayName: String {
        switch self {
        case .cashier: return "Кассир"
        case .salesFloor: return "Торговый зал"
        case .selfCheckout: return "Касса самообслуживания"
        case .warehouse: return "Склад"
        }
    }

    var description: String {
        switch self {
        case .cashier: return "Работа на кассе"
        case .salesFloor: return "Работа в торговом зале (выкладка, переоценка, уборка)"
        case .selfCheckout: return "Работа на кассе самообслуживания"
        case .warehouse: return "Работа на складе (приёмка, инвентаризация)"
        }
    }
}

/// Привилегия работника
struct Permission: Identifiable, Codable, Equatable, Hashable {
    let id: String
    let permission: PermissionType
    let grantedAt: Date
    let grantedBy: Int  // integer ID менеджера

    enum CodingKeys: String, CodingKey {
        case id, permission
        case grantedAt = "granted_at"
        case grantedBy = "granted_by"
    }
}

// MARK: - Пользователь

/// Полная информация о текущем пользователе (GET /users/me)
/// Включает локальные данные + SSO данные (ФИО, email, телефон, фото)
struct UserMe: Codable, Equatable {
    // Локальные данные
    let id: Int        // internal integer ID
    let ssoId: String  // UUID из SSO
    let externalId: Int?
    let employeeType: EmployeeType?
    let permissions: [Permission]
    let assignments: [Assignment]

    // SSO данные
    let firstName: String?
    let lastName: String?
    let middleName: String?
    let email: String?
    let phone: String?
    let photoUrl: String?
    let gender: String?
    let birthDate: String?  // YYYY-MM-DD

    enum CodingKeys: String, CodingKey {
        case id
        case ssoId = "sso_id"
        case externalId = "external_id"
        case employeeType = "employee_type"
        case permissions
        case assignments
        case firstName = "first_name"
        case lastName = "last_name"
        case middleName = "middle_name"
        case email
        case phone
        case photoUrl = "photo_url"
        case gender
        case birthDate = "birth_date"
    }

    /// Получить полное имя
    var fullName: String {
        [lastName, firstName, middleName]
            .compactMap { $0 }
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespaces)
            .isEmpty ? (email ?? "Пользователь") : [lastName, firstName, middleName]
                .compactMap { $0 }
                .joined(separator: " ")
    }

    /// Проверить наличие конкретной привилегии
    func hasPermission(_ permission: PermissionType) -> Bool {
        permissions.contains { $0.permission == permission }
    }
}

/// Информация о пользователе (GET /users/{id}, PATCH /users/{id})
/// Только локальные данные без SSO
struct User: Codable, Equatable {
    let id: Int        // internal integer ID
    let ssoId: String  // UUID из SSO
    let externalId: Int?
    let employeeType: EmployeeType?
    let permissions: [Permission]
    let assignments: [Assignment]
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case ssoId = "sso_id"
        case externalId = "external_id"
        case employeeType = "employee_type"
        case permissions
        case assignments
        case updatedAt = "updated_at"
    }

    /// Проверить наличие конкретной привилегии
    func hasPermission(_ permission: PermissionType) -> Bool {
        permissions.contains { $0.permission == permission }
    }
}

// MARK: - Request модели

/// Request для обновления данных пользователя (PATCH /users/{id})
struct UserUpdate: Codable {
    let externalId: Int?
    let roleId: Int?
    let typeId: Int?
    let positionId: Int?
    let grade: Int?
    let storeId: String?

    enum CodingKeys: String, CodingKey {
        case externalId = "external_id"
        case roleId = "role_id"
        case typeId = "type_id"
        case positionId = "position_id"
        case grade
        case storeId = "store_id"
    }
}

/// Request для обновления привилегий (PATCH /users/{id}/permissions)
struct PermissionsUpdate: Codable {
    let permissions: [PermissionType]
}

// MARK: - Assignment Display

import WFMUI

extension Assignment {
    /// Цвет badge для должности
    /// Детерминированный выбор на основе position.id
    func badgeColor() -> BadgeColor {
        guard let positionId = position?.id else { return .violet }
        let colors: [BadgeColor] = [.violet, .blue, .yellow, .pink, .orange, .green]
        return colors[positionId % colors.count]
    }
}
