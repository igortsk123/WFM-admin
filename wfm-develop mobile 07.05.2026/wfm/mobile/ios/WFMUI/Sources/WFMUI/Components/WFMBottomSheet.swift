import SwiftUI
import BottomSheet

// MARK: - WFMBottomSheet ViewModifier

/// ViewModifier для отображения BottomSheet с дизайном WFM
///
/// Обёртка над библиотекой [BottomSheet](https://github.com/lucaszischka/BottomSheet).
/// BottomSheet **автоматически подстраивается** под высоту контента (как на Android):
/// - Если контент компактный → показывает только контент (без пустоты)
/// - Если контент большой → добавляет скролл автоматически
/// - Максимальная высота: 88% от высоты экрана (адаптивно под устройство)
///
/// **ScrollView уже встроен!** Просто передавайте контент.
///
/// **Правильный паттерн:**
/// ```swift
/// VStack(spacing: 0) {
///     // Контент
///     VStack(alignment: .leading, spacing: 16) {
///         Text("Заголовок")
///         // ... много контента
///     }
///     .padding(.horizontal, 16)
///     .padding(.vertical, 16)
///
///     Divider()
///
///     // Кнопки внизу
///     HStack {
///         WFMSecondaryButton(...)
///         WFMPrimaryButton(...)
///     }
///     .fixedSize(horizontal: false, vertical: true)
///     .padding(16)
/// }
/// ```
public struct WFMBottomSheet<SheetContent: View>: ViewModifier {
    @Binding var isPresented: Bool
    @State private var bottomSheetPosition: BottomSheetPosition = .hidden
    @Environment(\.wfmColors) private var colors

    let showOverlay: Bool
    let sheetContent: () -> SheetContent

    // Максимальная высота BottomSheet = 85% от высоты экрана
    private let maxSheetHeight: CGFloat = UIScreen.main.bounds.height * 0.85

    public init(
        isPresented: Binding<Bool>,
        showOverlay: Bool = false,
        @ViewBuilder content: @escaping () -> SheetContent
    ) {
        _isPresented = isPresented
        self.showOverlay = showOverlay
        self.sheetContent = content
    }

    public func body(content: Content) -> some View {
        content
            .overlay {
                if showOverlay {
                    colors.surfaceOverlayModal
                        .ignoresSafeArea()
                        .opacity(bottomSheetPosition != .hidden ? 1 : 0)
                        .animation(.easeInOut(duration: 0.25), value: bottomSheetPosition != .hidden)
                        .allowsHitTesting(false)
                }
            }
            .bottomSheet(
                bottomSheetPosition: $bottomSheetPosition,
                switchablePositions: [.dynamic, .hidden],
                headerContent: { EmptyView() }
            ) {
                ScrollView {
                    sheetContent()
                        .padding(.bottom, 20)
                }
                .scrollBounceBehavior(.basedOnSize)
                .frame(maxHeight: maxSheetHeight)
                .fixedSize(horizontal: false, vertical: true)
            }
            .customBackground(
                Color(colors.surfaceSecondary)
                    .clipShape(UnevenRoundedRectangle(
                        topLeadingRadius: WFMRadius.xl,
                        topTrailingRadius: WFMRadius.xl
                    ))
            )
            .showDragIndicator(true)
            .dragIndicatorColor(Color.gray.opacity(0.5))
            .enableSwipeToDismiss()
            .enableTapToDismiss()
            .enableBackgroundBlur(false)
            .ignoresSafeArea(.container, edges: .bottom) // Игнорируем safe area снизу (TabBar)
            .zIndex(100) // BottomSheet выше TabBar (который на zIndex 1)
            .onChange(of: isPresented) { _, newValue in
                // Синхронизация isPresented с bottomSheetPosition
                bottomSheetPosition = newValue ? .dynamic : .hidden
            }
            .onChange(of: bottomSheetPosition) { _, newValue in
                // Синхронизация bottomSheetPosition с isPresented
                isPresented = (newValue != .hidden)
            }
    }
}

// MARK: - View Extension

