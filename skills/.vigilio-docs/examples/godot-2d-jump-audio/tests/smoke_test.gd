extends SceneTree

# Unit rules + headless scene wiring. Does NOT certify audible sound or visual gameplay.
func _initialize() -> void:
    call_deferred("_run")

func _run() -> void:
    var checks := 0
    var rules = load("res://scripts/jump_rules.gd")
    if rules == null or not rules.can_jump(true, true):
        push_error("grounded jump should be allowed")
        quit(1)
        return
    checks += 1
    if rules.can_jump(false, true):
        push_error("air jump should be rejected")
        quit(1)
        return
    checks += 1
    if rules.initial_velocity(400.0) >= 0.0:
        push_error("jump impulse must move upwards")
        quit(1)
        return
    checks += 1
    var world_scene: PackedScene = load("res://scenes/world.tscn")
    if world_scene == null:
        push_error("world scene failed to load")
        quit(1)
        return
    var world = world_scene.instantiate()
    root.add_child(world)
    await process_frame
    var player = world.get_node_or_null("Player")
    if not (player is CharacterBody2D):
        push_error("world must contain playable CharacterBody2D")
        quit(1)
        return
    checks += 1
    var collision = player.get_node_or_null("CollisionShape2D")
    if not (collision is CollisionShape2D) or collision.shape == null:
        push_error("player collision shape missing")
        quit(1)
        return
    checks += 1
    var jump_sfx = player.get_node_or_null("PlayerAudio/JumpSfx")
    var land_sfx = player.get_node_or_null("PlayerAudio/LandSfx")
    if not (jump_sfx is AudioStreamPlayer2D) or jump_sfx.stream == null:
        push_error("jump SFX must be wired")
        quit(1)
        return
    checks += 1
    if not (land_sfx is AudioStreamPlayer2D) or land_sfx.stream == null:
        push_error("landing SFX must be wired")
        quit(1)
        return
    checks += 1
    var music = world.get_node_or_null("Music")
    if not (music is AudioStreamPlayer) or music.stream == null:
        push_error("music stream must be wired")
        quit(1)
        return
    checks += 1
    var seen := [0]
    player.jumped.connect(func(): seen[0] += 1)
    player.jumped.emit()
    if seen[0] != 1:
        push_error("jump signal not delivered exactly once")
        quit(1)
        return
    checks += 1
    world.queue_free()
    print("PASS Godot 2D scene wiring and jump rules assertions=", checks)
    quit(0)
