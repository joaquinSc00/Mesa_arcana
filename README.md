# Mesa Arcana

Prototipo web para jugar una mesa de rol casera con varios dispositivos:

- vista de jugador;
- vista de director;
- vista de tablero publico;
- fichas manuales con linaje, clase/camino, trasfondo, atributos, habilidades y rasgos;
- flujo de personaje con borrador y finalizacion;
- limite de 6 puntos de atributo, 2 puntos de habilidad base y maximo 6 habilidades activas;
- dados libres y consultas rapidas de atributos;
- escena publica;
- biblioteca manual de enemigos, NPCs y objetos;
- iniciativa basica.
- listado de salas activas y borrado manual con codigo privado.

## Sistema de personaje

La definicion del sistema esta centralizada en:

```text
game-system.js
```

Ese archivo contiene:

- atributos;
- habilidades y atributos asociados;
- linajes;
- clases/caminos;
- trasfondos;
- rasgos;
- categorias de ayuda para consulta del DM;
- tarjetas precargadas de enemigos, NPCs y objetos.

La app no decide automaticamente si una accion sucede. Sirve como ficha, anotador, dados, tablero y mesa de control manual. El DM decide la resolucion hablando en la mesa y actualiza la plataforma si quiere mostrar, quitar o modificar algo.

## Flujo de personaje

El jugador puede guardar una ficha como borrador. Cuando elige `Entrar a la partida`, la ficha queda lista y se bloquea la edicion normal de linaje, clase, trasfondo, atributos y habilidades. A partir de ese momento el jugador ve una carta final con sus datos y el DM puede modificar vida, mana, notas, condiciones e inventario desde su panel.

## Ejecutar local

```powershell
py -3 -m http.server 4173 --directory "C:\Users\joaqu\OneDrive\Documentos\Juego de Roll digital"
```

Abrir:

```text
http://localhost:4173
```

## Firebase

La app usa `firebase-config.js` y escribe bajo:

```text
mesaArcana/rooms
```

Regla simple para uso personal:

```json
{
  "rules": {
    "mesaArcana": {
      "rooms": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Si ya existen reglas en Firebase, no reemplazar todo a ciegas: agregar solo ese bloque donde corresponda.

## Proximo avance sugerido

1. Confirmar sincronizacion real entre dos dispositivos.
2. Pulir visualmente la carta final de personaje en tablet/celular.
3. Agregar tablero con tokens movibles.
4. Agregar condiciones, inventario y notas privadas del director.
