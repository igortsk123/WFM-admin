import SwiftUI
import WFMUI

/// Splash Screen экран
///
/// Показывается при запуске приложения с фиолетовым фоном,
/// белым логотипом по центру и прогресс-баром внизу.
///
/// Дизайн из Figma: node-id=2868-8658
struct SplashView: View {
    @State private var progress: CGFloat = 0.0

    let onSplashFinished: () -> Void

    var body: some View {
        ZStack {
            // Фиолетовый фон (Brand500 #6738DD)
            WFMPrimitiveColors.brand500
                .ignoresSafeArea()

            VStack {
                Spacer()

                // Логотип по центру (брендовый)
                #if SMART_BRAND
                Image("app-logo-splash-smart")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 150, height: 150)
                #else
                Image("app-logo-splash")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 150, height: 150)
                #endif

                Spacer()
            }
        }
        .onAppear {
            // Анимация прогресс-бара
            withAnimation(.easeInOut(duration: 2.0)) {
                progress = 1.0
            }

            // Автоматически завершаем splash через 2 секунды
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                onSplashFinished()
            }
        }
    }
}

#Preview {
    SplashView(onSplashFinished: {
        print("Splash finished")
    })
    .wfmTheme()
}
