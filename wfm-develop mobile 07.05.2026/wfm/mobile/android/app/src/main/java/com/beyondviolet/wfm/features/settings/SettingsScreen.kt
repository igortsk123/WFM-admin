package com.beyondviolet.wfm.features.settings

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.beyondviolet.wfm.BuildConfig
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.ui.components.WfmBadge
import com.beyondviolet.wfm.ui.components.BadgeColor
import com.beyondviolet.wfm.ui.components.WfmLoader
import com.beyondviolet.wfm.ui.theme.WFMAppTheme
import com.beyondviolet.wfm.ui.theme.WfmColors
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.components.ToastManager
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import com.beyondviolet.wfm.ui.theme.*
import com.beyondviolet.wfm.core.utils.rememberDebouncedClick
import com.beyondviolet.wfm.core.utils.clickableDebounced

/**
 * Экран "Настройки" (Профиль пользователя)
 *
 * Отображает информацию о текущем пользователе:
 * - Аватар
 * - ФИО
 * - Должность (badge)
 * - Кнопка "Выйти"
 * - Версия приложения
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun SettingsScreen(
    onLogout: () -> Unit,
    showAssignmentsList: Boolean = false,
    onShowAssignmentsListChange: (Boolean) -> Unit = {},
    showSupportScreen: Boolean = false,
    onShowSupportScreenChange: (Boolean) -> Unit = {},
    showDeleteAccountScreen: Boolean = false,
    onShowDeleteAccountScreenChange: (Boolean) -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = koinViewModel()
) {
    val currentUser by viewModel.currentUser.collectAsState()
    val currentAssignment by viewModel.currentAssignment.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val isDevUser by viewModel.isDevUser.collectAsState()
    val impersonationPhone by viewModel.impersonationPhone.collectAsState()
    var showLogoutSheet by remember { mutableStateOf(false) }
    var showShareAppSheet by remember { mutableStateOf(false) }
    var showImpersonationDialog by remember { mutableStateOf(false) }
    var impersonationInput by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val colors = WfmTheme.colors

    LaunchedEffect(Unit) {
        viewModel.onAppear()
    }

    // Debounce для кнопок
    val (_, debouncedShowAssignmentsList) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = {
            if (viewModel.checkCanSwitchAssignments()) {
                onShowAssignmentsListChange(true)
            }
        }
    )

    val (_, debouncedShowImpersonationDialog) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = {
            impersonationInput = impersonationPhone ?: ""
            showImpersonationDialog = true
        }
    )

    val (_, debouncedShowSupportScreen) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = { onShowSupportScreenChange(true) }
    )

    val (_, debouncedShowShareAppSheet) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = { showShareAppSheet = true }
    )

    val (_, debouncedShowLogoutSheet) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = { showLogoutSheet = true }
    )

    val (_, debouncedShowDeleteAccountScreen) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = { onShowDeleteAccountScreenChange(true) }
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(colors.surfacePrimary)
    ) {
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize()
        ) {
            if (isLoading && currentUser == null) {
                // Первая загрузка
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    WfmLoader()
                }
            } else {
                val configuration = LocalConfiguration.current
                val screenHeight = configuration.screenHeightDp.dp

                // Скроллируемый контент
                Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = screenHeight)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Верхняя часть контента
                        Column(
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            // Секция профиля (вверху)
                            Column {
                                ProfileSection(
                                    avatarUrl = currentUser?.photoUrl,
                                    fullName = currentUser?.fullName() ?: "Пользователь",
                                    positionName = currentAssignment?.position?.name,
                                    modifier = Modifier.fillMaxWidth()
                                )

                                // Нижняя граница секции профиля
                                HorizontalDivider(
                                    thickness = 1.dp,
                                    color = colors.borderSecondary
                                )
                            }

                            // Контейнер контента
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                // Кнопка "Назначения" (показывается только если назначений > 1)
                                if (viewModel.shouldShowAssignmentsButton()) {
                                    AssignmentsButton(
                                        onClick = debouncedShowAssignmentsList,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                // Кнопка "Войти как" (только для разработчиков с flags.dev в JWT)
                                if (isDevUser) {
                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        LoginAsButton(
                                            impersonationPhone = impersonationPhone,
                                            onClick = debouncedShowImpersonationDialog,
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                        if (impersonationPhone != null) {
                                            Text(
                                                text = "Активно: $impersonationPhone",
                                                style = WfmTypography.Caption12Regular,
                                                color = colors.textSecondary,
                                                modifier = Modifier.padding(horizontal = 12.dp)
                                            )
                                        }
                                    }
                                }

                                // Кнопка "Поддержка"
                                SupportButton(
                                    onClick = debouncedShowSupportScreen,
                                    modifier = Modifier.fillMaxWidth()
                                )

                                // Кнопка "Поделиться приложением"
                                ShareAppButton(
                                    onClick = debouncedShowShareAppSheet,
                                    modifier = Modifier.fillMaxWidth()
                                )

                                // Кнопка "Удалить учётную запись"
                                DeleteAccountButton(
                                    onClick = debouncedShowDeleteAccountScreen,
                                    modifier = Modifier.fillMaxWidth()
                                )

                                // Кнопка "Выйти"
                                LogoutButton(
                                    onClick = debouncedShowLogoutSheet,
                                    modifier = Modifier.fillMaxWidth()
                                )

                            }
                        }

                        // Версия приложения (внизу контента, но в скролле)
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Версия приложения ${BuildConfig.VERSION_NAME}",
                                style = WfmTypography.Headline14Medium,
                                color = colors.textSecondary
                            )
                        }
                    }
            }
        }

        // Диалог «Войти как»
        if (showImpersonationDialog) {
            AlertDialog(
                onDismissRequest = { showImpersonationDialog = false },
                title = { Text("Войти как") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Введите номер телефона пользователя")
                        OutlinedTextField(
                            value = impersonationInput,
                            onValueChange = { impersonationInput = it },
                            placeholder = { Text("Номер телефона") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        viewModel.setImpersonationPhone(impersonationInput.takeIf { it.isNotBlank() })
                        showImpersonationDialog = false
                    }) { Text("Готово") }
                },
                dismissButton = {
                    Row {
                        if (impersonationPhone != null) {
                            TextButton(onClick = {
                                viewModel.setImpersonationPhone(null)
                                showImpersonationDialog = false
                            }) { Text("Очистить", color = MaterialTheme.colorScheme.error) }
                        }
                        TextButton(onClick = { showImpersonationDialog = false }) { Text("Отмена") }
                    }
                }
            )
        }

        // BottomSheet подтверждения выхода
        LogoutBottomSheet(
            isVisible = showLogoutSheet,
            onDismiss = { showLogoutSheet = false },
            onConfirm = {
                viewModel.logout()
                onLogout()
            }
        )

        // BottomSheet с QR-кодом для скачивания
        ShareAppBottomSheet(
            isVisible = showShareAppSheet,
            onDismiss = { showShareAppSheet = false }
        )

        // Полноэкранный список назначений
        if (showAssignmentsList) {
            currentUser?.let { user ->
                AssignmentsListScreen(
                    assignments = user.assignments,
                    selectedAssignmentId = currentAssignment?.id,
                    onDismiss = { onShowAssignmentsListChange(false) },
                    onSelectAssignment = { assignment ->
                        scope.launch {
                            viewModel.switchAssignment(assignment.id)
                            onShowAssignmentsListChange(false)
                        }
                    }
                )
            }
        }

    }
}

/**
 * Секция профиля пользователя
 *
 * @param avatarUrl URL аватара (если null — показываем заглушку)
 * @param fullName ФИО пользователя
 * @param positionName Название должности (если null — не показываем badge)
 */
