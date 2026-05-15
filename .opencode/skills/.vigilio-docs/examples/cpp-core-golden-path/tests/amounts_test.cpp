#include "vigilio/amounts.hpp"
#include <cassert>
#include <cstdint>
#include <limits>
int main() {
    assert(vigilio::parse_minor_units("120") == 120);
    assert(vigilio::parse_minor_units("-25") == -25);
    assert(!vigilio::parse_minor_units("12.50").has_value());
    assert(!vigilio::parse_minor_units("999999999999999999999").has_value());
    assert(!vigilio::parse_minor_units("").has_value());
    return 0;
}
