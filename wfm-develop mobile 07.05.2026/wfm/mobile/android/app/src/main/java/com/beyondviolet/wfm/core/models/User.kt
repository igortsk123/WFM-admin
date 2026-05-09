package com.beyondviolet.wfm.core.models

import com.beyondviolet.wfm.core.serialization.InstantSerializer
import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Справочная модель: Роль пользователя
 */
@Serializable
data class Role(
    val id: Int,
    val code: String,
    val name: String,
    val description: String? = null
)

/**
 * Справочная модель: Тип сотрудника
 */
@Serializable
data class EmployeeType(
    val id: Int,
    val code: String,
    val name: String,
    val description: String? = null
)

/**
 * Справочная модель: Должность
 */
@Serializable
data class Position(
    val id: Int,
    val code: String,
    val name: String,
    val description: String? = null,
    val role: Role? = null
)

/**
 * Справочная модель: Разряд сотрудника
 */
@Serializable
data class Rank(
    val id: Int,
    val code: String,
    val name: String
)

/**
 * Модель магазина
 */
@Serializable
data class Store(
    val id: Int,
    val name: String,
    val address: String? = null,
    @SerialName("created_at")
    @Serializable(with = InstantSerializer::class)
    val createdAt: Instant
)

/**
 * Назначение сотрудника (связь с LAMA)
 */
@Serializable
data class Assignment(
    val id: Int,
    @SerialName("external_id")
    val externalId: Int? = null,
    @SerialName("company_name")
    val companyName: String? = null,
    val position: Position? = null,
    val rank: Rank? = null,
    val store: Store? = null,
    @SerialName("date_start")
    val dateStart: String? = null,  // YYYY-MM-DD
    @SerialName("date_end")
    val dateEnd: String? = null     // YYYY-MM-DD
) {
    fun storeName(): String? = store?.name
}

/**
 * Типы привилегий работников
 */
@Serializable
enum class PermissionType {
    @SerialName("CASHIER")
    CASHIER,
    @SerialName("SALES_FLOOR")
    SALES_FLOOR,
    @SerialName("SELF_CHECKOUT")
    SELF_CHECKOUT,
    @SerialName("WAREHOUSE")
    WAREHOUSE
}

/**
 * Привилегия работника
 */
@Serializable
data class Permission(
    val id: String,
    val permission: PermissionType,
    @SerialName("granted_at")
    @Serializable(with = InstantSerializer::class)
    val grantedAt: Instant,
    @SerialName("granted_by")
    val grantedBy: Int
)

/**
 * Полная информация о пользователе (GET /users/me)
 * Включает локальные данные + SSO данные (ФИО, email, телефон, фото)
 */
@Serializable
data class UserMe(
    // Локальные данные
    val id: Int,
    @SerialName("sso_id")
    val ssoId: String,
    @SerialName("external_id")
    val externalId: Int? = null,
    @SerialName("employee_type")
    val employeeType: EmployeeType? = null,
    val permissions: List<Permission> = emptyList(),
    val assignments: List<Assignment> = emptyList(),

    // SSO данные
    @SerialName("first_name")
    val firstName: String? = null,
    @SerialName("last_name")
    val lastName: String? = null,
    @SerialName("middle_name")
    val middleName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    @SerialName("photo_url")
    val photoUrl: String? = null,
    val gender: String? = null,
    @SerialName("birth_date")
    val birthDate: String? = null  // YYYY-MM-DD
) {
    /**
     * Получить полное имя
     */
    fun fullName(): String = listOfNotNull(lastName, firstName, middleName)
        .joinToString(" ")
        .ifEmpty { email ?: "Пользователь" }
}

/**
 * Информация о пользователе (GET /users/{id}, PATCH /users/{id})
 * Только локальные данные без SSO
 */
@Serializable
data class User(
    val id: Int,
    @SerialName("sso_id")
    val ssoId: String,
    @SerialName("external_id")
    val externalId: Int? = null,
    @SerialName("employee_type")
    val employeeType: EmployeeType? = null,
    val permissions: List<Permission> = emptyList(),
    val assignments: List<Assignment> = emptyList(),
    @SerialName("updated_at")
    @Serializable(with = InstantSerializer::class)
    val updatedAt: Instant
)

/**
 * Request для обновления данных пользователя (PATCH /users/{id})
 */
@Serializable
data class UserUpdate(
    @SerialName("external_id")
    val externalId: Int? = null,
    @SerialName("role_id")
    val roleId: Int? = null,
    @SerialName("type_id")
    val typeId: Int? = null,
    @SerialName("position_id")
    val positionId: Int? = null,
    val grade: Int? = null,
    @SerialName("store_id")
    val storeId: String? = null
)

/**
 * Request для обновления привилегий (PATCH /users/{id}/permissions)
 */
@Serializable
data class PermissionsUpdate(
    val permissions: List<PermissionType>
)

/**
 * Получить отображаемое имя привилегии
 */
fun PermissionType.displayName(): String = when (this) {
    PermissionType.CASHIER -> "Кассир"
    PermissionType.SALES_FLOOR -> "Торговый зал"
    PermissionType.SELF_CHECKOUT -> "Касса самообслуживания"
    PermissionType.WAREHOUSE -> "Склад"
}
