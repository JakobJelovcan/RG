const baseVertex = `#version 300 es

layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec3 aNormal;
layout (location = 3) in vec2 aTexCoord;

uniform mat4 uModel;
uniform mat4 uViewProjection;

out vec2 vTexCoord;
out vec3 vNormal;
out vec3 vPosition;

void main() {
    vTexCoord = aTexCoord;
    vNormal = mat3(uModel) * aNormal;
    vPosition = (uModel * aPosition).xyz;
    gl_Position = uViewProjection * uModel * aPosition;
}
`;

const baseFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

struct DirectionalLight {
    vec3 direction;
    vec3 intensity;
};

struct SpotLight {
    vec3 position;
    vec3 direction;
    vec3 intensity;
    vec3 attenuation;
    float angularAttenuation;
};

struct Material {
    sampler2D baseColorTexture;
    sampler2D normalTexture;
    vec4 baseColorFactor;
    vec3 emissiveFactor;
    float roughnessFactor;
};

uniform vec3 uAmbientLight;
uniform vec3 uCameraPosition;

uniform DirectionalLight uMoon;
uniform DirectionalLight uMoon1;
uniform SpotLight uLeftHeadlight;
uniform SpotLight uRightHeadlight;
uniform Material uMaterial;

in vec2 vTexCoord;
in vec3 vNormal;
in vec3 vPosition;

out vec4 oColor;

vec3 computeDirectionalLight(DirectionalLight light, vec3 baseColor, vec3 normal, vec3 toEye) {
    float lambert = max(0.0, dot(normal, normalize(-light.direction)));
    return light.intensity * baseColor * lambert;
}

vec3 computeSpotLight(SpotLight light, vec3 position, vec3 baseColor, vec3 normal, vec3 toEye) {
    vec3 toLight = normalize(light.position - position); //Vector from the current point to the light source
    float lambert = max(0.0, dot(toLight, normal));
    float distance = distance(light.position, position); //Distance from the light source and the current point
    float angularAttenuation = pow(max(0.0, dot(-toLight, light.direction)), light.angularAttenuation);
    float attenuation = 1.0 / dot(light.attenuation, vec3(1.0, distance, distance * distance));
    return light.intensity * lambert * angularAttenuation * baseColor * attenuation;
}

void main() {
    const float gamma = 2.2;
    vec3 toEye = normalize(uCameraPosition - vPosition);
    vec3 normal = normalize(vNormal);

    vec3 diffuseAlbedo = pow(texture(uMaterial.baseColorTexture, vTexCoord).rgb, vec3(gamma));
    vec3 baseColor = uMaterial.baseColorFactor.xyz * diffuseAlbedo;

    vec3 moonlight = computeDirectionalLight(uMoon, baseColor, normal, toEye) + computeDirectionalLight(uMoon1, baseColor, normal, toEye);
    vec3 leftHeadlight = computeSpotLight(uLeftHeadlight, vPosition, baseColor, normal, toEye);
    vec3 rightHeadlight = computeSpotLight(uRightHeadlight, vPosition, baseColor, normal, toEye);

    oColor.xyz = pow(moonlight + leftHeadlight + rightHeadlight + baseColor * uAmbientLight, vec3(1.0 / gamma));
    oColor.w = 1.0;
}
`;

const skyVertex = `#version 300 es

layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec3 aNormal;
layout (location = 3) in vec2 aTexCoord;

uniform mat4 uModel;
uniform mat4 uViewProjection;

out vec2 vTexCoord;
out vec3 vNormal;
out vec3 vPosition;

