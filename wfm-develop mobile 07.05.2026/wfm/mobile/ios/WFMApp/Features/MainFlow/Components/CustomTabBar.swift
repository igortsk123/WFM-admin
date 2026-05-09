import SwiftUI
import WFMUI

/// Кастомный TabBar с поддержкой Dynamic Type
struct CustomTabBar: View {
    @Environment(\.wfmColors) var colors
    @Binding var selectedTab: MainTab
    let tabs: [MainTab]

    var body: some View {
        VStack(spacing: 0) {
            // Линия-разделитель
            Rectangle()
                .fill(colors.tabbarBorder)
                .frame(height: 1)

            HStack(spacing: 0) {
                ForEach(tabs, id: \.rawValue) { tab in
                    Button {
                        selectedTab = tab
                    } label: {
                        VStack(spacing: 4) {
                            Image(tab.icon)
                                .resizable()
                                .renderingMode(.template)
                                .frame(width: 24, height: 24)
                                .foregroundColor(selectedTab == tab ? colors.tabbarTabActive : colors.tabbarTabDefault)

                            Text(tab.title)
                                .font(WFMTypography.headline10Medium)
                                .foregroundColor(selectedTab == tab ? colors.tabbarTabActive : colors.tabbarTabDefault)
                        }
                        .frame(maxWidth: .infinity)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 8)
            .background(colors.tabbarBg)
        }
        .padding(.bottom, 20) // Автоматический padding для safe area
        .background(
            // Фон под safe area
            Rectangle()
                .fill(colors.tabbarBg)
                .ignoresSafeArea(.container, edges: .bottom)
        )

    }
}

#Preview {
    VStack {
        Spacer()
        CustomTabBar(selectedTab: .constant(.tasks), tabs: MainTab.workerTabs)
    }
    .wfmTheme()
}
