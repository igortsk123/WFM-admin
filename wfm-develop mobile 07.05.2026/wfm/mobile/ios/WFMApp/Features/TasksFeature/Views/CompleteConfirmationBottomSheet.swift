import SwiftUI
import UIKit
import WFMUI

/// BottomSheet подтверждения завершения задачи (с опциональным фото)
///
/// Использование:
/// ```swift
/// @EnvironmentObject private var container: DependencyContainer
///
/// Button("Завершить") {
///     CompleteConfirmationBottomSheet.show(
///         bottomSheetManager: container.bottomSheetManager,
///         requiresPhoto: task.requiresPhoto ?? false,
///         onConfirm: { image in
///             if let image = image {
///                 await viewModel.completeTaskWithPhoto(image)
///             } else {
///                 await viewModel.completeTask()
///             }
///         },
///         onCancel: {}
///     )
/// }
/// ```
struct CompleteConfirmationBottomSheet {
    /// Показать BottomSheet подтверждения завершения задачи
    @MainActor
    static func show(
        bottomSheetManager: BottomSheetManager,
        requiresPhoto: Bool = false,
        onConfirm: @escaping (UIImage?) async -> Bool,
        onCancel: @escaping () -> Void
    ) {
        bottomSheetManager.show(showOverlay: true) {
            CompleteConfirmationBottomSheetContent(
                requiresPhoto: requiresPhoto,
                onConfirm: { image in
                    let success = await onConfirm(image)
                    // Закрываем BottomSheet всегда (и при успехе, и при ошибке)
                    // При ошибке Toast будет виден на чистом экране
                    bottomSheetManager.dismiss()
                },
                onCancel: {
                    bottomSheetManager.dismiss()
                    onCancel()
                }
            )
        }
    }
}

// MARK: - Content

private struct CompleteConfirmationBottomSheetContent: View {
    @Environment(\.wfmColors) private var colors

    let requiresPhoto: Bool
    let onConfirm: (UIImage?) async -> Void
    let onCancel: () -> Void

    @State private var selectedImage: UIImage?
    @State private var selectedImageName: String?
    @State private var showImageSourceSelection = false
    @State private var showImagePicker = false
    @State private var imageSourceType: UIImagePickerController.SourceType = .photoLibrary
    @State private var isSubmitting = false

