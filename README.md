# Mesa Arcana

Mesa Arcana es una web para jugar una mesa de rol casera y presencial usando varios dispositivos. La idea es que una tablet, PC o tele funcione como tablero publico, mientras cada jugador usa su celular para ver su ficha y el director de juego usa un panel privado para manejar la partida.

La plataforma no reemplaza al DM. No decide si una accion sale bien o mal, no entrega recompensas, no cierra combates y no resuelve la historia. Funciona como ficha digital, anotador, tablero visual, organizador de turnos y mesa de control manual.

## Link publicado

```text
https://joaquinsc00.github.io/Mesa_arcana/
```

## Que se puede hacer hoy

- Crear una sala de partida con codigo.
- Entrar como jugador, director o tablero publico.
- Ver salas activas.
- Borrar una sala completa con codigo privado.
- Crear personajes con ficha estructurada.
- Guardar personajes como borrador.
- Finalizar personajes para entrar a la partida.
- Ver una carta final del personaje una vez terminado.
- Tirar dados libres.
- Consultar atributos con d20.
- Sincronizar datos entre dispositivos con Firebase.
- Mostrar escena publica en el tablero.
- Usar una biblioteca inicial de enemigos, NPCs y objetos.
- Hacer aparecer o quitar tarjetas manualmente.
- Modificar vida y mana desde el panel del DM.
- Agregar objetos, condiciones y notas a personajes.
- Manejar iniciativa basica y turno actual.
- Consultar rapidamente datos relevantes del personaje en turno.

## Roles

La interfaz separa las herramientas por rol. El jugador navega entre Personaje, Estadisticas, Inventario, Notas, Dados y Partida. El director alterna entre En vivo (mesa, escena, combate, actores y tiradas) y Preparacion (personajes y biblioteca). Los paneles de detalle se pueden abrir y cerrar sin modificar la partida. El tablero permite ocultar su panel lateral para proyectar una vista mas limpia.

Las secciones Aventura y Mundo y campana aparecen como proximamente; todavia no guardan contenido. La configuracion actual solo vuelve a la mesa de control.

### Jugador

El jugador entra con el codigo de sala y su nombre. Desde su pantalla puede crear y consultar su personaje.

Durante la creacion puede editar:

- nombre;
- linaje;
- clase o camino;
- trasfondo;
- atributos;
- habilidades;
- vida inicial;
- mana inicial;
- inventario;
- notas.

Cuando el personaje esta terminado, el jugador usa `Entrar a la partida`. En ese momento la ficha pasa a estado listo y se bloquea la edicion normal de linaje, clase, trasfondo, atributos y habilidades.

Desde la carta final puede ver:

- nombre;
- linaje;
- clase/camino;
- trasfondo;
- vida actual y maxima;
- mana actual y maximo;
- defensa;
- iniciativa;
- atributos;
- habilidades activas;
- rasgos;
- almacenamiento/inventario;
- notas;
- panel de dados.

### Director

El director controla la mesa desde un panel privado. Puede preparar y mostrar informacion, pero la resolucion narrativa siempre queda en sus manos.

Puede:

- cambiar la escena publica;
- ver personajes en borrador y personajes listos;
- modificar vida de personajes y enemigos;
- modificar mana de personajes;
- agregar objetos al inventario de un personaje;
- agregar condiciones;
- agregar notas del DM;
- marcar el turno actual;
- iniciar una iniciativa basica;
- pasar al siguiente turno;
- mostrar enemigos;
- quitar enemigos;
- mostrar NPCs;
- quitar NPCs;
- mostrar objetos;
- quitar objetos;
- consultar atributos, habilidades, rasgos e inventario del personaje en turno.

### Tablero publico

El tablero publico muestra solo lo que el DM decide mostrar.

Puede mostrar:

- escena actual;
- descripcion publica;
- personajes;
- enemigos visibles;
- NPCs visibles;
- objetos visibles;
- turno actual;
- tiradas recientes.

No interpreta la partida. Si un enemigo muere, el DM lo quita. Si aparece un objeto, el DM lo muestra. Si alguien recibe algo, el DM lo agrega manualmente.

## Creacion de personaje

La ficha esta pensada para ser util durante la partida, pero sin transformar la app en un motor automatico de reglas.

### Atributos

Los atributos actuales son:

- Fuerza;
- Agilidad;
- Resistencia;
- Intelecto;
- Voluntad;
- Presencia;
- Percepcion;
- Afinidad magica.

Cada personaje tiene 6 puntos libres de atributo para repartir.

### Habilidades

Las habilidades actuales son:

- Armas cuerpo a cuerpo;
- Arqueria;
- Defensa;
- Sigilo;
- Cerraduras y trampas;
- Supervivencia;
- Rastreo;
- Medicina;
- Persuasion;
- Intimidacion;
- Engaño;
- Investigacion;
- Conocimiento arcano;
- Percepcion fina;
- Concentracion.

Cada personaje tiene 2 puntos libres de habilidad por defecto. El linaje humano tiene +1 punto extra por versatilidad.

