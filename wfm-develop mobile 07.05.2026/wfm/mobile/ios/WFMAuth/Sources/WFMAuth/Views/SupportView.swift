import SwiftUI
import WFMUI
#if canImport(UIKit)
import UIKit
#endif

/// Экран поддержки
/// Дизайн из Figma: node-id=4711-22621
public struct SupportView: View {
    @Environment(\.wfmColors) private var colors
    @Environment(\.dismiss) private var dismiss

    @StateObject private var toastManager = ToastManager()
    @State private var expandedIndex: Int? = nil

    private let faqItems: [(title: String, image: Image)] = [
        ("Вход по номеру телефона", WFMAuthAssets.phoneResolve),
        ("Вход через MAX", WFMAuthAssets.maxResolve),
        ("Вход через Telegram", WFMAuthAssets.tgResolve)
    ]

    public init() {}

    public var body: some View {
        ZStack {
            colors.surfaceBase.ignoresSafeArea()

            VStack(spacing: 0) {
                navBar

                GeometryReader { geo in
                    ScrollView {
                        VStack(spacing: 0) {
                            Text("Проблемы с авторизацией")
                                .font(WFMTypography.body16Regular)
                                .foregroundColor(colors.textTertiary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, WFMSpacing.l)
                                .padding(.top, WFMSpacing.s)
                                .padding(.bottom, WFMSpacing.xs)

                            VStack(spacing: WFMSpacing.xxs) {
                                ForEach(Array(faqItems.enumerated()), id: \.offset) { index, item in
                                    SupportFaqCard(
                                        title: item.title,
                                        image: item.image,
                                        isExpanded: expandedIndex == index
                                    ) {
                                        withAnimation(.easeInOut(duration: 0.25)) {
                                            expandedIndex = expandedIndex == index ? nil : index
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, WFMSpacing.l)

                            Spacer(minLength: 0)

                            contactSection(toastManager: toastManager)
                        }
                        .frame(maxWidth: .infinity, minHeight: geo.size.height)
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .wfmToast(manager: toastManager)
    }

    // MARK: - Nav Bar

    private var navBar: some View {
        HStack(spacing: 0) {
            Button { dismiss() } label: {
                WFMIcons.arrowLeft
                    .frame(width: 24, height: 24)
                    .foregroundColor(colors.barsTextPrimary)
            }
            .padding(WFMSpacing.s)

            Text("Поддержка")
                .font(WFMTypography.headline16Bold)
                .kerning(WFMTypography.LetterSpacing.headline16Bold)
                .foregroundColor(colors.barsTextPrimary)

            Spacer()
        }
        .frame(height: 48)
        .padding(.horizontal, WFMSpacing.xs)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(colors.barsBorder)
                .frame(height: 1)
        }
    }

    // MARK: - Contact Section

    @ViewBuilder
    private func contactSection(toastManager: ToastManager) -> some View {
        VStack(spacing: WFMSpacing.l) {
            VStack(spacing: 0) {
                Text("Возникли вопросы? ")
                    .font(WFMTypography.headline14Bold)
                    .foregroundColor(colors.textPrimary)
                Text("Свяжитесь со службой поддержки ")
                    .font(WFMTypography.headline14Bold)
                    .foregroundColor(colors.textPrimary)
            }
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.top, WFMSpacing.l)

            VStack(spacing: WFMSpacing.s) {
                HStack(spacing: WFMSpacing.s) {
                    SupportContactButton(
                        title: "MAX",
                        icon: WFMAuthAssets.icMaxSupport,
                        copyText: MaxUtils.createMaxDeepLink(botUsername: "id7017422412_1_bot"),
                        toastManager: toastManager
                    ) {
                        MessengerUtils.openUrl(MaxUtils.createMaxDeepLink(botUsername: "id7017422412_1_bot"))
                    }
                    SupportContactButton(
                        title: "Telegram",
                        icon: WFMAuthAssets.icTgSupport,
                        copyText: TelegramUtils.createTelegramDeepLink(botUsername: "Test_hv_bot"),
                        toastManager: toastManager
                    ) {
                        MessengerUtils.openUrl(TelegramUtils.createTelegramDeepLink(botUsername: "Test_hv_bot"))
                    }
                }
                HStack(spacing: WFMSpacing.s) {
                    SupportContactButton(
                        title: "Позвонить",
                        icon: WFMAuthAssets.icPhoneSupport,
                        copyText: "+78003505628",
                        toastManager: toastManager
                    ) {
                        PhoneUtils.call("+78003505628")
                    }
                    SupportContactButton(
                        title: "Почта",
                        icon: WFMAuthAssets.icEmailSupport,
                        copyText: "support@beyondviolet.com",
                        toastManager: toastManager
                    ) {
                        EmailUtils.compose(to: "support@beyondviolet.com")
                    }
                }
            }
            .padding(.horizontal, WFMSpacing.xxxl)
            .padding(.bottom, WFMSpacing.l)
        }
    }
}

// MARK: - SupportFaqCard

private struct SupportFaqCard: View {
    @Environment(\.wfmColors) private var colors

    let title: String
    let image: Image
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Заголовок — всегда виден
            Button(action: onToggle) {
                HStack(spacing: WFMSpacing.xxs) {
                    Text(title)
                        .wfmHeadline14Medium()
                        .foregroundColor(colors.cardTextPrimary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .lineLimit(1)

                    (isExpanded ? WFMIcons.chevronUp : WFMIcons.chevronDown)
                        .resizable()
                        .renderingMode(.template)
                        .frame(width: 20, height: 20)
                        .foregroundColor(colors.cardTextPrimary)
                }
                .padding(isExpanded ? WFMSpacing.l : WFMSpacing.m)
                .frame(minHeight: 48)
            }

            // Раскрытый контент
            if isExpanded {
                Rectangle()
                    .fill(colors.cardBorderSecondary)
                    .frame(height: 1)

                image
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, WFMSpacing.l)
                    .padding(.vertical, WFMSpacing.m)
            }
        }
        .background(colors.cardSurfaceSecondary)
        .overlay(
            RoundedRectangle(cornerRadius: WFMRadius.xl)
                .stroke(colors.cardBorderSecondary, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: WFMRadius.xl))
    }
}

// MARK: - SupportContactButton

private struct SupportContactButton: View {
    @Environment(\.wfmColors) private var colors

    let title: String
    let icon: Image
    let copyText: String
    let toastManager: ToastManager
    let action: () -> Void

    var body: some View {
        HStack(spacing: WFMSpacing.xxs) {
            icon
                .resizable()
                .renderingMode(.template)
                .frame(width: 16, height: 16)
                .foregroundColor(colors.buttonSecondaryTextDefault)

            Text(title)
                .font(WFMTypography.headline12Medium)
                .foregroundColor(colors.buttonSecondaryTextDefault)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 32)
        .background(colors.buttonSecondaryBgDefault)
        .clipShape(RoundedRectangle(cornerRadius: WFMRadius.m))
        .onTapGesture { action() }
        .onLongPressGesture {
            UIPasteboard.general.string = copyText
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            toastManager.show(message: "Скопировано в буфер обмена")
        }
    }
}

#Preview {
    SupportView()
}
