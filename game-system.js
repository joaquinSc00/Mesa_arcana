window.MESA_ARCANA_SYSTEM = {
  attributes: [
    { key: "fuerza", name: "Fuerza", hint: "Golpes, cargar peso, romper cosas y armas pesadas.", uses: ["romper", "cargar", "intimidar", "atacar_cuerpo"] },
    { key: "agilidad", name: "Agilidad", hint: "Esquivar, moverse, trepar, sigilo y reflejos.", uses: ["sigilo", "trepar", "robar", "arqueria", "iniciativa"] },
    { key: "resistencia", name: "Resistencia", hint: "Vida, aguante, veneno, cansancio y heridas.", uses: ["vida", "veneno", "fatiga", "resistir_golpe"] },
    { key: "intelecto", name: "Intelecto", hint: "Logica, conocimiento, investigacion, estrategia y runas.", uses: ["investigar", "runas", "trampas", "medicina"] },
    { key: "voluntad", name: "Voluntad", hint: "Miedo, concentracion, resistencia mental y corrupcion.", uses: ["miedo", "concentracion", "corrupcion", "apoyo"] },
    { key: "presencia", name: "Presencia", hint: "Persuasion, mando, engaño, intimidacion y liderazgo.", uses: ["persuadir", "engañar", "intimidar", "liderar"] },
    { key: "percepcion", name: "Percepcion", hint: "Rastros, trampas, secretos, enemigos ocultos y mentiras.", uses: ["detectar", "rastrear", "buscar", "iniciativa"] },
    { key: "afinidad", name: "Afinidad magica", hint: "Mana, conjuros, puertas magicas y sensibilidad sobrenatural.", uses: ["conjurar", "puertas_magicas", "rituales", "sensibilidad"] }
  ],

  skills: [
    { key: "melee", name: "Armas cuerpo a cuerpo", attributes: ["fuerza"], category: "combate" },
    { key: "archery", name: "Arqueria", attributes: ["agilidad"], category: "combate" },
    { key: "defense", name: "Defensa", attributes: ["agilidad", "resistencia"], category: "combate" },
    { key: "stealth", name: "Sigilo", attributes: ["agilidad"], category: "sigilo" },
    { key: "locks", name: "Cerraduras y trampas", attributes: ["agilidad", "intelecto"], category: "sigilo" },
    { key: "survival", name: "Supervivencia", attributes: ["percepcion", "resistencia"], category: "exploracion" },
    { key: "tracking", name: "Rastreo", attributes: ["percepcion"], category: "exploracion" },
    { key: "medicine", name: "Medicina", attributes: ["intelecto", "voluntad"], category: "apoyo" },
    { key: "persuasion", name: "Persuasion", attributes: ["presencia"], category: "social" },
    { key: "intimidation", name: "Intimidacion", attributes: ["presencia", "fuerza"], category: "social" },
    { key: "deception", name: "Engaño", attributes: ["presencia"], category: "social" },
    { key: "investigation", name: "Investigacion", attributes: ["intelecto", "percepcion"], category: "exploracion" },
    { key: "arcana", name: "Conocimiento arcano", attributes: ["intelecto", "afinidad"], category: "misterio" },
    { key: "fine_perception", name: "Percepcion fina", attributes: ["percepcion"], category: "exploracion" },
    { key: "concentration", name: "Concentracion", attributes: ["voluntad", "afinidad"], category: "misterio" }
  ],

  traits: {
    adaptable: { name: "Adaptable", bonus: 1, appliesTo: ["any"], description: "Puede justificar una pequeña ventaja cuando improvisa." },
    ancient_blood: { name: "Sangre antigua", bonus: 1, appliesTo: ["arcana", "concentration"], description: "Resuena con magia vieja, runas y pactos." },
    stone_endurance: { name: "Aguante de piedra", bonus: 1, appliesTo: ["defense", "survival"], description: "Soporta castigo, cansancio y terreno hostil." },
    quick_hand: { name: "Mano rapida", bonus: 1, appliesTo: ["stealth", "locks"], description: "Dedos veloces para sustraer, abrir o esconder." },
    metal_mind: { name: "Mente metalica", bonus: 1, appliesTo: ["investigation", "arcana"], description: "Procesa patrones, mecanismos y enigmas con calma." },
    shield_stance: { name: "Postura de escudo", bonus: 1, appliesTo: ["defense", "melee"], description: "Sabe sostener una linea bajo presion." },
    spell_focus: { name: "Foco de conjuro", bonus: 1, appliesTo: ["arcana", "concentration"], description: "Canaliza poder sin dispersarlo." },
    street_shadow: { name: "Sombra callejera", bonus: 1, appliesTo: ["stealth", "deception", "locks"], description: "Se mueve bien entre miradas y callejones." },
    steady_voice: { name: "Voz firme", bonus: 1, appliesTo: ["persuasion", "intimidation"], description: "Su palabra pesa cuando todos dudan." },
    field_craft: { name: "Oficio de campo", bonus: 1, appliesTo: ["survival", "tracking", "medicine"], description: "Aprendio a resolver problemas con poco." },
    fallen_noble: { name: "Noble caido", bonus: 1, appliesTo: ["persuasion", "deception"], description: "Conoce modales, favores y mentiras de salon." },
    old_debt: { name: "Deuda antigua", bonus: 1, appliesTo: ["persuasion", "investigation"], description: "A veces alguien debe una respuesta o una puerta abierta." },
    survivor: { name: "Superviviente", bonus: 1, appliesTo: ["survival", "defense"], description: "Sabe seguir de pie cuando la escena se rompe." }
  },

  lineages: {
    human: { name: "Humano", bonuses: { fuerza: 1, agilidad: 1, resistencia: 1, intelecto: 1, voluntad: 1, presencia: 1, percepcion: 1, afinidad: 1 }, skills: ["persuasion"], traits: ["adaptable"], affinities: ["social", "exploracion"] },
    elf: { name: "Elfo astral", bonuses: { agilidad: 2, intelecto: 1, voluntad: 1, percepcion: 1, afinidad: 2 }, skills: ["arcana", "fine_perception"], traits: ["ancient_blood"], affinities: ["misterio", "exploracion"] },
    dwarf: { name: "Enano ferrico", bonuses: { fuerza: 2, resistencia: 2, intelecto: 1, voluntad: 1 }, skills: ["defense"], traits: ["stone_endurance"], affinities: ["combate", "apoyo"] },
    spark_goblin: { name: "Duende de chispa", bonuses: { agilidad: 2, intelecto: 1, presencia: 1, percepcion: 1, afinidad: 1 }, skills: ["stealth", "locks"], traits: ["quick_hand"], affinities: ["sigilo", "misterio"] },
    starforged: { name: "Forjado estelar", bonuses: { fuerza: 1, resistencia: 1, intelecto: 2, voluntad: 1, afinidad: 2 }, skills: ["investigation"], traits: ["metal_mind"], affinities: ["misterio", "combate"] }
  },

  classes: {
    guardian: { name: "Guardian", bonuses: { fuerza: 2, resistencia: 2, voluntad: 1 }, hpBase: 18, manaBase: 2, skills: ["melee", "defense"], traits: ["shield_stance"], recommended: ["fuerza", "resistencia"] },
    arcanist: { name: "Arcanista", bonuses: { intelecto: 2, voluntad: 1, afinidad: 3 }, hpBase: 9, manaBase: 14, skills: ["arcana", "concentration"], traits: ["spell_focus"], recommended: ["intelecto", "afinidad"] },
    shadow: { name: "Sombra", bonuses: { agilidad: 3, percepcion: 1, presencia: 1 }, hpBase: 11, manaBase: 4, skills: ["stealth", "locks"], traits: ["street_shadow"], recommended: ["agilidad", "percepcion"] },
    ranger: { name: "Explorador", bonuses: { agilidad: 1, resistencia: 1, percepcion: 2, voluntad: 1 }, hpBase: 14, manaBase: 5, skills: ["tracking", "survival"], traits: ["field_craft"], recommended: ["percepcion", "resistencia"] },
    envoy: { name: "Embajador", bonuses: { intelecto: 1, voluntad: 1, presencia: 3 }, hpBase: 10, manaBase: 6, skills: ["persuasion", "deception"], traits: ["steady_voice"], recommended: ["presencia", "intelecto"] },
    technomancer: { name: "Tecnomante", bonuses: { intelecto: 3, afinidad: 2, percepcion: 1 }, hpBase: 12, manaBase: 10, skills: ["investigation", "arcana"], traits: ["metal_mind"], recommended: ["intelecto", "afinidad"] }
  },

  backgrounds: {
    fallen_noble: { name: "Noble caido", skills: ["persuasion"], traits: ["fallen_noble"], description: "Perdio nombre, casa o privilegio, pero conserva modales y contactos." },
    mercenary: { name: "Mercenario", skills: ["melee"], traits: ["survivor"], description: "Aprendio a cobrar, resistir y medir riesgos." },
    arcane_apprentice: { name: "Aprendiz arcano", skills: ["arcana"], traits: ["spell_focus"], description: "Estudio formulas incompletas y secretos peligrosos." },
    fugitive: { name: "Fugitivo", skills: ["stealth"], traits: ["street_shadow"], description: "Sabe desaparecer antes de que hagan preguntas." },
    artisan: { name: "Artesano", skills: ["investigation"], traits: ["metal_mind"], description: "Entiende herramientas, materiales y mecanismos." },
    wanderer: { name: "Errante", skills: ["survival"], traits: ["field_craft"], description: "Sobrevivio a caminos largos y mapas mentirosos." },
    old_debt: { name: "Deuda antigua", skills: ["deception"], traits: ["old_debt"], description: "Alguien, en algun lugar, todavia le debe algo." }
  },

  dmAidCategories: [
    { key: "social", name: "Social", attributes: ["presencia", "intelecto"], skills: ["persuasion", "deception", "intimidation"] },
    { key: "exploracion", name: "Exploracion", attributes: ["percepcion", "intelecto"], skills: ["investigation", "fine_perception", "tracking", "survival"] },
    { key: "fisica", name: "Fisica", attributes: ["fuerza", "agilidad", "resistencia"], skills: ["survival", "defense"] },
    { key: "misterio", name: "Magia y misterio", attributes: ["afinidad", "intelecto", "voluntad"], skills: ["arcana", "concentration"] },
    { key: "sigilo", name: "Sigilo y robo", attributes: ["agilidad", "intelecto"], skills: ["stealth", "locks"] },
    { key: "combate", name: "Combate basico", attributes: ["fuerza", "agilidad", "resistencia"], skills: ["melee", "archery", "defense"] },
    { key: "apoyo", name: "Sanacion y apoyo", attributes: ["intelecto", "voluntad", "presencia"], skills: ["medicine", "survival"] }
  ],

  cardLibrary: {
    enemies: [
      { name: "Rata de cripta", type: "Bestia", threat: "baja", hp: 6, stats: { fuerza: 2, agilidad: 6, resistencia: 3, percepcion: 5 }, description: "Pequeña, rapida y atraida por sangre fresca.", notes: "Buena para emboscadas simples." },
      { name: "Bandido cansado", type: "Humanoide", threat: "baja", hp: 10, stats: { fuerza: 5, agilidad: 5, resistencia: 4, percepcion: 4 }, description: "Mas desesperado que valiente.", notes: "Puede rendirse si la escena se inclina mal." },
      { name: "Esqueleto oxidado", type: "No muerto", threat: "baja", hp: 9, stats: { fuerza: 4, agilidad: 3, resistencia: 5, percepcion: 2, afinidad: 1 }, description: "Restos animados por magia vieja.", notes: "Fragil pero no siente miedo." },
      { name: "Duende saqueador", type: "Humanoide", threat: "baja", hp: 8, stats: { fuerza: 3, agilidad: 7, resistencia: 3, percepcion: 6 }, description: "Ataca si tiene ventaja y huye si queda solo.", notes: "Puede conocer atajos." },
      { name: "Lobo de bruma", type: "Bestia", threat: "baja", hp: 12, stats: { fuerza: 5, agilidad: 7, resistencia: 4, percepcion: 7 }, description: "Caza entre niebla baja y sombras largas.", notes: "Usar en grupos de dos." },
      { name: "Mercenario de hierro", type: "Humanoide", threat: "media", hp: 22, stats: { fuerza: 8, agilidad: 5, resistencia: 8, percepcion: 5 }, description: "Soldado pagado, disciplinado y pragmatica.", notes: "Protege a quien le paga." },
      { name: "Acolito lunar", type: "Cultista", threat: "media", hp: 18, stats: { fuerza: 3, agilidad: 4, resistencia: 5, percepcion: 6, afinidad: 8 }, description: "Canaliza rituales menores y palabras extrañas.", notes: "Puede abrir una puerta o apagar luces." },
      { name: "Araña de vidrio", type: "Bestia arcana", threat: "media", hp: 20, stats: { fuerza: 5, agilidad: 8, resistencia: 5, percepcion: 7, afinidad: 4 }, description: "Cuerpo translucido, patas afiladas y paciencia.", notes: "Ideal para techos y pasillos." },
      { name: "Caballero hueco", type: "Armadura", threat: "media", hp: 26, stats: { fuerza: 8, agilidad: 3, resistencia: 9, percepcion: 3, afinidad: 3 }, description: "Armadura vacia movida por juramento roto.", notes: "Lento, frontal, imponente." },
      { name: "Cazador de reliquias", type: "Humanoide", threat: "media", hp: 19, stats: { fuerza: 5, agilidad: 8, resistencia: 5, percepcion: 8 }, description: "Busca objetos raros y no pelea limpio.", notes: "Puede negociar si gana algo." },
      { name: "Dragon menor ceniciento", type: "Dragon", threat: "alta", hp: 48, stats: { fuerza: 12, agilidad: 8, resistencia: 11, percepcion: 9, afinidad: 7 }, description: "Joven, arrogante y cubierto de escamas grises.", notes: "No regalar victoria automatica; narrar consecuencias." },
      { name: "Bruja de sal", type: "Hechicera", threat: "alta", hp: 34, stats: { fuerza: 3, agilidad: 5, resistencia: 7, percepcion: 9, afinidad: 12 }, description: "Vende favores que siempre cobran intereses.", notes: "Mejor como amenaza social y arcana." },
      { name: "Golem fracturado", type: "Constructo", threat: "alta", hp: 55, stats: { fuerza: 13, agilidad: 2, resistencia: 14, percepcion: 4, afinidad: 6 }, description: "Obedece ordenes antiguas a medias.", notes: "Sus grietas pueden ser pista." },
      { name: "Señor de espinas", type: "Fae oscuro", threat: "alta", hp: 40, stats: { fuerza: 8, agilidad: 10, resistencia: 8, percepcion: 11, afinidad: 10 }, description: "Elegante, cruel y dueño de promesas ambiguas.", notes: "Perfecto para pactos." },
      { name: "Vigilia sin rostro", type: "Entidad", threat: "alta", hp: 42, stats: { fuerza: 6, agilidad: 8, resistencia: 9, percepcion: 13, afinidad: 12 }, description: "Observa desde reflejos y recuerdos ajenos.", notes: "Usar como misterio antes que golpe directo." }
    ],
    npcs: [
      { name: "Mara Vandel", role: "Posadera", attitude: "Amable con reservas", description: "Escucha mas de lo que habla.", secrets: "Sabe quien entro al pueblo de noche.", stats: { presencia: 6, percepcion: 7 } },
      { name: "Orik Bram", role: "Herrero", attitude: "Seco pero justo", description: "Tiene manos quemadas por metal extraño.", secrets: "Reparo una llave que no era de este mundo.", stats: { fuerza: 8, resistencia: 7, intelecto: 5 } },
      { name: "Selene Arq", role: "Archivista", attitude: "Curiosa", description: "Conoce mapas, runas y nombres olvidados.", secrets: "Oculta paginas arrancadas de un grimorio.", stats: { intelecto: 8, afinidad: 6 } },
      { name: "Nim", role: "Mensajero", attitude: "Nervioso", description: "Va y viene por callejones imposibles.", secrets: "Vio al guardia vender una llave.", stats: { agilidad: 8, percepcion: 7 } },
      { name: "Capitana Ivara", role: "Guardia", attitude: "Autoritaria", description: "Prioriza orden antes que justicia.", secrets: "Esta presionada por una deuda politica.", stats: { presencia: 8, fuerza: 7, percepcion: 6 } }
    ],
    objects: [
      { name: "Monedas", type: "Recompensa", description: "Bolsa, cofre pequeño o pago improvisado.", notes: "Cantidad decidida por el DM." },
      { name: "Arma", type: "Equipo", description: "Carta generica para espada, arco, daga o arma rara.", notes: "Definir detalles en mesa." },
      { name: "Pocion", type: "Consumible", description: "Frasco de efecto util, dudoso o peligroso.", notes: "El DM decide efecto y dosis." },
      { name: "Llave", type: "Acceso", description: "Abre algo, simbolicamente o literalmente.", notes: "Puede ser pista, permiso o trampa." },
      { name: "Puerta oculta", type: "Escena", description: "Entrada secreta, pared falsa o sello camuflado.", notes: "Mostrar cuando el DM quiera revelarla." },
      { name: "Cofre", type: "Contenedor", description: "Puede contener recompensa, pista o problema.", notes: "No abrir automaticamente." },
      { name: "Pergamino", type: "Pista", description: "Mensaje, mapa, contrato, hechizo o advertencia.", notes: "Texto manual por el DM." },
      { name: "Objeto magico", type: "Misterio", description: "Reliquia menor, foco arcano o artefacto raro.", notes: "Efecto sin automatizar." },
      { name: "Trampa", type: "Peligro", description: "Mecanismo, runa, veneno o alarma.", notes: "El DM decide activacion y consecuencia." },
      { name: "Reliquia", type: "Historia", description: "Objeto importante para la aventura.", notes: "Puede no tener uso mecanico inmediato." }
    ]
  },

  baseAttribute: 4,
  freeAttributePoints: 10,
  freeSkillPoints: 4,
  skillTrainingBonus: 2,
  difficultyTargets: { baja: 10, media: 14, alta: 18, variable: null }
};
