# Especificaciones del proyecto

## Propósito

Una aplicación que permite interactuar con dos ruletas de 8 espacios usando las manos y la cámara web de la computadora. Cada mano controla su propia ruleta: cuando la mano está abierta, su ruleta gira; cuando se cierra, se detiene. Las ruletas suenan mientras giran. Además, cada ruleta sigue la posición de su mano correspondiente en la pantalla, esté abierta o cerrada, y se mueva o no.

## Funcionamiento general de la aplicación

Quiero realizar una interacción con las manos y la cámara de mi computador, en la que existan dos ruletas con 8 espacios cada una. Cada mano controla una ruleta: cuando la mano esté abierta, su ruleta girará; cuando la mano se cierre, su ruleta parará. Las ruletas tendrán sonido al girar. Cada ruleta seguirá su mano correspondiente, moviéndose junto con ella a donde vaya, esté abierta o cerrada.

## Stack tecnológico

- **p5.js**: canvas, bucle de animación (`draw`), dibujo de las ruletas y manejo de estados de la aplicación.
- **ml5.js**: modelo **HandPose** para detección de manos y gestos en tiempo real (abierta/cerrada y coordenadas de cada mano).
- **Web Audio API nativa**: reproducción de audio mientras al menos una ruleta gira (sin librerías de sonido externas).
- **HTML5 + CSS**: contenedor del canvas y estilos mínimos.

## Requisitos funcionales

1. Acceso a la cámara web del usuario (permiso necesario).
2. Detección continua de hasta dos manos simultáneas.
3. Detección continua de gesto "mano abierta" y "mano cerrada" por cada mano de forma independiente.
4. Detección de la posición de cada mano (coordenadas x, y) en cada frame.
5. Dos ruletas divididas en 8 segmentos iguales cada una.
6. Cada ruleta gira solo mientras su mano correspondiente esté abierta.
7. Cada ruleta se detiene cuando su mano correspondiente se cierra.
8. Cada ruleta sigue la posición de su mano en el canvas, esté abierta o cerrada, y se mueva o no.
9. Suena audio mientras al menos una ruleta gira; el sonido se detiene cuando todas paran.
10. Se indica visualmente el segmento ganador de cada ruleta al detenerse.

## Especificaciones técnicas

### Lógica de la ruleta (por cada ruleta)
- Ángulo de rotación y velocidad angular independientes.
- La rotación está activa únicamente cuando su mano correspondiente está abierta.
- Al cerrar la mano, la rotación se detiene con fricción/desaceleración suave.
- Cálculo del segmento ganador según el ángulo final de la ruleta.

### Seguimiento de posición de la mano (tracking preciso)
- Centro de la mano calculado como promedio de los landmarks de muñeca y bases de los dedos (puntos 0, 5, 9, 13, 17 de HandPose) para mayor estabilidad que usando solo la muñeca.
- Suavizado de posición con buffer de historial (promedio de las últimas N posiciones) más interpolación lineal (lerp), para reducir saltos y hacer el movimiento más fluido y preciso.
- Cada ruleta se reposiciona en cada frame siguiendo su mano correspondiente, independientemente de si está girando o detenida.
- La ruleta debe permanecer dentro de los límites visibles del canvas.

### Gestión de estados de la app (por cada ruleta)
- `idle`: esperando que se abra la mano.
- `spinning`: girando con sonido.
- `stopped`: detenida mostrando el segmento ganador.

### Sonido global
- Un solo oscilador Web Audio API suena cuando al menos una ruleta está girando.
- El sonido se detiene cuando todas las ruletas se han detenido.

### Cámara
- Imagen espejada (selfie-view) para que el movimiento coincida con la mano del usuario.
- Resolución suficiente para detección sin sobrecargar el navegador.

## Estructura de archivos sugerida

- `index.html`
- `sketch.js` (lógica p5.js + ml5)
- `styles.css`
- `assets/sound/ruleta.mp3` (opcional, si se prefiere audio externo en lugar del sintetizado)

## Cómo ejecutar

- Servidor local requerido (CORS por cámara y audio).
- Abrir `index.html` en un navegador moderno (Chrome, Edge, Firefox).

## Consideraciones

- Alternativa sin cámara (botón de simulación) para pruebas y accesibilidad.
- Navegadores con soporte para WebRTC y Web Audio API.

