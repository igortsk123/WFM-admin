import Foundation

struct Hint: Identifiable, Codable, Hashable {
    let id: Int
    let text: String
    let workTypeId: Int?
    let zoneId: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case text
        case workTypeId = "work_type_id"
        case zoneId = "zone_id"
    }
}

/// Обёртка ответа GET /tasks/hints → { "hints": [...] }
struct HintsResponse: Codable {
    let hints: [Hint]
}

