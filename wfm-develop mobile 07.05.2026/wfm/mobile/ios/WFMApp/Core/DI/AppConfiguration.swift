import Foundation

/// Application configuration
struct AppConfiguration {
    let apiBaseURL: URL
    let environment: Environment
    let semetricsApiKey: String
    let semetricsEndpoint: String

    enum Environment: String {
        case development
        case staging
        case production
    }
    //DEV#@//DEV#@ //вум№"
    static let `default`: AppConfiguration = {
        #if DEBUG
        return AppConfiguration(
            //apiBaseURL: URL(string: "https://dev.wfm.beyondviolet.com")!,
            apiBaseURL: URL(string: "https://wfm.beyondviolet.com")!,
            environment: .development,
            semetricsApiKey: "sm_live_0925497d1bf44a9c8dd6b84288772648",
            semetricsEndpoint: "https://semetrics.ru/events"
        )
        #else
        return AppConfiguration(
            apiBaseURL: URL(string: "https://wfm.beyondviolet.com")!,
            environment: .production,
            semetricsApiKey: "sm_live_0925497d1bf44a9c8dd6b84288772648",
            semetricsEndpoint: "https://semetrics.ru/events"
        )
        #endif
    }()
}
