#pragma once
#include <cstdint>
#include <optional>
#include <string_view>
namespace vigilio {
// Dinero en unidades menores, sin coma flotante.
std::optional<std::int64_t> parse_minor_units(std::string_view input);
}
