export const UGELS = [
  'UGEL 16: Barranca'
];

export const INSTITUTIONS = [
  '20480 SANTA CATALINA',
  '20503 JOSÉ C. MARIÁTEGUI',
  '20504 SAN JERÓNIMO',
  '20506 JOSÉ A. ENCINAS',
  '20519 VICTOR PINEDA',
  '20532 STMA. VIRGEN DEL CARMEN',
  '20854 JUAN VELASCO',
  '20889 VIRGEN DEL ROSARIO',
  '20892 VIRGEN DE LAS MERCEDES',
  '20987-2 HORACIO ZEVALLOS',
  '21571 RICARDO PALMA',
  '21572 MICAELA BASTIDAS',
  '21579 ROSA SOTO',
  '21581 DECISIÓN CAMPESINA',
  '21586 ANDRÉS AVELINO CÁCERES',
  '21606 FRANCISCO BOLOGNESI',
  'FE Y ALEGRIA 35',
  'FRANCISCO VIDAL',
  'GUILLERMO E. BILLINGHURST',
  'JOSÉ MARÍA ARGUEDAS',
  'JOSÉ OLAYA BALANDDRA',
  'JOSÉ PARDO Y BARREDA',
  'LIBERTADOR SIMON BOLIVAR',
  'PEDRO RUIZ GALLO',
  'RICARDINA LANEGRA',
  'VENTURA CCALAMAQUI',
  'MIGUEL GRAU',
  '20523 CORAZÓN DE JESÚS'
];

export const SECTIONS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'UNICA'
];

/**
 * Mapping of DNI to Institution information.
 * This is used for automatic identification of IE and id_ie during login.
 */
export const DNI_IE_MAP: Record<string, { ie: string, id_ie: string, nombre: string }> = {
  '12345678': { 
    nombre: 'ALVARADO RUIZ, Maria Jose', 
    ie: '20532 STMA. VIRGEN DEL CARMEN', 
    id_ie: '1234567' 
  },
  '87654321': { 
    nombre: 'CASTILLO VEGA, Luis Angel', 
    ie: '21571 RICARDO PALMA', 
    id_ie: '7654321' 
  },
  '11223344': { 
    nombre: 'DIAZ MORALES, Fatima', 
    ie: 'GUILLERMO E. BILLINGHURST', 
    id_ie: '1122334' 
  }
};

