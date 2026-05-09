import SwiftUI
import WFMUI

/// BottomSheet с QR-кодом для скачивания приложения
struct ShareAppBottomSheet: View {
    @Environment(\.wfmColors) private var colors

    let url: String

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 20) {
                // Заголовок
                Text("Поделиться приложением")
                    .font(WFMTypography.headline20Bold)
                    .foregroundColor(colors.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .center)

                // QR-код
                if let qrImage = generateQRCode(from: url) {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 200, height: 200)
                        .background(Color.white)
                        .cornerRadius(12)
                        .padding(.vertical, 8)
                } else {
                    Text("Не удалось создать QR-код")
                        .wfmBody14Regular()
                        .foregroundColor(colors.textSecondary)
                        .frame(height: 200)
                }

                // Описание
                Text("Отсканируйте QR-код, чтобы скачать приложение")
                    .wfmBody14Regular()
                    .foregroundColor(colors.textSecondary)
                    .multilineTextAlignment(.center)

                // Ссылка
                Text(url)
                    .wfmBody14Regular()
                    .foregroundColor(colors.textTertiary)
                    .multilineTextAlignment(.center)
            }
            .padding(WFMSpacing.l)
        }
    }

    /// Генерация QR-кода из строки
    private func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: .utf8)

        guard let filter = CIFilter(name: "CIQRCodeGenerator") else {
            return nil
        }

        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("H", forKey: "inputCorrectionLevel") // Высокая коррекция ошибок

        guard let ciImage = filter.outputImage else {
            return nil
        }

        // Масштабирование для лучшего качества
        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaledImage = ciImage.transformed(by: transform)

        let context = CIContext()
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else {
            return nil
        }

        return UIImage(cgImage: cgImage)
    }
}

// MARK: - Глобальный метод показа через BottomSheetManager

extension ShareAppBottomSheet {
    /// Показать BottomSheet с QR-кодом
    static func show(bottomSheetManager: BottomSheetManager, url: String = "https://wfm.beyondviolet.com/download") {
        bottomSheetManager.show(showOverlay: true) {
            ShareAppBottomSheet(url: url)
        }
    }
}

// MARK: - Preview

#Preview {
    ShareAppBottomSheet(url: "https://wfm.beyondviolet.com/download")
        .wfmTheme()
}
