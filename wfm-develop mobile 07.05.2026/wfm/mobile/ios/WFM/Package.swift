// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "WFM",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "WFM",
            targets: ["WFM"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "WFM",
            dependencies: [],
            path: "Sources"
        ),
        .testTarget(
            name: "WFMTests",
            dependencies: ["WFM"],
            path: "Tests"
        )
    ]
)
