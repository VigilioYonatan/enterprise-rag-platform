extends CharacterBody2D

signal jumped
signal landed

@export var move_speed: float = 220.0
@export var jump_speed: float = 390.0
@export var gravity: float = 980.0

func _ready() -> void:
    jumped.connect(_on_jumped_visual)
    if not InputMap.has_action("jump"):
        InputMap.add_action("jump")
        var key := InputEventKey.new()
        key.physical_keycode = KEY_SPACE
        InputMap.action_add_event("jump", key)
    if not InputMap.has_action("move_left"):
        InputMap.add_action("move_left")
        var left := InputEventKey.new()
        left.physical_keycode = KEY_A
        InputMap.action_add_event("move_left", left)
    if not InputMap.has_action("move_right"):
        InputMap.add_action("move_right")
        var right := InputEventKey.new()
        right.physical_keycode = KEY_D
        InputMap.action_add_event("move_right", right)

func _on_jumped_visual() -> void:
    var visual: Polygon2D = $Visual
    var tween := create_tween()
    tween.tween_property(visual, "scale", Vector2(1.1, 0.9), 0.07)
    tween.tween_property(visual, "scale", Vector2.ONE, 0.13)

func _physics_process(delta: float) -> void:
    var was_in_air := not is_on_floor()
    if not is_on_floor():
        velocity.y += gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = -jump_speed
        jumped.emit()
    velocity.x = Input.get_axis("move_left", "move_right") * move_speed
    move_and_slide()
    if was_in_air and is_on_floor():
        landed.emit()
