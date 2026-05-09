package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Маска форматирования телефона: +7 (999) 999 99-99
 * Входной формат: "+7XXXXXXXXXX" или "+7" или ""
 */
private class PhoneVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val input = text.text

        // Пустой ввод - показываем плейсхолдер
        if (input.isEmpty()) {
            return TransformedText(AnnotatedString(""), OffsetMapping.Identity)
        }

        // Получаем цифры после +7
        val digitsAfterCode = if (input.startsWith("+7")) {
            input.drop(2).filter { it.isDigit() }
        } else {
            input.filter { it.isDigit() }
        }

        // Форматируем: +7 (XXX) XXX XX-XX
        val formatted = buildString {
            append("+7")
            if (digitsAfterCode.isNotEmpty()) {
                append(" (")
                digitsAfterCode.forEachIndexed { index, char ->
                    append(char)
                    when (index) {
                        2 -> append(") ")
                        5 -> append(" ")
                        7 -> append("-")
                    }
                }
            }
        }

        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                // Входной: +7XXXXXXXXXX (позиции 0-11)
                // Выходной: +7 (XXX) XXX XX-XX
                val result = when {
                    offset <= 2 -> offset                    // +7
                    offset <= 5 -> offset + 2               // +7 (XXX
                    offset <= 8 -> offset + 4               // +7 (XXX) XXX
                    offset <= 10 -> offset + 5              // +7 (XXX) XXX XX
                    offset <= 12 -> offset + 6              // +7 (XXX) XXX XX-XX
                    else -> formatted.length
                }
                return result.coerceAtMost(formatted.length)
            }

            override fun transformedToOriginal(offset: Int): Int {
                // Выходной: +7 (XXX) XXX XX-XX
                // Входной: +7XXXXXXXXXX
                val result = when {
                    offset <= 2 -> offset                    // +7
                    offset <= 3 -> 2                         // пробел или (
                    offset <= 7 -> offset - 2               // (XXX
                    offset <= 9 -> 5                         // ) пробел
                    offset <= 13 -> offset - 4              // XXX
                    offset <= 14 -> 8                        // пробел
                    offset <= 17 -> offset - 5              // XX
                    offset <= 18 -> 10                       // -
                    else -> offset - 6                       // XX
                }
                return result.coerceIn(0, input.length)
            }
        }

        return TransformedText(AnnotatedString(formatted), offsetMapping)
    }
}

/**
 * Поле ввода телефона дизайн-системы WFM
 * Единое поле с плейсхолдером +7 (999) 999 99-99
 * С кнопкой очистки (крестиком) когда есть текст
 *
 * @param value Значение поля (формат: "+7XXXXXXXXXX" или пустое)
 * @param onValueChange Callback при изменении значения
 * @param modifier Modifier
 * @param enabled Активно ли поле
 */