El limite total de habilidades activas es 6, contando:

- habilidades iniciales por linaje;
- habilidades iniciales por clase/camino;
- habilidades iniciales por trasfondo;
- habilidades elegidas manualmente.

### Estados de ficha

La ficha tiene dos estados:

```text
Borrador
Listo / en partida
```

En `Borrador`, el jugador puede editar la ficha.

En `Listo / en partida`, la ficha queda cerrada y se muestra como carta final. A partir de ahi, los cambios durante la partida se hacen principalmente desde el panel del DM.

## Biblioteca del DM

La app trae una biblioteca inicial para que el DM pueda mostrar cartas rapidamente.

### Enemigos

Hay 15 enemigos precargados:

- 5 de amenaza baja;
- 5 de amenaza media;
- 5 de amenaza alta.

Cada enemigo tiene:

- nombre;
- tipo;
- amenaza;
- vida;
- estadisticas simples;
- descripcion;
- notas para el DM.

### NPCs

Hay 5 NPCs iniciales. Cada uno tiene:

- nombre;
- rol;
- actitud;
- descripcion;
- secreto o nota del DM;
- algunas estadisticas relevantes.

### Objetos

Hay 10 objetos/cartas visuales iniciales:

- monedas;
- arma;
- pocion;
- llave;
- puerta oculta;
- cofre;
- pergamino;
- objeto magico;
- trampa;
- reliquia.

Estos objetos no tienen reglas automaticas. Son cartas visuales y anotaciones para que el DM las use como quiera.

## Turno actual y consulta rapida

El panel del DM tiene una zona de turno actual. Cuando un personaje tiene el turno, el DM puede consultar informacion filtrada por situacion:

- Social;
- Sigilo;
- Combate;
- Exploracion;
- Arcano/Misterio;
- Resistencia/Supervivencia.

Estos filtros no resuelven acciones. Solo muestran atributos, habilidades, rasgos e inventario que podrian importar para que el DM decida mejor.

Ejemplo: si el DM elige `Social`, puede ver rapidamente Presencia, Persuasion, Engaño, Intimidacion y rasgos relacionados.

## Dados y tiradas

Los jugadores pueden hacer:

- dados libres: d20, d12, d10, d8, d6, d4;
- consultas rapidas de atributo con d20.

Las tiradas quedan como anotacion para el DM. La app no dice si hubo exito o fallo.

## Salas activas y limpieza

La pantalla inicial muestra salas activas guardadas en Firebase. Desde ahi se puede:

- entrar como DM;
- abrir como tablero;
- borrar la sala.

El borrado elimina los datos de la sala:

- personajes;
- enemigos;
- NPCs;
- objetos;
- escena;
- tiradas;
- combate;
- notas asociadas.

Para borrar una sala se pide un codigo privado. Esto no es seguridad fuerte, porque la app es estatica, pero sirve como freno practico para uso personal.

## Firebase

La app usa Firebase Realtime Database para sincronizar los dispositivos.

Ruta usada:

```text
mesaArcana/rooms
```

Regla simple usada para este proyecto personal:

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

No hay login formal. Se asume uso privado entre amigos.

## Archivos principales

```text
index.html
```

Estructura de la pagina y vistas principales.

```text
styles.css
```

Estilos visuales, responsive y tarjetas.

```text
v3-ui.css y v3-ui.js
```

Presentacion visual organizada y apertura de controles contextuales del DM.

```text
app.js
```

Logica de salas, Firebase, ficha, DM, tablero, dados y entidades visibles.

```text
game-system.js
```

Datos centrales del sistema: atributos, habilidades, linajes, clases, trasfondos, rasgos, filtros del DM y biblioteca inicial.

```text
firebase-config.js
```

Configuracion de Firebase.

## Como correr localmente

Desde esta carpeta:

```powershell
py -3 -m http.server 4173 --directory "C:\Users\joaqu\OneDrive\Documentos\Juego de Roll digital"
```

Abrir:

```text
http://localhost:4173
```

## Que todavia no hace

Todavia no tiene:

- mapa complejo;
- tokens movibles;
- combate automatico;
- reglas cerradas de daño;
- inventario con reglas automaticas;
- login de usuarios;
- permisos por rol reales;
- historial profundo de sesiones;
- subida de imagenes;
- musica o ambiente;
- generador completo de campañas.

## Filosofia del proyecto

La regla principal es:

```text
La plataforma acompaña lo que el DM decide; no decide por el.
```

El DM narra, interpreta y resuelve. La app ayuda a mostrar, recordar, ordenar y modificar informacion durante la partida.

## Proximos avances sugeridos

1. Pulir visualmente la carta final del jugador en celular y tablet.
2. Mejorar la vista del tablero publico para TV/tablet.
3. Agregar tokens movibles simples.
4. Agregar tarjetas editables creadas por el DM.
5. Mejorar historial de escenas y notas.
6. Agregar export/import de salas o campañas.
