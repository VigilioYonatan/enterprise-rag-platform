extends Node2D

@onready var jump_player: AudioStreamPlayer2D = $JumpSfx
@onready var land_player: AudioStreamPlayer2D = $LandSfx

func _ready() -> void:
    get_parent().jumped.connect(on_jumped)
    get_parent().landed.connect(on_landed)

func on_jumped() -> void:
    if jump_player.stream != null:
        jump_player.pitch_scale = randf_range(0.97, 1.03)
        jump_player.play()

func on_landed() -> void:
    if land_player.stream != null:
        land_player.play()
