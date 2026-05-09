import SwiftUI

/// Менеджер для управления BottomSheet на уровне приложения
///
/// Использование:
/// ```swift
/// @EnvironmentObject private var bottomSheetManager: BottomSheetManager
///
/// bottomSheetManager.show {
///     VStack {
///         Text("Контент BottomSheet")
///         Button("Закрыть") {
///             bottomSheetManager.dismiss()
///         }
///     }
/// }
/// ```
@MainActor
class BottomSheetManager: ObservableObject {
    @Published var isPresented: Bool = false
    @Published var showOverlay: Bool = true
    @Published private(set) var content: AnyView?

    private var cleanupTask: _Concurrency.Task<Void, Never>?

    /// Показать BottomSheet с контентом
    func show<Content: View>(
        showOverlay: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        // Отменяем отложенную очистку контента (для перехода BS1 → BS2)
        cleanupTask?.cancel()
        cleanupTask = nil
        self.showOverlay = showOverlay
        self.content = AnyView(content())
        self.isPresented = true
    }

    /// Закрыть BottomSheet
    func dismiss() {
        isPresented = false
        // Задержка перед очисткой контента для плавной анимации закрытия.
        // do/catch нужен чтобы отмена через cancel() прерывала выполнение —
        // try? игнорирует ошибку и content = nil всё равно сработает.
        cleanupTask = _Concurrency.Task { [weak self] in
            do {
                try await _Concurrency.Task.sleep(nanoseconds: 300_000_000) // 0.3 секунды
                self?.content = nil
                self?.cleanupTask = nil
            } catch {
                // Задача отменена через show() при переходе BS1 → BS2 — контент не трогаем
            }
        }
    }
}