void main() {
    vTexCoord = aTexCoord;
    vNormal = mat3(uModel) * aNormal;
    vPosition = (uModel * aPosition).xyz;
    gl_Position = uViewProjection * uModel * aPosition;
}
`;

const skyFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

struct DirectionalLight {
    vec3 direction;
    vec3 intensity;
};

struct SpotLight {
    vec3 position;
    vec3 direction;
    vec3 intensity;
    vec3 attenuation;
    float angularAttenuation;
};

struct Material {
    sampler2D baseColorTexture;
    sampler2D normalTexture;
    vec4 baseColorFactor;
    vec3 emissiveFactor;
    float roughnessFactor;
};

uniform vec3 uAmbientLight;
uniform vec3 uCameraPosition;

uniform DirectionalLight uMoon;
uniform DirectionalLight uMoon1;
uniform SpotLight uLeftHeadlight;
uniform SpotLight uRightHeadlight;
uniform Material uMaterial;

in vec2 vTexCoord;
in vec3 vNormal;
in vec3 vPosition;

out vec4 oColor;

vec3 computeDirectionalLight(DirectionalLight light, vec3 baseColor, vec3 normal, vec3 toEye) {
    float lambert = max(0.0, dot(normal, normalize(-light.direction)));
    return light.intensity * baseColor * lambert;
}

vec3 computeSpotLight(SpotLight light, vec3 position, vec3 baseColor, vec3 normal, vec3 toEye) {
    vec3 toLight = normalize(light.position - position); //Vector from the current point to the light source
    float lambert = max(0.0, dot(toLight, normal));
    float distance = distance(light.position, position); //Distance from the light source and the current point
    float angularAttenuation = pow(max(0.0, dot(-toLight, light.direction)), light.angularAttenuation);
    float attenuation = 1.0 / dot(light.attenuation, vec3(1.0, distance, distance * distance));
    return light.intensity * lambert * angularAttenuation * baseColor * attenuation;
}

void main() {
    const float gamma = 2.2;
    vec3 toEye = normalize(uCameraPosition - vPosition);
    vec3 normal = normalize(vNormal);

    vec3 diffuseAlbedo = pow(texture(uMaterial.baseColorTexture, vTexCoord).rgb, vec3(gamma));
    vec3 baseColor = uMaterial.baseColorFactor.xyz * diffuseAlbedo;

    vec3 moonlight = computeDirectionalLight(uMoon, baseColor, normal, toEye) + computeDirectionalLight(uMoon1, baseColor, normal, toEye);
    vec3 leftHeadlight = computeSpotLight(uLeftHeadlight, vPosition, baseColor, normal, toEye);
    vec3 rightHeadlight = computeSpotLight(uRightHeadlight, vPosition, baseColor, normal, toEye);

    oColor.xyz = pow(moonlight + leftHeadlight + rightHeadlight + baseColor * uAmbientLight, vec3(1.0 / gamma));
    oColor.w = uMaterial.baseColorFactor.w;
}
`;

const normalVertex = `#version 300 es

layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec3 aNormal;
layout (location = 2) in vec3 aTangent;
layout (location = 3) in vec2 aTexCoord;

uniform mat4 uModel;
uniform mat4 uViewProjection;

out vec2 vTexCoord;
out vec3 vNormal;
out vec3 vPosition;
out vec3 vTangent;

void main() {
    vTexCoord = aTexCoord;
    vNormal = mat3(uModel) * aNormal;
    vPosition = (uModel * aPosition).xyz;
    vTangent = mat3(uModel) * aTangent;
    gl_Position = uViewProjection * uModel * aPosition;
}
`;

const normalFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

struct DirectionalLight {
    vec3 direction;
    vec3 intensity;
};

struct SpotLight {
    vec3 position;
    vec3 direction;
    vec3 intensity;
    vec3 attenuation;
    float angularAttenuation;
};

struct Material {
    sampler2D baseColorTexture;
    sampler2D normalTexture;
    vec4 baseColorFactor;
    vec3 emissiveFactor;
    float roughnessFactor;
};

uniform vec3 uAmbientLight;
uniform vec3 uCameraPosition;

uniform DirectionalLight uMoon;
uniform DirectionalLight uMoon1;
uniform SpotLight uLeftHeadlight;
uniform SpotLight uRightHeadlight;
uniform Material uMaterial;

in vec2 vTexCoord;
in vec3 vNormal;
in vec3 vPosition;
in vec3 vTangent;

out vec4 oColor;

mat3 tbnMatrix(vec3 normal, vec3 tangent) {
    vec3 n = normalize(normal);
    vec3 t = normalize(tangent - dot(tangent, n) * n);
    vec3 b = cross(n, t);
    return mat3(t, b, n);
}

