import SwiftUI
import WFMUI

/// Экран создания новой задачи
struct CreateTaskView: View {
    @StateObject private var viewModel: CreateTaskViewModel
    @Environment(\.dismiss) private var dismiss

    init(viewModel: CreateTaskViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        VStack(spacing: 0) {
            Form {
                Section {
                    TextField("Название", text: $viewModel.title)
                        .textInputAutocapitalization(.words)

                    TextField("Описание", text: $viewModel.description, axis: .vertical)
                        .lineLimit(3...6)
                        .textInputAutocapitalization(.sentences)
                } header: {
                    Text("Информация о задаче")
                }

                Section {
                    Stepper(value: $viewModel.plannedMinutes, in: 15...480, step: 15) {
                        HStack {
                            Text("Плановое время")
                            Spacer()
                            Text("\(viewModel.plannedMinutes) мин")
                                .foregroundStyle(.secondary)
                        }
                    }
                } header: {
                    Text("Оценка времени")
                }

                Section {
                    TextField("ID исполнителя (необязательно)", text: $viewModel.assigneeIdText)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.numberPad)
                } header: {
                    Text("Назначение")
                } footer: {
                    Text("Оставьте пустым для создания неназначенной задачи")
                }
            }

            // Большая кнопка внизу
            VStack(spacing: 0) {
                Divider()

                Button {
                    _Concurrency.Task {
                        await viewModel.createTask()
                        if viewModel.createdTask != nil {
                            dismiss()
                        }
                    }
                } label: {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image("ic-plus")
                            Text("Создать задачу")
                        }
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(viewModel.isValid && !viewModel.isLoading ? Color.blue : Color.gray)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(!viewModel.isValid || viewModel.isLoading)
                .padding(.horizontal)
                .padding(.vertical, 12)
                .background(Color(uiColor: .systemGroupedBackground))
            }
        }
        .navigationTitle("Новая задача")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Ошибка", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("ОК") {
                viewModel.errorMessage = nil
            }
        } message: {
            if let error = viewModel.errorMessage {
                Text(error)
            }
        }
    }
}

#Preview {
    CreateTaskView(
        viewModel: CreateTaskViewModel(
            tasksService: TasksService(
                apiClient: APIClient(baseURL: URL(string: "http://localhost:8000")!, impersonationStorage: ImpersonationStorage())
            ),
            toastManager: ToastManager(),
            analyticsService: NoOpAnalyticsService()
        )
    )
}
