#include "vigilio/amounts.hpp"
#include <charconv>
#include <system_error>
namespace vigilio {
std::optional<std::int64_t> parse_minor_units(std::string_view input) {
    if (input.empty()) return std::nullopt;
    std::int64_t amount = 0;
    auto [end, error] = std::from_chars(input.data(), input.data() + input.size(), amount);
    if (error != std::errc{} || end != input.data() + input.size()) return std::nullopt;
    return amount;
}
}