@Composable
private fun ProfileSection(
    avatarUrl: String?,
    fullName: String,
    positionName: String?,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Surface(
        modifier = modifier,
        color = colors.surfacePrimary
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                //.statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
        // Аватар
        if (avatarUrl != null) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = "Аватар пользователя",
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
        } else {
            // Заглушка аватара (серый круг с иконкой человека)
            Box(
                modifier = Modifier
                    .size(40.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(id = com.beyondviolet.wfm.ui.R.drawable.ic_person),
                    contentDescription = null,
                    tint = Color.Unspecified
                )
            }
        }

        // ФИО и должность
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = fullName,
                style = WfmTypography.Body14Bold,
                color = colors.textPrimary
            )

            // Badge с должностью (если назначена)
            positionName?.let { position ->
                WfmBadge(
                    text = position,
                    color = BadgeColor.VIOLET
                )
            }
        }
        }
    }
}

/**
 * Кнопка "Назначения"
 */
@Composable
private fun AssignmentsButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Surface(
        modifier = modifier
            .height(44.dp)
            .border(
                width = 1.dp,
                color = colors.borderSecondary,
                shape = RoundedCornerShape(12.dp)
            ),
        shape = RoundedCornerShape(12.dp),
        color = colors.surfaceSecondary,
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Назначения",
                style = WfmTypography.Headline14Medium,
                color = colors.textPrimary
            )

            Icon(
                painter = painterResource(id = com.beyondviolet.wfm.ui.R.drawable.ic_chevron_right),
                contentDescription = "Назначения",
                tint = colors.iconPrimary,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

/**
 * Кнопка "Войти как" (только для разработчиков с flags.dev в JWT)
 */
@Composable
private fun LoginAsButton(
    impersonationPhone: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, colors.borderSecondary, RoundedCornerShape(12.dp))
            .clickableDebounced(debounceTime = 500L, onClick = onClick),
        color = colors.surfaceSecondary,
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp)
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Войти как",
                style = WfmTypography.Headline14Medium,
                color = colors.textPrimary
            )
            Icon(
                painter = painterResource(id = R.drawable.ic_tab_profile),
                contentDescription = "Войти как",
                tint = colors.iconPrimary,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

/**
 * Кнопка "Поддержка"
 */
@Composable
private fun SupportButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Surface(
        modifier = modifier
            .height(44.dp)
            .border(
                width = 1.dp,
                color = colors.borderSecondary,
                shape = RoundedCornerShape(12.dp)
            ),
        shape = RoundedCornerShape(12.dp),
        color = colors.surfaceSecondary,
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Поддержка",
                style = WfmTypography.Headline14Medium,
                color = colors.textPrimary
            )

            Icon(
                painter = painterResource(id = com.beyondviolet.wfm.ui.R.drawable.ic_chevron_right),
                contentDescription = "Поддержка",
                tint = colors.iconPrimary,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

/**
 * Кнопка "Поделиться приложением"
 */
@Composable
private fun ShareAppButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Surface(
        modifier = modifier
            .height(44.dp)
            .border(
                width = 1.dp,
                color = colors.borderSecondary,
                shape = RoundedCornerShape(12.dp)
            ),
        shape = RoundedCornerShape(12.dp),
        color = colors.surfaceSecondary,
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Поделиться приложением",
                style = WfmTypography.Headline14Medium,
                color = colors.textPrimary
            )

            Icon(
                painter = painterResource(id = R.drawable.ic_qr),
                contentDescription = "QR-код",
                tint = colors.iconPrimary,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

/**
 * Кнопка "Удалить учётную запись"
 */
@Composable
private fun DeleteAccountButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Surface(
        modifier = modifier
            .height(44.dp)
            .border(
                width = 1.dp,
                color = colors.borderSecondary,
                shape = RoundedCornerShape(12.dp)
            ),
        shape = RoundedCornerShape(12.dp),
        color = colors.surfaceSecondary,
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Удалить учётную запись",
                style = WfmTypography.Headline14Medium,
                color = colors.textError
            )

            Icon(
                painter = painterResource(id = R.drawable.ic_tab_profile),
                contentDescription = null,
                tint = colors.textError,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

/**
 * Кнопка "Выйти"
 */
@Composable
private fun LogoutButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors

    Surface(
        modifier = modifier
            .height(44.dp)
            .border(
                width = 1.dp,
                color = colors.borderSecondary,
                shape = RoundedCornerShape(12.dp)
            ),
        shape = RoundedCornerShape(12.dp),
        color = colors.surfaceSecondary,
        onClick = onClick
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Выйти",
                style = WfmTypography.Headline14Medium,
                color = colors.textPrimary
            )

            Icon(
                painter = painterResource(id = R.drawable.ic_signout),
                contentDescription = "Выйти",
                tint = colors.iconPrimary,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// PREVIEW
// ─────────────────────────────────────────────────────────────────

@Preview(name = "Settings Screen - Light", showBackground = true)
@Composable
private fun SettingsScreenPreview() {
    WFMAppTheme(darkTheme = false) {
        SettingsScreen(
            onLogout = {},
            viewModel = previewViewModel()
        )
    }
}

@Preview(name = "Settings Screen - Dark", showBackground = true)
@Composable
private fun SettingsScreenDarkPreview() {
    WFMAppTheme(darkTheme = true) {
        SettingsScreen(
            onLogout = {},
            viewModel = previewViewModel()
        )
    }
}

@Preview(name = "Profile Section - Light", showBackground = true)
@Composable
private fun ProfileSectionPreview() {
    WFMAppTheme(darkTheme = false) {
        ProfileSection(
            avatarUrl = null,
            fullName = "Иванов Иван Иванович",
            positionName = "Кассир"
        )
    }
}

@Preview(name = "Logout Button - Light", showBackground = true)
@Composable
private fun LogoutButtonPreview() {
    WFMAppTheme(darkTheme = false) {
        LogoutButton(onClick = {})
    }
}

// Моки для превью - упрощенная ViewModel с тестовыми данными
private class PreviewSettingsViewModel : SettingsViewModel(
    userManager = null!!, // Не используется в preview
    toastManager = ToastManager(),
    tokenStorage = null!!,
    impersonationStorage = null!!,
    analyticsService = com.beyondviolet.wfm.core.analytics.NoOpAnalyticsService(),
    userService = null!!
) {
    private val _currentUser = kotlinx.coroutines.flow.MutableStateFlow<com.beyondviolet.wfm.core.models.UserMe?>(
        com.beyondviolet.wfm.core.models.UserMe(
            id = 1,
            ssoId = "550e8400-e29b-41d4-a716-446655440000",
            externalId = 44445,
            employeeType = com.beyondviolet.wfm.core.models.EmployeeType(
                id = 1,
                code = "full_time",
                name = "Полная занятость"
            ),
            permissions = emptyList(),
            assignments = listOf(
                com.beyondviolet.wfm.core.models.Assignment(
                    id = 1,
                    externalId = 123,
                    companyName = "Компания 1",
                    position = com.beyondviolet.wfm.core.models.Position(
                        id = 1,
                        code = "cashier",
                        name = "Кассир",
                        description = null,
                        role = com.beyondviolet.wfm.core.models.Role(
                            id = 2,
                            code = "worker",
                            name = "Работник",
                            description = null
                        )
                    ),
                    rank = com.beyondviolet.wfm.core.models.Rank(
                        id = 3,
                        code = "rank_3",
                        name = "Разряд 3"
                    ),
                    store = com.beyondviolet.wfm.core.models.Store(
                        id = 1,
                        name = "Магазин на Ленина 1",
                        address = "ул. Ленина, д. 1",
                        createdAt = kotlinx.datetime.Clock.System.now()
                    ),
                    dateStart = "2024-01-01",
                    dateEnd = null
                )
            ),
            firstName = "Иван",
            lastName = "Иванов",
            middleName = "Иванович",
            email = "ivanov@example.com",
            phone = "+79991234567",
            photoUrl = null,
            gender = "male",
            birthDate = "1990-01-01"
        )
    )

    override val currentUser: kotlinx.coroutines.flow.StateFlow<com.beyondviolet.wfm.core.models.UserMe?>
        get() = _currentUser

    private val _isLoading = kotlinx.coroutines.flow.MutableStateFlow(false)
    override val isLoading: kotlinx.coroutines.flow.StateFlow<Boolean>
        get() = _isLoading

    private val _isRefreshing = kotlinx.coroutines.flow.MutableStateFlow(false)
    override val isRefreshing: kotlinx.coroutines.flow.StateFlow<Boolean>
        get() = _isRefreshing

    override fun refresh() {
        // Mock refresh - ничего не делаем
    }

    override fun logout() {
        _currentUser.value = null
    }
}

private fun previewViewModel(): SettingsViewModel = PreviewSettingsViewModel()