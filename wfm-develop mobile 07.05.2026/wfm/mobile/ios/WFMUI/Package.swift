// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "WFMUI",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "WFMUI",
            targets: ["WFMUI"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/lucaszischka/BottomSheet", from: "3.1.1")
    ],
    targets: [
        .target(
            name: "WFMUI",
            dependencies: [
                .product(name: "BottomSheet", package: "BottomSheet")
            ],
            path: "Sources/WFMUI",
            resources: [
                .process("Resources")
            ]
        )
    ]
)
