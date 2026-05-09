package com.beyondviolet.wfm.feature.auth.presentation.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.feature.auth.R
import com.beyondviolet.wfm.feature.auth.util.EmailUtils
import com.beyondviolet.wfm.feature.auth.util.MaxUtils
import com.beyondviolet.wfm.feature.auth.util.MessengerUtils
import com.beyondviolet.wfm.feature.auth.util.PhoneUtils
import com.beyondviolet.wfm.feature.auth.util.TelegramUtils
import com.beyondviolet.wfm.ui.components.ToastManager
import com.beyondviolet.wfm.ui.theme.*
import org.koin.compose.koinInject

/**
 * Экран поддержки
 * Дизайн из Figma: node-id=4711-22621
 */
@Composable
fun SupportScreen(
    onNavigateBack: () -> Unit = {},
    toastManager: ToastManager = koinInject()
) {
    var lastBackClickTime by remember { mutableLongStateOf(0L) }
    val debouncedBack = {
        val now = System.currentTimeMillis()
        if (now - lastBackClickTime > 500L) {
            lastBackClickTime = now
            onNavigateBack()
        }
    }

    SupportContent(onNavigateBack = debouncedBack, toastManager = toastManager)
}

@Composable
private fun SupportContent(
    onNavigateBack: () -> Unit = {},
    toastManager: ToastManager
) {
    val colors = WfmTheme.colors
    var expandedIndex by remember { mutableIntStateOf(-1) }

    data class FaqItem(val title: String, val imageRes: Int)
    val faqItems = listOf(
        FaqItem("Вход по номеру телефона", R.drawable.phone_resolve),
        FaqItem("Вход через MAX", R.drawable.max_resolve),
        FaqItem("Вход через Telegram", R.drawable.tg_resolve)
    )

    Scaffold(
        containerColor = colors.surfaceBase
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Navigation bar
            SupportNavBar(onNavigateBack = onNavigateBack)

            // Scrollable content
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                // Section header
                Text(
                    text = "Проблемы с авторизацией",
                    style = WfmTypography.Body16Regular,
                    color = colors.textTertiary,
                    maxLines = 1,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = WfmSpacing.L)
                        .padding(top = WfmSpacing.S, bottom = WfmSpacing.XS)
                )

                // FAQ accordion cards
                Column(
                    verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS),
                    modifier = Modifier.padding(horizontal = WfmSpacing.L)
                ) {
                    faqItems.forEachIndexed { index, item ->
                        SupportFaqCard(
                            title = item.title,
                            imageRes = item.imageRes,
                            isExpanded = expandedIndex == index,
                            onToggle = {
                                expandedIndex = if (expandedIndex == index) -1 else index
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                // Contact section
                SupportContactSection(toastManager = toastManager)
            }
        }
    }
}

@Composable
private fun SupportNavBar(onNavigateBack: () -> Unit) {
    val colors = WfmTheme.colors

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = WfmSpacing.XS)
        ) {
            IconButton(onClick = onNavigateBack) {
                Icon(
                    painter = painterResource(id = com.beyondviolet.wfm.ui.R.drawable.ic_back),
                    contentDescription = "Назад",
                    tint = colors.barsTextPrimary,
                    modifier = Modifier.size(40.dp)
                )
            }
            Text(
                text = "Поддержка",
                style = WfmTypography.Headline16Bold,
                color = colors.barsTextPrimary
            )
        }
        HorizontalDivider(
            modifier = Modifier.align(Alignment.BottomCenter),
            color = colors.barsBorder,
            thickness = WfmStroke.S
        )
    }
}

@Composable
private fun SupportFaqCard(
    title: String,
    imageRes: Int,
    isExpanded: Boolean,
    onToggle: () -> Unit
) {
    val colors = WfmTheme.colors

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = colors.cardSurfaceSecondary,
                shape = RoundedCornerShape(WfmRadius.XL)
            )
            .border(
                width = WfmStroke.S,
                color = colors.cardBorderSecondary,
                shape = RoundedCornerShape(WfmRadius.XL)
            )
            .clip(RoundedCornerShape(WfmRadius.XL))
            .clickable(onClick = onToggle)
    ) {
        // Заголовок — всегда виден
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = 48.dp)
                .padding(if (isExpanded) WfmSpacing.L else WfmSpacing.M)
        ) {
            Text(
                text = title,
                style = WfmTypography.Headline14Medium,
                color = colors.cardTextPrimary,
                maxLines = 1,
                modifier = Modifier.weight(1f)
            )
            Icon(
                painter = painterResource(id = if (isExpanded) com.beyondviolet.wfm.ui.R.drawable.ic_chevron_up else com.beyondviolet.wfm.ui.R.drawable.ic_chevron_down),
                contentDescription = null,
                tint = colors.cardTextPrimary,
                modifier = Modifier.size(20.dp)
            )
        }

        // Раскрытый контент
        AnimatedVisibility(
            visible = isExpanded,
            enter = expandVertically(animationSpec = tween(250)),
            exit = shrinkVertically(animationSpec = tween(250))
        ) {
            Column {
                HorizontalDivider(
                    color = colors.cardBorderSecondary,
                    thickness = WfmStroke.S
                )
                Image(
                    painter = painterResource(id = imageRes),
                    contentDescription = null,
                    contentScale = ContentScale.FillWidth,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = WfmSpacing.L, vertical = WfmSpacing.M)
                )
            }
        }
    }
}

