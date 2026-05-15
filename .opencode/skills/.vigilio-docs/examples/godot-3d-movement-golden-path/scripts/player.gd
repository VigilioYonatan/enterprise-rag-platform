extends CharacterBody3D

signal jumped
signal landed

@export var speed: float = 5.0
@export var jump_impulse: float = 5.5
@export var gravity: float = 14.0

const MovementRules = preload("res://scripts/movement_rules.gd")

func _ready() -> void:
    # This tiny demo installs default keys only if the consumer hasn't defined them.
    _ensure_key("move_left", KEY_A)
    _ensure_key("move_right", KEY_D)
    _ensure_key("move_forward", KEY_W)
    _ensure_key("move_back", KEY_S)
    _ensure_key("jump", KEY_SPACE)

func _ensure_key(action: StringName, physical_keycode: Key) -> void:
    if InputMap.has_action(action):
        return
    InputMap.add_action(action)
    var event := InputEventKey.new()
    event.physical_keycode = physical_keycode
    InputMap.action_add_event(action, event)

func _physics_process(delta: float) -> void:
    var was_in_air := not is_on_floor()
    var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var move_dir: Vector3 = MovementRules.planar_input(input_dir)
    velocity.x = move_dir.x * speed
    velocity.z = move_dir.z * speed
    if not is_on_floor():
        velocity.y -= gravity * delta
    elif MovementRules.can_jump(is_on_floor(), Input.is_action_just_pressed("jump")):
        velocity.y = jump_impulse
        jumped.emit()
    move_and_slide()
    if was_in_air and is_on_floor():
        landed.emit()