public extension View {
    /// Показывает BottomSheet с дизайном WFM
    ///
    /// BottomSheet автоматически подстраивается под размер контента (как на Android).
    ///
    /// - Parameters:
    ///   - isPresented: Binding для управления отображением
    ///   - showOverlay: Затемнять ли фон (blur effect). По умолчанию false
    ///   - content: Контент BottomSheet
    ///
    /// Примеры:
    /// ```swift
    /// // Без затемнения фона
    /// .wfmBottomSheet(isPresented: $show) {
    ///     VStack {
    ///         Text("Контент")
    ///     }
    /// }
    ///
    /// // С затемнением для модальных действий
    /// .wfmBottomSheet(isPresented: $show, showOverlay: true) {
    ///     VStack {
    ///         Text("Модальное действие")
    ///     }
    /// }
    /// ```
    func wfmBottomSheet<Content: View>(
        isPresented: Binding<Bool>,
        showOverlay: Bool = false,
        @ViewBuilder content: @escaping () -> Content
    ) -> some View {
        modifier(WFMBottomSheet(
            isPresented: isPresented,
            showOverlay: showOverlay,
            content: content
        ))
    }
}

// MARK: - Preview Wrappers

private struct SimpleBottomSheetPreview: View {
    @State private var showSheet = false
    @Environment(\.wfmColors) private var colors

    var body: some View {
        VStack {
            Button("Показать BottomSheet") {
                showSheet = true
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(colors.surfaceSecondary)
        .wfmBottomSheet(isPresented: $showSheet) {
            VStack(spacing: WFMSpacing.l) {
                Text("Заголовок BottomSheet")
                    .font(WFMTypography.headline20Bold)
                    .foregroundColor(colors.textPrimary)

                Text("Описание контента")
                    .font(WFMTypography.body14Regular)
                    .foregroundColor(colors.textSecondary)

                Button("Закрыть") {
                    showSheet = false
                }
            }
            .padding(WFMSpacing.l)
        }
    }
}

private struct ScrollableBottomSheetPreview: View {
    @State private var showSheet = false
    @Environment(\.wfmColors) private var colors

    var body: some View {
        VStack {
            Button("Показать длинный список") {
                showSheet = true
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(colors.surfaceSecondary)
        .wfmBottomSheet(isPresented: $showSheet) {
            ScrollView {
                VStack(spacing: WFMSpacing.s) {
                    Text("Длинный список")
                        .font(WFMTypography.headline20Bold)
                        .foregroundColor(colors.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    ForEach(1...30, id: \.self) { item in
                        HStack {
                            Text("Item \(item)")
                                .font(WFMTypography.body14Regular)
                                .foregroundColor(colors.textPrimary)
                            Spacer()
                        }
                        .padding(WFMSpacing.s)
                        .background(colors.surfaceSecondary)
                        .cornerRadius(WFMRadius.s)
                    }
                }
                .padding(WFMSpacing.l)
            }
        }
    }
}

private struct ButtonsBottomSheetPreview: View {
    @State private var showSheet = false
    @Environment(\.wfmColors) private var colors

    var body: some View {
        VStack {
            Button("Показать с кнопками") {
                showSheet = true
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(colors.surfaceSecondary)
        .wfmBottomSheet(isPresented: $showSheet, showOverlay: true) {
            VStack(spacing: WFMSpacing.xxl) {
                Text("Подтвердите действие")
                    .font(WFMTypography.headline20Bold)
                    .foregroundColor(colors.textPrimary)
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)

                HStack(spacing: WFMSpacing.s) {
                    Button {
                        showSheet = false
                    } label: {
                        Text("Отмена")
                            .font(WFMTypography.headline16Bold)
                            .foregroundColor(colors.buttonSecondaryTextDefault)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(colors.buttonSecondaryBgDefault)
                            .cornerRadius(WFMRadius.l)
                    }

                    Button {
                        showSheet = false
                    } label: {
                        Text("Подтвердить")
                            .font(WFMTypography.headline16Bold)
                            .foregroundColor(colors.buttonPrimaryTextDefault)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(colors.buttonPrimaryBgDefault)
                            .cornerRadius(WFMRadius.l)
                    }
                }
            }
            .padding(WFMSpacing.l)
        }
    }
}

// MARK: - Previews

#Preview("Простой BottomSheet") {
    SimpleBottomSheetPreview()
        .wfmTheme()
}

#Preview("BottomSheet со скроллом") {
    ScrollableBottomSheetPreview()
        .wfmTheme()
}

#Preview("BottomSheet с кнопками") {
    ButtonsBottomSheetPreview()
        .wfmTheme()
}
