// Ruleta con las manos — p5.js + ml5.js HandPose + Web Audio API nativa
// Especificaciones: ver spec.md

let video;
let handpose;
let predictions = [];

// Sonido con Web Audio API nativa (sin p5.sound)
let audioCtx;
let osc;
let gainNode;
let anySpinning = false;

// Dos ruletas (una por mano)
let maxHands = 2;
let wheels = [];

function preload() {
  // Opcional: cargar sonido externo si existe
  // sound = loadSound('assets/sound/ruleta.mp3');
}

function setup() {
  createCanvas(640, 480);

  video = createCapture(VIDEO, videoReady);
  video.size(640, 480);
  video.hide();

  // Pedir a ml5 detectar hasta 2 manos
  handpose = ml5.handpose(video, { maxHands: 2 }, modelReady);
  handpose.on('predict', gotResults);

  audioCtx = null;
  osc = null;
  gainNode = null;
  anySpinning = false;

  // Siempre crear las 2 ruletas desde el inicio
  for (let i = 0; i < maxHands; i++) {
    wheels.push(createWheel(width / 2, height / 2, i + 1));
  }
}

function videoReady() {
  console.log('Video listo');
}

function modelReady() {
  console.log('Modelo HandPose listo (maxHands: 2)');
}

function gotResults(results) {
  predictions = results;
  // Debug: cuántas manos detecta ml5
  let valid = predictions.filter(p => p.landmarks && p.landmarks.length > 0).length;
  console.log('Manos detectadas por ml5:', valid);
}

