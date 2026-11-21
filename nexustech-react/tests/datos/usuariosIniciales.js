// ============================================================
// NexusTech - Datos de prueba: usuarios (los mismos del backend)
// Las claves van en texto plano solo para que el servidor falso de
// las pruebas valide el login; el backend real las guarda con BCrypt.
// ============================================================

export const usuariosIniciales = [
  {
    run: '190110222',
    nombre: 'Admin',
    apellidos: 'NexusTech',
    correo: 'admin@duoc.cl',
    clave: 'admin123',
    fechaNacimiento: '',
    tipo: 'Administrador',
    region: 'Región Metropolitana',
    comuna: 'Santiago',
    direccion: 'Av. Principal 1234',
  },
  {
    run: '123456785',
    nombre: 'Valentina',
    apellidos: 'Rojas Muñoz',
    correo: 'vendedor@duoc.cl',
    clave: 'vende123',
    fechaNacimiento: '1998-04-12',
    tipo: 'Vendedor',
    region: 'Región de Valparaíso',
    comuna: 'Viña del Mar',
    direccion: 'Calle Valparaíso 456',
  },
  {
    run: '21456789K',
    nombre: 'Pedro',
    apellidos: 'Soto Fuentes',
    correo: 'cliente@gmail.com',
    clave: 'cliente123',
    fechaNacimiento: '2002-09-30',
    tipo: 'Cliente',
    region: 'Región Metropolitana',
    comuna: 'Providencia',
    direccion: 'Los Crisantemos 789, Edificio Norte',
  },
];