vec3 computeDirectionalLight(DirectionalLight light, vec3 baseColor, vec3 normal, vec3 toEye) {
    float lambert = max(0.0, dot(normal, normalize(-light.direction)));
    return light.intensity * baseColor * lambert;
}

vec3 computeSpotLight(SpotLight light, vec3 position, vec3 baseColor, vec3 normal, vec3 toEye) {
    vec3 toLight = light.position - position; //Vector from the current point to the light source
    float distance = length(toLight); //Distance from the light source and the current point
    toLight = normalize(toLight);
    float angularAttenuation = pow(max(0.0, dot(-toLight, light.direction)), light.angularAttenuation);
    float attenuation = 1.0 / dot(light.attenuation, vec3(1.0, distance, distance * distance));
    return light.intensity * max(0.0, dot(toLight, normal)) * angularAttenuation * baseColor * attenuation;
}

void main() {
    const float gamma = 2.2;

    vec3 lightDirection = normalize(-uMoon.direction);
    vec3 toEye = normalize(uCameraPosition - vPosition);
    vec3 normal = normalize(vNormal);
    mat3 tbn = tbnMatrix(vNormal, vTangent);
    vec3 bumpedNormal = texture(uMaterial.normalTexture, vTexCoord).rgb;
    bumpedNormal = tbn * bumpedNormal;

    vec3 diffuseAlbedo = pow(texture(uMaterial.baseColorTexture, vTexCoord).rgb, vec3(gamma));
    vec3 baseColor = uMaterial.baseColorFactor.xyz * diffuseAlbedo;

    vec3 moonlight = computeDirectionalLight(uMoon, baseColor, normal, toEye) + computeDirectionalLight(uMoon1, baseColor, normal, toEye);
    vec3 leftHeadlight = computeSpotLight(uLeftHeadlight, vPosition, baseColor, normal, toEye);
    vec3 rightHeadlight = computeSpotLight(uRightHeadlight, vPosition, baseColor, normal, toEye);

    oColor.xyz = pow(moonlight + leftHeadlight + rightHeadlight + baseColor * uAmbientLight, vec3(1.0 / gamma));
    oColor.w = 1.0;
}
`;

const backdropVertex = `#version 300 es

layout (location = 0) in vec4 aPosition;

uniform mat4 uModel;
uniform mat4 uViewProjection;

out vec3 vPosition;

void main() {
    vPosition = aPosition.xyz;
    gl_Position = uViewProjection * uModel * aPosition;
}
`;

const backdropFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

struct Material {
    sampler2D baseColorTexture;
    vec4 baseColorFactor;
};

uniform Material uMaterial;

in vec3 vPosition;

out vec4 oColor;

vec2 equirectangularCoordinates(vec3 position) {
    const float pi = 3.1415926535;
    return vec2((atan(position.z, position.x) / pi) * 0.5 + 0.5, acos(position.y) / pi);
}

void main() {
    const float gamma = 2.2;

    vec3 diffuseAlbedo = pow(texture(uMaterial.baseColorTexture, equirectangularCoordinates(vPosition)).rgb, vec3(gamma));
    vec3 baseColor = uMaterial.baseColorFactor.xyz * diffuseAlbedo;

    oColor.xyz = pow(baseColor, vec3(1.0 / gamma));
    oColor.w = 1.0;
}
`;

const overlayDisplayVertex = `#version 300 es

layout (location = 0) in vec2 aPosition;
layout (location = 1) in vec2 aTexCoord;
uniform mat2 uScreenMatrix;
uniform vec2 uOffset;

out vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = vec4(uScreenMatrix * aPosition + uOffset, 0.1, 1.0);
}
`;

const overlayDisplayFragment = `#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform sampler2D uTexture;

in vec2 vTexCoord;

out vec4 oColor;

void main() {
    oColor = texture(uTexture, vTexCoord);
}
`;

export const shaders = {
    sky: { vertex: skyVertex, fragment: skyFragment },
    base: { vertex: baseVertex, fragment: baseFragment },
    normal: { vertex: normalVertex, fragment: normalFragment },
    backdrop: { vertex: backdropVertex, fragment: backdropFragment },
    overlayDisplay: { vertex: overlayDisplayVertex, fragment: overlayDisplayFragment },
};