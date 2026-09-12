// Same as depth_shade.gdshader, but sampled with mipmaps. Used ONLY for the
// floor and ceiling: they are level-wide planes tiled 32x22, so at 640x480 one
// screen pixel covers many texels at distance and an unfiltered nearest sample
// shimmers while walking. Walls and sprites keep the crisp unmipmapped shader.
// Works on the GL Compatibility renderer regardless of Environment fog support.
shader_type spatial;
render_mode unshaded, cull_back, depth_draw_opaque, fog_disabled;

uniform sampler2D albedo_tex : source_color, filter_nearest_mipmap, repeat_enable;
uniform vec4 tint : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform vec2 uv_scale = vec2(1.0, 1.0);
// 0.06 = you can see far down the corridor, 0.16 = only a few cells.
uniform float fog_density = 0.025;
uniform vec3 fog_color : source_color = vec3(0.0, 0.0, 0.0);

varying float depth_fade;

void vertex() {
	vec4 view_pos = MODELVIEW_MATRIX * vec4(VERTEX, 1.0);
	depth_fade = exp(-length(view_pos.xyz) * fog_density);
}

void fragment() {
	vec4 tex = texture(albedo_tex, UV * uv_scale);
	// COLOR carries the per-face shade (north/south walls darker) from the level builder.
	ALBEDO = mix(fog_color, tex.rgb * COLOR.rgb * tint.rgb, depth_fade);
}