    var body: some View {
        VStack(spacing: 0) {
            // Текст
            VStack(spacing: 8) {
                Text("Завершить задачу?")
                    .font(WFMTypography.headline20Bold)
                    .foregroundColor(colors.textPrimary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity, alignment: .center)

                if requiresPhoto {
                    Text("Для завершения необходимо добавить фотографию выполненной работы.")
                        .font(WFMTypography.body16Regular)
                        .foregroundColor(colors.textPrimary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            }
            .padding(.horizontal, WFMSpacing.xl)
            .padding(.top, WFMSpacing.xl)

            // Preview фото или кнопка добавления (только если requiresPhoto)
            if requiresPhoto {
                if let selectedImage = selectedImage {
                    PhotoPreviewCard(
                        image: selectedImage,
                        fileName: selectedImageName ?? "Фото",
                        onDelete: {
                            self.selectedImage = nil
                            self.selectedImageName = nil
                        }
                    )
                    .padding(.top, WFMSpacing.xl)
                    .padding(.horizontal, WFMSpacing.xl)
                } else {
                    VStack(spacing: 0) {
                        WFMSecondaryButton(
                            text: "Добавить фото  (.jpg, до 10 мб)",
                            icon: "ic-plus",
                            size: .big
                        ) {
                            showImageSourceSelection = true
                        }
                    }
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, WFMSpacing.xl)
                    .padding(.horizontal, WFMSpacing.xl)
                    .confirmationDialog("Выберите источник", isPresented: $showImageSourceSelection, titleVisibility: .visible) {
                        Button("Сделать фото") {
                            imageSourceType = .camera
                            showImagePicker = true
                        }
                        Button("Выбрать из галереи") {
                            imageSourceType = .photoLibrary
                            showImagePicker = true
                        }
                        Button("Отмена", role: .cancel) {}
                    }
                    .sheet(isPresented: $showImagePicker) {
                        ImagePicker(sourceType: imageSourceType) { image in
                            selectedImage = image
                            selectedImageName = "IMG_\(Int.random(in: 1000...9999)).jpg"
                        }
                        .ignoresSafeArea()
                    }
                }
            }

            // Кнопки действий
            HStack(spacing: 8) {
                WFMSecondaryButton(
                    text: "Отмена",
                    isEnabled: !isSubmitting,
                    size: .big
                ) {
                    onCancel()
                }

                WFMPrimaryButton(
                    text: "Завершить",
                    isEnabled: (!requiresPhoto || selectedImage != nil) && !isSubmitting,
                    isLoading: isSubmitting
                ) {
                    isSubmitting = true
                    _Concurrency.Task {
                        await onConfirm(selectedImage)
                        isSubmitting = false
                    }
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(.top, WFMSpacing.xl)
            .padding(.horizontal, WFMSpacing.xl)
        }
        .padding(.bottom, WFMSpacing.l)
    }
}

// MARK: - Image Picker

private struct ImagePicker: UIViewControllerRepresentable {
    let sourceType: UIImagePickerController.SourceType
    let onImagePicked: (UIImage) -> Void

    @Environment(\.presentationMode) private var presentationMode

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker

        init(_ parent: ImagePicker) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.onImagePicked(image)
            }
            parent.presentationMode.wrappedValue.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.presentationMode.wrappedValue.dismiss()
        }
    }
}

// MARK: - Photo Preview Card

private struct PhotoPreviewCard: View {
    @Environment(\.wfmColors) private var colors

    let image: UIImage
    let fileName: String
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: WFMSpacing.m) {
            // Preview изображения
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: WFMRadius.s))

            // Информация о файле
            VStack(alignment: .leading, spacing: 4) {
                Text(fileName)
                    .font(WFMTypography.headline16Bold)
                    .foregroundColor(colors.textPrimary)
                    .lineLimit(1)

                Button(action: onDelete) {
                    Text("Удалить")
                        .font(WFMTypography.headline14Medium)
                        .foregroundColor(colors.buttonSecondaryTextDefault)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(WFMSpacing.m)
        .background(colors.surfaceRaised)
        .cornerRadius(WFMSpacing.xl)
    }
}

// MARK: - Preview

private struct CompleteConfirmationBottomSheetPreview: View {
    @StateObject private var bottomSheetManager = BottomSheetManager()
    @Environment(\.wfmColors) private var colors

    var body: some View {
        VStack(spacing: 20) {
            Button("Завершить задачу (без фото)") {
                CompleteConfirmationBottomSheet.show(
                    bottomSheetManager: bottomSheetManager,
                    requiresPhoto: false,
                    onConfirm: { image in
                        print("Task completed, image: \(image != nil ? "yes" : "no")")
                        return true
                    },
                    onCancel: { print("Cancelled") }
                )
            }

            Button("Завершить задачу (с фото)") {
                CompleteConfirmationBottomSheet.show(
                    bottomSheetManager: bottomSheetManager,
                    requiresPhoto: true,
                    onConfirm: { image in
                        if let image = image {
                            print("Task completed with photo, size: \(image.size)")
                        }
                        return true
                    },
                    onCancel: { print("Cancelled") }
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(colors.surfaceBase)
        .wfmBottomSheet(
            isPresented: $bottomSheetManager.isPresented,
            showOverlay: bottomSheetManager.showOverlay
        ) {
            if let content = bottomSheetManager.content {
                content
            }
        }
    }
}

#Preview("Complete Confirmation BottomSheet") {
    CompleteConfirmationBottomSheetPreview()
        .wfmTheme()
}
