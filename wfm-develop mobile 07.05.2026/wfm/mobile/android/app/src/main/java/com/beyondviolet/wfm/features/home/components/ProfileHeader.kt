package com.beyondviolet.wfm.features.home.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.ui.res.painterResource
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.beyondviolet.wfm.ui.theme.WFMAppTheme
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.*

/**
 * Компонент заголовка с профилем пользователя
 *
 * Использование:
 * ```kotlin
 * ProfileHeader(
 *     greetingName = "Иван",
 *     formattedDate = "20 января, Понедельник",
 *     photoUrl = "https://example.com/avatar.jpg"
 * )
 * ```
 */
@Composable
fun ProfileHeader(
    greetingName: String,
    formattedDate: String,
    photoUrl: String?,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    val typography = WfmTheme.typography
    val spacing = WfmTheme.spacing

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surfaceBase)
                .padding(horizontal = spacing.L, vertical = spacing.S),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(spacing.S)
        ) {
            // Аватар
            if (photoUrl != null) {
                AsyncImage(
                    model = photoUrl,
                    contentDescription = "Аватар пользователя",
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            } else {
                // Заглушка аватара
                Surface(
                    modifier = Modifier.size(40.dp),
                    shape = CircleShape,
                    color = colors.iconImgEmptyState
                ) {
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
            }

            // Текст приветствия
            Column(
                verticalArrangement = Arrangement.spacedBy(0.dp)
            ) {
                Text(
                    text = "Привет, $greetingName",
                    style = typography.Headline16Bold,
                    color = colors.textPrimary,
                    maxLines = 1
                )

                Text(
                    text = formattedDate,
                    style = typography.Body14Regular,
                    color = colors.textSecondary,
                    maxLines = 1
                )
            }
        }
        HorizontalDivider(
            thickness = 1.dp,
            color = colors.borderSecondary
        )
    }
}

@Preview(name = "Profile Header", showBackground = true)
@Composable
private fun ProfileHeaderPreview() {
    WFMAppTheme {
        ProfileHeader(
            greetingName = "Иван",
            formattedDate = "20 января, Понедельник",
            photoUrl = null
        )
    }
}
