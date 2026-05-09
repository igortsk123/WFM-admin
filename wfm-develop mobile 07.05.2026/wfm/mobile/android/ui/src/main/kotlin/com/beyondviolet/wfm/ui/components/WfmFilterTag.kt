package com.beyondviolet.wfm.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.ui.R
import com.beyondviolet.wfm.ui.theme.WfmRadius
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography
import com.beyondviolet.wfm.ui.theme.*

/**
 * Тег фильтра с индикатором количества и крестиком для удаления
 */
@Composable
fun WfmFilterTag(
    text: String,
    count: Int? = null,
    onRemove: () -> Unit
) {
    val colors = WfmTheme.colors

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(WfmRadius.M))
            .background(colors.badgeBrandBgLight)
            .padding(horizontal = WfmSpacing.M, vertical = WfmSpacing.XS),
        horizontalArrangement = Arrangement.spacedBy(WfmSpacing.XXS),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = text,
            style = WfmTypography.Body14Regular,
            color = colors.badgeBrandTextBright
        )

        if (count != null) {
            // Индикатор с количеством
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(RoundedCornerShape(WfmRadius.XS))
                    .background(colors.indicatorsBgFilled),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = count.toString(),
                    style = WfmTypography.Headline10Medium,
                    color = colors.indicatorsIcon
                )
            }
        }

        // Кнопка удаления
        Icon(
            painter = painterResource(id = R.drawable.ic_close),
            contentDescription = "Удалить",
            modifier = Modifier
                .size(20.dp)
                .clickable(onClick = onRemove),
            tint = colors.badgeBrandTextBright
        )
    }
}
