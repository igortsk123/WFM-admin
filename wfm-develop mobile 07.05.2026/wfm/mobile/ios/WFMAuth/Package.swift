// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "WFMAuth",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "WFMAuth",
            targets: ["WFMAuth"]
        ),
    ],
    dependencies: [
        // HCaptcha для защиты от ботов
        .package(url: "https://github.com/hCaptcha/HCaptcha-ios-sdk", from: "2.0.0"),
        // WFMUI дизайн-система
        .package(path: "../WFMUI")
    ],
    targets: [
        .target(
            name: "WFMAuth",
            dependencies: [
                .product(name: "HCaptcha", package: "HCaptcha-ios-sdk"),
                "WFMUI"
            ],
            path: "Sources/WFMAuth",
            resources: [
                .process("Resources/Assets.xcassets")
            ]
        )
    ]
)