function createWheel(x, y, handNumber) {
  return {
    handNumber: handNumber,
    x: x,
    y: y,
    targetX: x,
    targetY: y,
    angle: 0,
    rotationSpeed: 0,
    targetSpeed: 0,
    isSpinning: false,
    handOpen: false,
    winnerIndex: null,
    calculatingWinner: false,
    posBuffer: [],
    bufferSize: 6,
    assigned: false
  };
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

function updateSound() {
  if (!audioCtx) return;

  let shouldPlay = false;
  for (let w of wheels) {
    if (w.isSpinning) {
      shouldPlay = true;
      break;
    }
  }

  if (shouldPlay && !anySpinning) {
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    anySpinning = true;
  } else if (!shouldPlay && anySpinning) {
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    anySpinning = false;
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

  // Filtrar manos con landmarks válidos
  let validHands = predictions.filter(p => p.landmarks && p.landmarks.length > 0);

  // Reset asignación
  for (let w of wheels) {
    w.assigned = false;
  }

  // Ordenar manos por posición X (en coordenadas espejadas: izquierda = menor x)
  // Así la mano más a la izquierda controla la ruleta 1, la derecha controla la ruleta 2
  let sortedHands = [...validHands].sort((a, b) => {
    let ax = a.landmarks[0][0]; // muñeca x
    let bx = b.landmarks[0][0];
    return ax - bx;
  });

  // Asignar cada mano detectada a una ruleta
  for (let i = 0; i < sortedHands.length && i < maxHands; i++) {
    let wheel = wheels[i];
    wheel.assigned = true;
    let p = sortedHands[i];
    let landmarks = p.landmarks;

    // Centro de la mano: promedio de muñeca y bases de los dedos (más estable)
    let palmPoints = [0, 5, 9, 13, 17];
    let cx = 0, cy = 0;
    for (let idx of palmPoints) {
      cx += landmarks[idx][0];
      cy += landmarks[idx][1];
    }
    cx /= palmPoints.length;
    cy /= palmPoints.length;

    // Detección abierta/cerrada: índice vs muñeca
    let wrist = landmarks[0];
    let indexTip = landmarks[8];
    let indexBase = landmarks[5];

    let handSize = dist(wrist[0], wrist[1], indexBase[0], indexBase[1]);
    let fingerLength = dist(wrist[0], wrist[1], indexTip[0], indexTip[1]);
    let ratio = handSize > 0 ? fingerLength / handSize : 0;
    let handOpen = ratio > 1.15;

    // Posición objetivo (espejada para selfie-view)
    let targetX = width - cx;
    let targetY = cy;

    // Suavizado de posición con buffer de historial
    wheel.posBuffer.push({ x: targetX, y: targetY });
    if (wheel.posBuffer.length > wheel.bufferSize) {
      wheel.posBuffer.shift();
    }

    let avgX = 0, avgY = 0;
    for (let pos of wheel.posBuffer) {
      avgX += pos.x;
      avgY += pos.y;
    }
    avgX /= wheel.posBuffer.length;
    avgY /= wheel.posBuffer.length;

    wheel.targetX = avgX;
    wheel.targetY = avgY;
    wheel.x = lerp(wheel.x, wheel.targetX, 0.18);
    wheel.y = lerp(wheel.y, wheel.targetY, 0.18);

    // Lógica de rotación de la ruleta
    if (handOpen && !wheel.isSpinning) {
      wheel.isSpinning = true;
      wheel.rotationSpeed = 0;
      wheel.targetSpeed = random(0.08, 0.18);
      wheel.winnerIndex = null;
      wheel.calculatingWinner = false;
    }

    if (!handOpen && wheel.isSpinning) {
      wheel.isSpinning = false;
      wheel.targetSpeed = 0;
      wheel.calculatingWinner = true;
    }

    // Aplicar aceleración o fricción
    if (wheel.isSpinning) {
      wheel.rotationSpeed = lerp(wheel.rotationSpeed, wheel.targetSpeed, 0.05);
    } else {
      wheel.rotationSpeed *= 0.96;
      if (abs(wheel.rotationSpeed) < 0.005) {
        wheel.rotationSpeed = 0;
        if (wheel.calculatingWinner) {
          calculateWinner(wheel);
          wheel.calculatingWinner = false;
        }
      }
    }

    wheel.angle += wheel.rotationSpeed;
    wheel.handOpen = handOpen;

    // Dibujar puntos de la mano detectada (depuración visual)
    drawHandDebug(landmarks);
  }

  // Para ruletas sin mano asignada, aplicar fricción para detenerlas
  for (let i = 0; i < wheels.length; i++) {
    let wheel = wheels[i];
    if (!wheel.assigned) {
      if (wheel.isSpinning) {
        wheel.isSpinning = false;
        wheel.targetSpeed = 0;
        wheel.calculatingWinner = true;
      }
      wheel.rotationSpeed *= 0.96;
      if (abs(wheel.rotationSpeed) < 0.005) {
        wheel.rotationSpeed = 0;
        if (wheel.calculatingWinner) {
          calculateWinner(wheel);
          wheel.calculatingWinner = false;
        }
      }
      wheel.angle += wheel.rotationSpeed;
    }
  }

  // Actualizar sonido global
  updateSound();

  // Dibujar cada ruleta con su puntero
  for (let wheel of wheels) {
    drawWheel(wheel);
    drawPointer(wheel);
  }

  // Dibujar interfaz de usuario
  drawUI(validHands.length);
}

function calculateWinner(wheel) {
  if (wheel.rotationSpeed !== 0) return;

  let segmentAngle = TWO_PI / 8;
  let normAngle = ((wheel.angle % TWO_PI) + TWO_PI) % TWO_PI;
  let relative = (-PI / 2 - normAngle + TWO_PI) % TWO_PI;
  wheel.winnerIndex = floor(relative / segmentAngle) % 8;
}

function drawHandDebug(landmarks) {
  // Dibujar puntos clave de la mano para depuración
  for (let idx of [0, 5, 8, 9, 13, 17]) {
    if (landmarks[idx]) {
      let x = width - landmarks[idx][0]; // espejado
      let y = landmarks[idx][1];
      fill('#ff00ff');
      noStroke();
      ellipse(x, y, 8, 8);
    }
  }
}

function drawWheel(wheel) {
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

  let numSegments = 8;
  let wheelRadius = 120;

  push();
  translate(wheel.x, wheel.y);
  rotate(wheel.angle);

  let segmentAngle = TWO_PI / numSegments;

  for (let i = 0; i < numSegments; i++) {
    fill(colors[i]);
    stroke('#ffffff');
    strokeWeight(2);
    arc(0, 0, wheelRadius * 2, wheelRadius * 2,
        i * segmentAngle, (i + 1) * segmentAngle, PIE);
  }

  // Círculo central
  fill('#ffffff');
  noStroke();
  ellipse(0, 0, 28, 28);

  // Número de la mano en el centro
  fill('#000000');
  textSize(14);
  textAlign(CENTER, CENTER);
  text(wheel.handNumber, 0, 0);

  pop();
}

function drawPointer(wheel) {
  let wheelRadius = 120;
  let px = wheel.x;
  let py = wheel.y - wheelRadius - 20;

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
  line(wheel.x, wheel.y - wheelRadius, wheel.x, wheel.y - wheelRadius - 10);
  noStroke();
}

function drawUI(numHandsDetected) {
  fill('#ffffff');
  noStroke();
  textSize(18);
  textAlign(LEFT, TOP);

  let spinningCount = 0;
  for (let w of wheels) {
    if (w.isSpinning) spinningCount++;
  }

  text('Manos detectadas: ' + numHandsDetected + ' / 2', 20, 20);
  text('Ruleta(s) girando: ' + spinningCount, 20, 45);

  let yOffset = 75;
  for (let i = 0; i < wheels.length; i++) {
    let w = wheels[i];
    let label = 'Regla ' + w.handNumber + ': ';
    if (w.assigned) {
      label += w.handOpen ? 'ABIERTA — girando' : 'CERRADA — detenida';
    } else {
      label += 'esperando mano...';
    }
    if (w.winnerIndex !== null) {
      label += ' | Ganador: ' + (w.winnerIndex + 1);
    }
    text(label, 20, yOffset);
    yOffset += 28;
  }

  textSize(14);
  text('Mano abierta = gira | Mano cerrada = para', 20, height - 40);
  text('Mano izquierda -> Regla 1 | Mano derecha -> Regla 2', 20, height - 20);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
