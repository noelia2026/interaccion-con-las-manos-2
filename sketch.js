// Ruleta con las manos — p5.js + ml5.js HandPose + Web Audio API nativa
// Especificaciones: ver spec.md

let video;
let handpose;
let predictions = [];

// Sonido con Web Audio API nativa (sin p5.sound)
let audioCtx;
let osc;
let gainNode;
let isSoundPlaying = false;

// Una sola ruleta (una mano)
let wheelX, wheelY;
let targetX, targetY;
let wheelRadius = 140;
let numSegments = 8;

// Rotación
let angle = 0;
let rotationSpeed = 0;
let targetSpeed = 0;
let friction = 0.96;
let minSpeed = 0.005;

// Estados
let isSpinning = false;
let handOpen = false;
let winnerIndex = null;
let calculatingWinner = false;

// Suavizado de posición
let posBuffer = [];
let bufferSize = 6;

let colors = [
  '#FF6B6B', // coral tropical
  '#4ECDC4', // turquesa tropical
  '#45B7D1', // azul cielo tropical
  '#FFA07A', // salmón claro
  '#98D8C8', // menta
  '#F7DC6F', // amarillo sol tropical
  '#BB8FCE', // orquídea
  '#58D68D'  // verde esmeralda
];

let segmentLabels = [1, 2, 3, 4, 5, 6, 7, 8];

function preload() {
  // Opcional: cargar sonido externo si existe
  // sound = loadSound('assets/sound/ruleta.mp3');
}

function setup() {
  createCanvas(640, 480);

  video = createCapture(VIDEO, videoReady);
  video.size(640, 480);
  video.hide();

  handpose = ml5.handpose(video, modelReady);
  handpose.on('predict', gotResults);

  // Inicializar contexto de audio nativo (lazy init en primer gesto)
  audioCtx = null;
  osc = null;
  gainNode = null;
  isSoundPlaying = false;

  wheelX = width / 2;
  wheelY = height / 2;
  targetX = wheelX;
  targetY = wheelY;
}

function videoReady() {
  console.log('Video listo');
}

function modelReady() {
  console.log('Modelo HandPose listo');
}

function gotResults(results) {
  predictions = results;
}

function ensureAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
  }
}

function startSound() {
  if (!isSoundPlaying) {
    ensureAudioCtx();
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    isSoundPlaying = true;
  }
}

function stopSound() {
  if (isSoundPlaying && audioCtx) {
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    isSoundPlaying = false;
  }
}

function draw() {
  background('#1a1a2e');

  // Dibujar video espejado (selfie-view)
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  // Procesar detección de manos (ml5 HandPose usa landmarks, no keypoints)
  if (predictions.length > 0 && predictions[0].landmarks) {
    let landmarks = predictions[0].landmarks; // cada uno es [x, y, z]

    // Centro de la mano: promedio de muñeca y bases de los dedos (más estable que solo muñeca)
    let palmPoints = [0, 5, 9, 13, 17];
    let cx = 0, cy = 0;
    let validPoints = 0;
    for (let idx of palmPoints) {
      if (landmarks[idx] && !isNaN(landmarks[idx][0]) && !isNaN(landmarks[idx][1])) {
        cx += landmarks[idx][0];
        cy += landmarks[idx][1];
        validPoints++;
      }
    }
    if (validPoints > 0) {
      cx /= validPoints;
      cy /= validPoints;

      // Detección abierta/cerrada: índice vs muñeca
      let wrist = landmarks[0];
      let indexTip = landmarks[8];
      let indexBase = landmarks[5];

      let handSize = dist(wrist[0], wrist[1], indexBase[0], indexBase[1]);
      let fingerLength = dist(wrist[0], wrist[1], indexTip[0], indexTip[1]);
      let ratio = handSize > 0 ? fingerLength / handSize : 0;
      handOpen = ratio > 1.15;

      // Posición objetivo (espejada para selfie-view)
      targetX = width - cx;
      targetY = cy;

      // Suavizado de posición con buffer de historial
      posBuffer.push({ x: targetX, y: targetY });
      if (posBuffer.length > bufferSize) {
        posBuffer.shift();
      }

      let avgX = 0, avgY = 0;
      for (let pos of posBuffer) {
        avgX += pos.x;
        avgY += pos.y;
      }
      avgX /= posBuffer.length;
      avgY /= posBuffer.length;

      wheelX = lerp(wheelX, avgX, 0.18);
      wheelY = lerp(wheelY, avgY, 0.18);
    }
  }

  // Lógica de rotación de la ruleta
  if (handOpen && !isSpinning) {
    isSpinning = true;
    rotationSpeed = 0;
    targetSpeed = random(0.08, 0.18);
    startSound();
    winnerIndex = null;
    calculatingWinner = false;
  }

  if (!handOpen && isSpinning) {
    isSpinning = false;
    targetSpeed = 0;
    calculatingWinner = true;
  }

  // Aplicar aceleración o fricción
  if (isSpinning) {
    rotationSpeed = lerp(rotationSpeed, targetSpeed, 0.05);
  } else {
    rotationSpeed *= friction;
    if (abs(rotationSpeed) < minSpeed) {
      rotationSpeed = 0;
      if (calculatingWinner) {
        calculateWinner();
        calculatingWinner = false;
        stopSound();
      }
    }
  }

  angle += rotationSpeed;

  // Dibujar ruleta
  drawWheel();

  // Dibujar puntero indicador (parte superior)
  drawPointer();

  // Dibujar interfaz de usuario
  drawUI();
}

function calculateWinner() {
  if (rotationSpeed !== 0) return;

  let segmentAngle = TWO_PI / numSegments;
  let normAngle = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  let relative = (-PI / 2 - normAngle + TWO_PI) % TWO_PI;
  winnerIndex = floor(relative / segmentAngle) % numSegments;
}

function drawWheel() {
  let wheelRadiusLocal = wheelRadius;

  push();
  translate(wheelX, wheelY);
  rotate(angle);

  let segmentAngle = TWO_PI / numSegments;

  for (let i = 0; i < numSegments; i++) {
    fill(colors[i]);
    stroke('#ffffff');
    strokeWeight(2);
    arc(0, 0, wheelRadiusLocal * 2, wheelRadiusLocal * 2,
        i * segmentAngle, (i + 1) * segmentAngle, PIE);
  }

  // Círculo central
  fill('#ffffff');
  noStroke();
  ellipse(0, 0, 30, 30);

  pop();
}

function drawPointer() {
  let px = wheelX;
  let py = wheelY - wheelRadius - 20;

  // Triángulo indicador
  push();
  translate(px, py);
  fill('#ffffff');
  noStroke();
  triangle(-10, 10, 10, 10, 0, -10);
  pop();

  // Línea hacia la ruleta
  stroke('#ffffff');
  strokeWeight(2);
  line(wheelX, wheelY - wheelRadius, wheelX, wheelY - wheelRadius - 10);
  noStroke();
}

function drawUI() {
  fill('#ffffff');
  noStroke();
  textSize(18);
  textAlign(LEFT, TOP);

  let status = handOpen ? 'MANO ABIERTA — Girando' : 'MANO CERRADA — Detenida';
  text('Estado: ' + status, 20, 20);

  if (winnerIndex !== null) {
    text('Segmento ganador: ' + segmentLabels[winnerIndex], 20, 50);
  }

  textSize(14);
  text('Mueva su mano para mover la ruleta', 20, height - 40);
  text('Abra la mano para girar, ciérrela para parar', 20, height - 20);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  wheelX = width / 2;
  wheelY = height / 2;
}
