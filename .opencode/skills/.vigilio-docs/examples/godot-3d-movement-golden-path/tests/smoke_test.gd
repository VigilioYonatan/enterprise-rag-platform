extends SceneTree

# Unit movement rules + loaded 3D scene topology (not a GPU/gamepad E2E).
func _initialize() -> void:
    call_deferred("_run")

func _run() -> void:
    var checks: int = 0
    var rules = load("res://scripts/movement_rules.gd")
    if rules == null or not rules.can_jump(true, true):
        push_error("grounded jump must be allowed")
        quit(1)
        return
    checks += 1
    if rules.can_jump(false, true):
        push_error("air jump should be rejected")
        quit(1)
        return
    checks += 1
    var planar: Vector3 = rules.planar_input(Vector2(2.0, -2.0))
    if planar.length() > 1.00001 or absf(planar.y) > 0.00001:
        push_error("planar velocity not normalized")
        quit(1)
        return
    checks += 1
    var world_scene: PackedScene = load("res://scenes/world.tscn")
    if world_scene == null:
        push_error("3D scene failed to load")
        quit(1)
        return
    var world = world_scene.instantiate()
    root.add_child(world)
    await process_frame
    var player = world.get_node_or_null("Player")
    if not (player is CharacterBody3D):
        push_error("3D player must be CharacterBody3D")
        quit(1)
        return
    checks += 1
    var shape = player.get_node_or_null("PlayerCollision")
    if not (shape is CollisionShape3D) or shape.shape == null:
        push_error("3D player collision missing")
        quit(1)
        return
    checks += 1
    var floor = world.get_node_or_null("Ground/GroundCollision")
    if not (floor is CollisionShape3D) or floor.shape == null:
        push_error("3D ground collision missing")
        quit(1)
        return
    checks += 1
    var camera = player.get_node_or_null("FollowCamera")
    if not (camera is Camera3D) or not camera.current:
        push_error("follow camera not active")
        quit(1)
        return
    checks += 1
    world.queue_free()
    print("PASS Godot 3D scene wiring and movement assertions=", checks)
    quit(0)
