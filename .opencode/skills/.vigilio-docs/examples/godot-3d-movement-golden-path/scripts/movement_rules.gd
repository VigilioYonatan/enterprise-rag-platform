class_name MovementRules3D
extends RefCounted

static func can_jump(on_ground: bool, action_pressed: bool) -> bool:
    return on_ground and action_pressed

static func planar_input(raw_input: Vector2) -> Vector3:
    var input_dir := raw_input.limit_length(1.0)
    return Vector3(input_dir.x, 0.0, input_dir.y)