@Composable
private fun SupportContactSection(toastManager: ToastManager) {
    val colors = WfmTheme.colors
    val context = LocalContext.current

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = WfmSpacing.XXXL)
    ) {
        Spacer(modifier = Modifier.height(WfmSpacing.L))

        Text(
            text = "Возникли вопросы?\nСвяжитесь со службой поддержки",
            style = WfmTypography.Headline14Bold,
            color = colors.textPrimary,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(WfmSpacing.L))

        Row(
            horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S),
            modifier = Modifier.fillMaxWidth()
        ) {

            SupportContactButton(
                title = "MAX",
                iconRes = R.drawable.ic_max_support,
                copyText = MaxUtils.createMaxDeepLink("id7017422412_1_bot"),
                modifier = Modifier.weight(1f),
                toastManager = toastManager,
                onClick = { MessengerUtils.openUrl(context, MaxUtils.createMaxDeepLink("id7017422412_1_bot")) }
            )
            SupportContactButton(
                title = "Telegram",
                iconRes = R.drawable.ic_tg_support,
                copyText = TelegramUtils.createTelegramDeepLink("Test_hv_bot"),
                modifier = Modifier.weight(1f),
                toastManager = toastManager,
                onClick = { MessengerUtils.openUrl(context, TelegramUtils.createTelegramDeepLink("Test_hv_bot")) }
            )
        }

        Spacer(modifier = Modifier.height(WfmSpacing.S))

        Row(
            horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S),
            modifier = Modifier.fillMaxWidth()
        ) {
            SupportContactButton(
                title = "Позвонить",
                iconRes = R.drawable.ic_phone_support,
                copyText = "+78003505628",
                modifier = Modifier.weight(1f),
                toastManager = toastManager,
                onClick = { PhoneUtils.call(context, "+78003505628") }
            )
            SupportContactButton(
                title = "Почта",
                iconRes = R.drawable.ic_mail_support,
                copyText = "support@beyondviolet.com",
                modifier = Modifier.weight(1f),
                toastManager = toastManager,
                onClick = { EmailUtils.compose(context, "support@beyondviolet.com") }
            )
        }

        Spacer(modifier = Modifier.height(WfmSpacing.S))
    }

    Spacer(modifier = Modifier.height(WfmSpacing.L))
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun SupportContactButton(
    title: String,
    iconRes: Int,
    copyText: String,
    modifier: Modifier = Modifier,
    toastManager: ToastManager,
    onClick: () -> Unit
) {
    val colors = WfmTheme.colors
    val clipboardManager = LocalClipboardManager.current
    val haptic = LocalHapticFeedback.current

    Row(
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .height(32.dp)
            .background(
                color = colors.buttonSecondaryBgDefault,
                shape = RoundedCornerShape(WfmRadius.M)
            )
            .clip(RoundedCornerShape(WfmRadius.M))
            .combinedClickable(
                onClick = onClick,
                onLongClick = {
                    clipboardManager.setText(AnnotatedString(copyText))
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    toastManager.show("Скопировано в буфер обмена")
                }
            )
            .padding(horizontal = WfmSpacing.M, vertical = WfmSpacing.S)
    ) {
        Icon(
            painter = painterResource(id = iconRes),
            contentDescription = null,
            tint = colors.buttonSecondaryTextDefault,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(WfmSpacing.XXS))
        Text(
            text = title,
            style = WfmTypography.Headline12Medium,
            color = colors.buttonSecondaryTextDefault
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
fun SupportScreenPreview() {
    WfmTheme {
        SupportContent(toastManager = com.beyondviolet.wfm.ui.components.ToastManager())
    }
}