@Composable
fun WfmPhoneTextField(
    value: TextFieldValue,
    onValueChange: (TextFieldValue) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
    errorMessage: String? = null,
    focusRequester: androidx.compose.ui.focus.FocusRequester? = null
) {
    val colors = WfmTheme.colors
    val phoneTransformation = remember { PhoneVisualTransformation() }
    val borderColor = if (isError) colors.inputBorderError else colors.inputBorder
    val backgroundColor = colors.inputBg

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)) {
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        enabled = enabled,
        textStyle = WfmTypography.Body14Regular.copy(color = colors.textPrimary),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        singleLine = true,
        cursorBrush = SolidColor(colors.textBrand),
        visualTransformation = phoneTransformation,
        modifier = Modifier
            .fillMaxWidth()
            .then(focusRequester?.let { Modifier.focusRequester(it) } ?: Modifier)
            .background(
                color = backgroundColor,
                shape = RoundedCornerShape(WfmRadius.L)
            )
            .border(
                width = 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(WfmRadius.L)
            )
            .padding(vertical = WfmSpacing.M)
            .padding(start = WfmSpacing.M)
            .padding(end = WfmSpacing.L),
        decorationBox = { innerTextField ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Text field с placeholder
                Box(modifier = Modifier.weight(1f)) {
                    if (value.text.isEmpty()) {
                        Text(
                            text = "+7 (999) 999 99-99",
                            style = WfmTypography.Body14Regular,
                            color = colors.textPlaceholder
                        )
                    }
                    innerTextField()
                }

                // Clear button (крестик) - всегда занимает место, но невидим когда нет текста
                IconButton(
                    onClick = { onValueChange(TextFieldValue("")) },
                    enabled = value.text.isNotEmpty() && enabled,
                    modifier = Modifier
                        .size(24.dp)
                        .alpha(if (value.text.isNotEmpty() && enabled) 1f else 0f)
                ) {
                    Icon(
                        painter = painterResource(id = com.beyondviolet.wfm.ui.R.drawable.ic_close),
                        contentDescription = "Очистить",
                        tint = colors.iconSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    )

        if (isError && errorMessage != null) {
            Text(
                text = errorMessage,
                style = WfmTypography.Body12Medium,
                color = colors.textError
            )
        }
    }
}

/**
 * Текстовое поле дизайн-системы WFM по спецификации Figma
 *
 * Поддерживает:
 * - Label (заголовок)
 * - Placeholder
 * - Caption (подсказка)
 * - Error state с сообщением
 * - Leading/Trailing иконки
 * - Multiline (text area)
 * - Disabled state
 *
 * @param value Значение поля
 * @param onValueChange Callback при изменении значения
 * @param modifier Modifier для всего компонента (Column)
 * @param label Заголовок поля (опционально)
 * @param placeholder Плейсхолдер
 * @param caption Подсказка снизу (опционально)
 * @param errorMessage Сообщение об ошибке (опционально)
 * @param isError Флаг ошибки (меняет border на красный)
 * @param enabled Активно ли поле
 * @param leadingIcon Иконка слева (опционально)
 * @param trailingIcon Иконка справа (опционально)
 * @param maxLines Максимальное количество строк (1 = single line, >1 = multiline)
 * @param minLines Минимальное количество строк для multiline
 * @param keyboardOptions Опции клавиатуры
 * @param visualTransformation Трансформация отображения текста
 */
@Composable
fun WfmTextField(
    value: TextFieldValue,
    onValueChange: (TextFieldValue) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "",
    caption: String? = null,
    errorMessage: String? = null,
    isError: Boolean = false,
    enabled: Boolean = true,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    maxLines: Int = 1,
    minLines: Int = 1,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    textAlign: TextAlign = TextAlign.Start,
    backgroundColor: Color? = null
) {
    val colors = WfmTheme.colors
    val borderColor = when {
        isError -> colors.inputBorderError
        !enabled -> colors.inputBorderDisabled
        else -> colors.inputBorder
    }
    val textColor = when {
        !enabled -> colors.textTertiary
        else -> colors.textPrimary
    }

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
    ) {
        // Label (заголовок)
        if (label != null) {
            Text(
                text = label,
                style = WfmTypography.Body14Bold,
                color = colors.textPrimary
            )
        }

        // Input поле
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            textStyle = WfmTypography.Body14Regular.copy(color = textColor, textAlign = textAlign),
            keyboardOptions = keyboardOptions,
            maxLines = maxLines,
            minLines = minLines,
            cursorBrush = SolidColor(colors.textBrand),
            visualTransformation = visualTransformation,
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = backgroundColor ?: colors.inputBg,
                    shape = RoundedCornerShape(WfmRadius.L)
                )
                .border(
                    width = 1.dp,
                    color = borderColor,
                    shape = RoundedCornerShape(WfmRadius.L)
                )
                .then(
                    if (maxLines > 1) {
                        Modifier.heightIn(min = 88.dp)
                    } else {
                        Modifier
                    }
                )
                .padding(WfmSpacing.M),
            decorationBox = { innerTextField ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(WfmSpacing.S),
                    verticalAlignment = Alignment.Top
                ) {
                    // Leading icon
                    if (leadingIcon != null) {
                        Box(modifier = Modifier.padding(top = 2.dp)) {
                            leadingIcon()
                        }
                    }

                    // Text field с placeholder
                    Box(
                        modifier = Modifier.weight(1f),
                        contentAlignment = when (textAlign) {
                            TextAlign.Center -> Alignment.Center
                            TextAlign.End, TextAlign.Right -> Alignment.CenterEnd
                            else -> Alignment.TopStart
                        }
                    ) {
                        if (value.text.isEmpty() && placeholder.isNotEmpty()) {
                            Text(
                                text = placeholder,
                                style = WfmTypography.Body14Regular,
                                color = colors.textPlaceholder,
                                textAlign = textAlign,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        innerTextField()
                    }

                    // Trailing icon
                    if (trailingIcon != null) {
                        Box(modifier = Modifier.padding(top = 2.dp)) {
                            trailingIcon()
                        }
                    }
                }
            }
        )

        // Caption (подсказка) или Error message
        if (isError && errorMessage != null) {
            Text(
                text = errorMessage,
                style = WfmTypography.Body12Medium,
                color = colors.textError
            )
        } else if (caption != null) {
            Text(
                text = caption,
                style = WfmTypography.Body14Regular,
                color = colors.textSecondary
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEWS
// ═══════════════════════════════════════════════════════════════════

@Preview(name = "Phone TextField - Empty", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmPhoneTextFieldEmptyPreview() {
    WfmTheme {
        WfmPhoneTextField(
            value = TextFieldValue(""),
            onValueChange = {},
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )
    }
}

@Preview(name = "Phone TextField - Filled", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmPhoneTextFieldFilledPreview() {
    WfmTheme {
        WfmPhoneTextField(
            value = TextFieldValue("9996678899"),
            onValueChange = {},
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )
    }
}

@Preview(name = "TextField - Default", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmTextFieldDefaultPreview() {
    WfmTheme {
        WfmTextField(
            value = TextFieldValue(""),
            onValueChange = {},
            label = "Дата рождения",
            placeholder = "Номер телефона",
            caption = "Подсказка",
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )
    }
}

@Preview(name = "TextField - Filled", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmTextFieldFilledPreview() {
    WfmTheme {
        WfmTextField(
            value = TextFieldValue("Номер телефона"),
            onValueChange = {},
            label = "Дата рождения",
            placeholder = "Номер телефона",
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )
    }
}

@Preview(name = "TextField - Error", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmTextFieldErrorPreview() {
    WfmTheme {
        WfmTextField(
            value = TextFieldValue("Номер телефона"),
            onValueChange = {},
            label = "Дата рождения",
            placeholder = "Номер телефона",
            errorMessage = "Ошибка",
            isError = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )
    }
}

@Preview(name = "TextField - Disabled", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmTextFieldDisabledPreview() {
    WfmTheme {
        WfmTextField(
            value = TextFieldValue("999 888 23 11"),
            onValueChange = {},
            label = "Дата рождения",
            placeholder = "999 888 23 11",
            caption = "Подсказка",
            enabled = false,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )
    }
}

@Preview(name = "TextField - Multiline", showBackground = true, backgroundColor = 0xFFF5F5FC)
@Composable
private fun WfmTextFieldMultilinePreview() {
    WfmTheme {
        WfmTextField(
            value = TextFieldValue(""),
            onValueChange = {},
            label = "Дата рождения",
            placeholder = "Номер телефона",
            caption = "Подсказка",
            maxLines = 4,
            minLines = 4,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        )
    }
}
