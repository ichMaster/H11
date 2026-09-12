extends StaticBody3D
## Collision body shared by all exit panels ("X" cells). Using it ends the level.


func interact(_player: Node3D) -> void:
	if Game.finished:
		return
	if Game.kills < Game.enemies_total:
		Game.say("DECK CLEARED - %d/%d MUTANTS" % [Game.kills, Game.enemies_total])
	Game.finish_level()
