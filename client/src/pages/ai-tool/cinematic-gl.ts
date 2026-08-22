/** GPU photo compositor — filmic grade + cover Ken Burns. Falls back silently. */

type Cam = { zoom: number; panX: number; panY: number };

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uCanvas;
uniform vec2 uImage;
uniform float uZoom;
uniform vec2 uPan;
uniform float uGrade;

void main() {
  float canvasA = uCanvas.x / max(uCanvas.y, 1.0);
  float imageA = uImage.x / max(uImage.y, 1.0);
  vec2 scale = vec2(1.0);
  if (imageA > canvasA) scale.x = canvasA / imageA;
  else scale.y = imageA / canvasA;
  vec2 uv = (vUv - 0.5) * scale / max(uZoom, 0.01) + 0.5;
  uv += uPan * 0.01;
  uv.y = 1.0 - uv.y;
  vec3 col = texture(uTex, uv).rgb;

  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, 1.06);
  col = (col - 0.5) * 1.14 + 0.48;
  col.r += 0.028 * luma * uGrade;
  col.b += 0.034 * (1.0 - luma) * uGrade;
  col = max(col, vec3(0.0));
  col = col * (1.02 + luma * 0.08);
  col = col / (col + vec3(0.72)) * 1.18;

  float d = distance(vUv, vec2(0.5, 0.46));
  float vig = smoothstep(0.28, 0.98, d);
  col *= 1.0 - vig * 0.38 * uGrade;

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

type GLState = {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  prog: WebGLProgram;
  vao: WebGLVertexArrayObject;
  loc: Record<string, WebGLUniformLocation | null>;
  textures: WeakMap<HTMLImageElement, WebGLTexture>;
};

let state: GLState | null = null;
let failed = false;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || "shader");
  }
  return sh;
}

function init(): GLState | null {
  if (failed) return null;
  if (state) return state;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("no webgl2");
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const locPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
    state = {
      gl,
      canvas,
      prog,
      vao,
      loc: {
        uTex: gl.getUniformLocation(prog, "uTex"),
        uCanvas: gl.getUniformLocation(prog, "uCanvas"),
        uImage: gl.getUniformLocation(prog, "uImage"),
        uZoom: gl.getUniformLocation(prog, "uZoom"),
        uPan: gl.getUniformLocation(prog, "uPan"),
        uGrade: gl.getUniformLocation(prog, "uGrade"),
      },
      textures: new WeakMap(),
    };
    return state;
  } catch {
    failed = true;
    return null;
  }
}

function texFor(s: GLState, img: HTMLImageElement): WebGLTexture | null {
  const hit = s.textures.get(img);
  if (hit) return hit;
  const gl = s.gl;
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  s.textures.set(img, tex);
  return tex;
}

export function drawGradedStill(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  cam: Cam,
  grade = 1,
): boolean {
  const s = init();
  if (!s) return false;
  const tex = texFor(s, img);
  if (!tex) return false;
  if (s.canvas.width !== w || s.canvas.height !== h) {
    s.canvas.width = w;
    s.canvas.height = h;
  }
  const gl = s.gl;
  gl.viewport(0, 0, w, h);
  gl.useProgram(s.prog);
  gl.bindVertexArray(s.vao);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(s.loc.uTex, 0);
  gl.uniform2f(s.loc.uCanvas, w, h);
  gl.uniform2f(s.loc.uImage, img.naturalWidth || img.width, img.naturalHeight || img.height);
  gl.uniform1f(s.loc.uZoom, cam.zoom);
  gl.uniform2f(s.loc.uPan, cam.panX, cam.panY);
  gl.uniform1f(s.loc.uGrade, grade);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  ctx.drawImage(s.canvas, 0, 0, w, h);
  return true;
}
