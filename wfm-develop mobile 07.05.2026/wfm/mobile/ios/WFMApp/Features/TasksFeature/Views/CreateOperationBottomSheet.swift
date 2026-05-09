import SwiftUI
import WFMUI

struct CreateOperationBottomSheet: View {
    let onConfirm: (String) -> Void

    @Environment(\.wfmColors) private var colors
    @State private var name = ""


    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Основной контент: заголовок + поле ввода, gap 12pt
            VStack(alignment: .leading, spacing: WFMSpacing.m) {
                Text("Новая подзадача")
                    .font(WFMTypography.headline18Bold)
                    .foregroundColor(colors.textPrimary)

                WFMTextField(
                    text: $name,
                    placeholder: "Введите название",
                    title: "Название подзадачи",
                    backgroundColor: colors.surfacePrimary,
                    showClearButton: true
                )
            }
            .padding(WFMSpacing.l)

            // Кнопка в отдельной области снизу
            WFMPrimaryButton(
                text: "Создать подзадачу",
                isEnabled: !name.trimmingCharacters(in: .whitespaces).isEmpty
            ) {
                let trimmed = name.trimmingCharacters(in: .whitespaces)
                guard !trimmed.isEmpty else { return }
                onConfirm(trimmed)
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(WFMSpacing.l)
        }
    }

    static func show(
        bottomSheetManager: BottomSheetManager,
        onConfirm: @escaping (String) -> Void
    ) {
        bottomSheetManager.show(showOverlay: true) {
            CreateOperationBottomSheet(onConfirm: onConfirm)
        }
    }
}
