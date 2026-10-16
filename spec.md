# Especificaciones del proyecto

## Propósito

Una aplicación que permite interactuar con una ruleta de 8 espacios usando las manos y la cámara web de la computadora. Cuando la mano está abierta, la ruleta gira; cuando se cierra, la ruleta se detiene. La ruleta suena mientras gira. Además, la ruleta sigue la posición de la mano en la pantalla, esté abierta o cerrada, y se mueva o no.

## Funcionamiento general de la aplicación

Quiero realizar una interacción con las manos y la cámara de mi computador, en la que exista una ruleta con 8 espacios. Cuando la mano esté abierta, la ruleta girará; cuando la mano se cierre, la ruleta parará. La ruleta tendrá sonido al girar. La ruleta también seguirá la mano, moviéndose junto con ella a donde vaya, esté abierta o cerrada.

## Stack tecnológico

- **p5.js**: canvas, bucle de animación (`draw`), dibujo de la ruleta y manejo de estados de la aplicación.
- **ml5.js**: modelo **HandPose** para detección de manos y gestos en tiempo real (abierta/cerrada y coordenadas de la mano).
- **Web Audio API nativa**: reproducción de audio mientras la ruleta gira (sin librerías de sonido externas).
- **HTML5 + CSS**: contenedor del canvas y estilos mínimos.

## Requisitos funcionales

1. Acceso a la cámara web del usuario (permiso necesario).
2. Detección continua de gesto "mano abierta" y "mano cerrada".
3. Detección de la posición de la mano (coordenadas x, y) en cada frame.
4. Ruleta dividida en 8 segmentos iguales.
5. La ruleta gira solo mientras la mano esté abierta.
6. La ruleta se detiene cuando la mano se cierra.
7. La ruleta sigue la posición de la mano en el canvas, esté abierta o cerrada, y se mueva o no.
8. Suena audio mientras la ruleta gira; el sonido se detiene al parar.
9. Se indica visualmente el segmento ganador al detenerse.

## Especificaciones técnicas

### Lógica de la ruleta
- Ángulo de rotación y velocidad angular.
- La rotación está activa únicamente en estado "mano abierta".
- Al cerrar la mano, la rotación se detiene (puede incluir desaceleración/fricción o parada inmediata; se definirá en implementación).
- Cálculo del segmento ganador según el ángulo final de la ruleta.

### Seguimiento de posición de la mano
- Se usa un punto de referencia de la mano detectada por ml5 HandPose (por ejemplo, muñeca o centro de la palma) para posicionar el centro de la ruleta en el canvas.
- La ruleta se reposiciona en cada frame siguiendo la mano, independientemente de si está girando o detenida.
- Se recomienda suavizado/interpolación para que el movimiento no sea brusco.
- La ruleta debe permanecer dentro de los límites visibles del canvas.

### Gestión de estados de la app
- `idle`: esperando que se abra la mano.
- `spinning`: girando con sonido.
- `stopped`: detenida mostrando el segmento ganador.

### Cámara
- Imagen espejada (selfie-view) para que el movimiento coincida con la mano del usuario.
- Resolución suficiente para detección sin sobrecargar el navegador.

### Sonido
- Audio en repetición (loop) mientras la ruleta gira.
- Corte o fade-out al detenerse.

## Estructura de archivos sugerida

- `index.html`
- `sketch.js` (lógica p5.js + ml5)
- `styles.css`
- `assets/sound/ruleta.mp3` (u otro formato de audio elegido)

## Cómo ejecutar

- Servidor local requerido (CORS por cámara y audio).
- Abrir `index.html` en un navegador moderno (Chrome, Edge, Firefox).

## Consideraciones

- Alternativa sin cámara (botón de simulación) para pruebas y accesibilidad.
- Navegadores con soporte para WebRTC y Web Audio API.
