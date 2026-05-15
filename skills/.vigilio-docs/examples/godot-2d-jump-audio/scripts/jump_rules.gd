class_name JumpRules
extends RefCounted

static func can_jump(is_grounded: bool, just_pressed: bool) -> bool:
    return is_grounded and just_pressed

static func initial_velocity(jump_speed: float) -> float:
    return -absf(jump_speed)
