import SwiftUI
import HCaptcha
import WFMUI

/// View для отображения hCaptcha как overlay поверх текущего экрана
public struct HCaptchaView: View {
    let onSuccess: (String) -> Void
    let onCancel: () -> Void

    @State private var isLoading = true
    @Environment(\.wfmColors) private var colors

    public init(onSuccess: @escaping (String) -> Void, onCancel: @escaping () -> Void) {
        self.onSuccess = onSuccess
        self.onCancel = onCancel
    }

    public var body: some View {
        ZStack {
            // Полупрозрачный фон (surfaceOverlayModal с альфа-каналом для затемнения)
            colors.surfaceOverlayModal
                .ignoresSafeArea()
                .onTapGesture {
                    // Закрыть при нажатии на фон
                    onCancel()
                }

            // Карточка с капчей
            VStack(spacing: 0) {
                // Заголовок с кнопкой закрытия
                HStack {
                    Text("Подтвердите, что вы не робот")
                        .font(.headline)
                        .foregroundColor(colors.textPrimary)
                    Spacer()
                    Button(action: onCancel) {
                        WFMIcons.closeIcon
                            .font(.title2)
                            .foregroundColor(colors.iconSecondary)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(colors.surfaceSecondary)

                // WebView с капчей + loader
                ZStack {
                    HCaptchaWebViewWrapper(onSuccess: onSuccess, onError: { error in
                        print("❌ HCaptcha error: \(error)")
                    })

                    // Loader поверх WebView пока грузится
                    if isLoading {
                        VStack(spacing: 12) {
                            ProgressView()
                                .scaleEffect(1.2)
                                .tint(colors.iconBrand)
                            Text("Загрузка...")
                                .font(.subheadline)
                                .foregroundColor(colors.textSecondary)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(colors.surfaceSecondary)
                    }
                }
                .frame(height: 500)
                .onAppear {
                    // Скрываем loader через 1.5 секунды
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        withAnimation {
                            isLoading = false
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .background(colors.surfaceSecondary)
            .cornerRadius(16)
            .shadow(radius: 20)
            .padding(.horizontal, 12)
            .padding(.vertical, 20)
        }
    }
}

/// UIViewControllerRepresentable обёртка для HCaptcha
struct HCaptchaWebViewWrapper: UIViewControllerRepresentable {
    let onSuccess: (String) -> Void
    let onError: (Error) -> Void

    func makeUIViewController(context: Context) -> HCaptchaViewController {
        print("🏗️ makeUIViewController called")
        let controller = HCaptchaViewController()
        controller.onSuccess = onSuccess
        controller.onError = onError
        return controller
    }

    func updateUIViewController(_ uiViewController: HCaptchaViewController, context: Context) {}
}

/// UIViewController для отображения hCaptcha
class HCaptchaViewController: UIViewController {
    private let siteKey = "18e5142d-9054-487b-af5d-ce24cf8a09f9"
    private var hCaptcha: HCaptcha?

    var onSuccess: ((String) -> Void)?
    var onError: ((Error) -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()

        // Прозрачный фон
        view.backgroundColor = .clear

        print("🔧 viewDidLoad: view.bounds = \(view.bounds)")
        setupHCaptcha()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        print("🔧 viewDidAppear: view.bounds = \(view.bounds)")

        // Показываем капчу сразу
        showCaptcha()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        print("🔧 viewDidLayoutSubviews: view.bounds = \(view.bounds)")
    }

    private func setupHCaptcha() {
        print("🔧 setupHCaptcha called")

        // Инициализируем с baseURL (обязательный параметр)
        do {
            hCaptcha = try HCaptcha(
                apiKey: siteKey,
                baseURL: URL(string: "https://hcaptcha.com")!
            )
            print("✅ HCaptcha initialized successfully")
        } catch {
            print("❌ HCaptcha init error: \(error)")
            onError?(error)
            return
        }

        hCaptcha?.configureWebView { webView in
            print("📐 configureWebView CALLED! webView.frame: \(webView.frame)")
            // Не устанавливаем frame здесь - установим позже
        }
    }

    private func showCaptcha() {
        print("🔧 showCaptcha called")

        guard let hCaptcha = hCaptcha else {
            print("❌ HCaptcha not initialized")
            onError?(NSError(domain: "HCaptcha", code: -1, userInfo: [NSLocalizedDescriptionKey: "HCaptcha not initialized"]))
            return
        }

        print("🤖 Calling hCaptcha.validate on view: \(view)")
        print("   view.bounds: \(view.bounds)")
        print("   view.subviews count: \(view.subviews.count)")

        hCaptcha.validate(on: view, resetOnError: false) { [weak self] result in
            print("📥 HCaptcha result received")

            if let token = try? result.dematerialize() {
                print("✅ HCaptcha token: \(token.prefix(20))...")
                self?.onSuccess?(token)
            } else {
                print("❌ HCaptcha validation failed")
                self?.onError?(NSError(domain: "HCaptcha", code: -1, userInfo: [NSLocalizedDescriptionKey: "Validation failed"]))
            }
        }

        // Проверяем через 0.1 секунды что webView добавился и исправляем frame
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            guard let self = self else { return }
            print("🔍 After 0.1 second:")
            print("   view.bounds: \(self.view.bounds)")
            print("   view.subviews count: \(self.view.subviews.count)")

            for (index, subview) in self.view.subviews.enumerated() {
                print("   subview[\(index)]: \(type(of: subview))")
                print("     current frame: \(subview.frame)")

                // Если это WKWebView - устанавливаем правильный frame
                if String(describing: type(of: subview)).contains("WKWebView") {
                    // Устанавливаем frame равный размеру родительского view
                    let newFrame = CGRect(x: 0, y: 0, width: self.view.bounds.width, height: self.view.bounds.height)
                    print("   🔧 Found WKWebView, setting frame to: \(newFrame)")
                    subview.frame = newFrame
                    subview.autoresizingMask = [.flexibleWidth, .flexibleHeight]

                    // Проверяем что frame установился
                    print("     new frame: \(subview.frame)")
                }
            }
        }
    }
}

#Preview {
    HCaptchaView(onSuccess: { token in
        print("hCaptcha token: \(token)")
    }, onCancel: {
        print("Cancelled")
    })
    .wfmTheme()
}
