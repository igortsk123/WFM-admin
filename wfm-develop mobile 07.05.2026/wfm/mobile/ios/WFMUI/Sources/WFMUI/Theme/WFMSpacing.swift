import SwiftUI

/// Отступы дизайн-системы WFM
/// Токены из Figma
public enum WFMSpacing {
    /// 2pt - 3xs
    public static let xxxs: CGFloat = 2

    /// 4pt - 2xs
    public static let xxs: CGFloat = 4

    /// 6pt - xs
    public static let xs: CGFloat = 6

    /// 8pt - s
    public static let s: CGFloat = 8

    /// 12pt - m
    public static let m: CGFloat = 12

    /// 16pt - l
    public static let l: CGFloat = 16

    /// 20pt - xl
    public static let xl: CGFloat = 20

    /// 24pt - 2xl
    public static let xxl: CGFloat = 24

    /// 32pt - 3xl
    public static let xxxl: CGFloat = 32
}

/// Радиусы скругления дизайн-системы WFM
/// Токены из Figma
public enum WFMRadius {
    /// 4pt - extra small
    public static let xs: CGFloat = 4

    /// 8pt - small
    public static let s: CGFloat = 8

    /// 10pt - medium
    public static let m: CGFloat = 10

    /// 12pt - large
    public static let l: CGFloat = 12

    /// 16pt - extra large
    public static let xl: CGFloat = 16
}

/// Толщина линий дизайн-системы WFM
/// Токены из Figma
public enum WFMStroke {
    /// 1pt - базовая толщина для границ и разделителей
    public static let s: CGFloat = 1

    /// 1.5pt - основная толщина для иконок
    public static let m: CGFloat = 1.5
}
