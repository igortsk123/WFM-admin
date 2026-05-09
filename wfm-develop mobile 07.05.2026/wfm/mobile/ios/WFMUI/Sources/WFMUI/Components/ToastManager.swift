import SwiftUI
import Combine

// MARK: - ToastManager

/// Менеджер тостов — управляет показом/скрытием всплывающих уведомлений
///
/// Инициализируется в DependencyContainer и передаётся через @EnvironmentObject.
///
/// Использование:
/// ```swift
/// // Показать простой тост
/// toastManager.show(message: "Смена открыта")
///
/// // Показать тост с ошибкой
/// toastManager.show(message: "Нет сети", state: .error)
///
/// // Показать тост с кнопкой
/// toastManager.show(
///     message: "Задача назначена",
///     type: .textWithButton(buttonTitle: "Перейти", action: { navigate() })
/// )
/// ```
@MainActor
public final class ToastManager: ObservableObject {
    @Published public private(set) var current: WFMToastData?
    @Published public private(set) var isVisible: Bool = false

    private var hideTask: Task<Void, Never>?

    nonisolated public init() {}

    /// Показать тост. Если уже есть активный — заменяет его.
    public func show(
        message: String,
        type: WFMToastType = .text,
        state: WFMToastState = .default
    ) {
        hideTask?.cancel()

        let data = WFMToastData(message: message, type: type, state: state)

        if isVisible {
            // Сбрасываем текущий, показываем новый с небольшой задержкой
            withAnimation(.easeOut(duration: 0.15)) {
                isVisible = false
            }
            hideTask = Task {
                try? await Task.sleep(nanoseconds: 200_000_000) // 0.2s
                guard !Task.isCancelled else { return }
                self.current = data
                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                    self.isVisible = true
                }
                self.scheduleHide()
            }
        } else {
            current = data
            withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                isVisible = true
            }
            scheduleHide()
        }
    }

    /// Скрыть тост вручную
    public func hide() {
        hideTask?.cancel()
        withAnimation(.easeOut(duration: 0.25)) {
            isVisible = false
        }
    }

    private func scheduleHide() {
        hideTask = Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000) // 3s
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.25)) {
                self.isVisible = false
            }
        }
    }
}

// MARK: - View Modifier

private struct WFMToastModifier: ViewModifier {
    @ObservedObject var manager: ToastManager

    func body(content: Content) -> some View {
        content.overlay(alignment: .bottom) {
            if manager.isVisible, let data = manager.current {
                WFMToast(data: data)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8 + 49) // 49pt = стандартная высота таб-бара iOS
                    .transition(.asymmetric(
                        insertion: .move(edge: .bottom).combined(with: .opacity),
                        removal: .move(edge: .bottom).combined(with: .opacity)
                    ))
            }
        }
    }
}

public extension View {
    /// Добавляет поддержку WFM тостов к View
    ///
    /// Размещай этот модификатор на корневом View (ContentView или MainFlowView),
    /// чтобы тосты отображались поверх всего контента.
    func wfmToast(manager: ToastManager) -> some View {
        modifier(WFMToastModifier(manager: manager))
    }
}
