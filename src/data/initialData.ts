import { CantinaTenant, Product, Customer, Sale, AuditSecurityLog } from '../types';

// Template limpo de produtos básicos sugeridos para agilizar o início (opcional)
export const DEFAULT_STARTER_PRODUCTS: Product[] = [
  { id: 'p1', code: 1, name: 'Salgados Diversos', costPrice: 2.00, salePrice: 4.00, stock: 20, minStockAlert: 5, unit: 'un', category: 'Lanches', active: true, totalSold: 0 },
  { id: 'p2', code: 2, name: 'Salgadinho Pippos', costPrice: 1.50, salePrice: 3.00, stock: 20, minStockAlert: 5, unit: 'un', category: 'Salgadinhos', active: true, totalSold: 0 },
  { id: 'p3', code: 3, name: 'Pipoca', costPrice: 1.00, salePrice: 2.50, stock: 20, minStockAlert: 5, unit: 'un', category: 'Salgadinhos', active: true, totalSold: 0 },
  { id: 'p4', code: 4, name: 'Doritos', costPrice: 2.00, salePrice: 3.50, stock: 20, minStockAlert: 5, unit: 'un', category: 'Salgadinhos', active: true, totalSold: 0 },
  { id: 'p5', code: 5, name: 'Biscoito Recheado', costPrice: 1.80, salePrice: 3.50, stock: 20, minStockAlert: 5, unit: 'un', category: 'Biscoitos', active: true, totalSold: 0 },
  { id: 'p6', code: 6, name: 'Bolinho', costPrice: 1.20, salePrice: 2.50, stock: 20, minStockAlert: 5, unit: 'un', category: 'Doces', active: true, totalSold: 0 },
  { id: 'p7', code: 7, name: 'Suco Del Valle', costPrice: 2.00, salePrice: 3.50, stock: 20, minStockAlert: 5, unit: 'un', category: 'Bebidas', active: true, totalSold: 0 },
  { id: 'p8', code: 8, name: 'Água Mineral 500ml', costPrice: 1.00, salePrice: 2.50, stock: 30, minStockAlert: 5, unit: 'un', category: 'Bebidas', active: true, totalSold: 0 },
];

export const INITIAL_CANTINAS: CantinaTenant[] = [
  {
    id: 'cantina_nexo_matriz',
    subdomain: 'nexo_matriz',
    name: 'Nexo Cantinas - Unidade Principal',
    schoolName: 'Nexo Cantinas',
    ownerName: 'Administrador Nexo',
    email: 'admin@nexocantinas.com',
    institutionEmail: 'direcao.escola@gmail.com',
    loginUsername: 'admin',
    phone: '',
    password: '1234',
    instagramHandle: '@nexocantinas',
    logoText: 'NEXO',
    pixKey: '',
    pixKeyType: 'Celular',
    pixReceiverName: 'Nexo Cantinas',
    pin: '1234',
    operatorName: 'admin',
    status: 'active',
    lastBackupAt: undefined,
    products: DEFAULT_STARTER_PRODUCTS,
    customers: [], // Começa do zero, sem nenhum aluno/fiado fictício
    sales: [],     // Começa do zero, sem vendas fictícias
    shifts: [],    // Começa do zero
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_SECURITY_LOGS: AuditSecurityLog[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    cantinaId: 'cantina_nexo_matriz',
    cantinaName: 'Nexo Cantinas',
    action: 'Sistema Nexo Cantinas inicializado com sucesso',
    ip: '127.0.0.1',
    status: 'sucesso'
  }
];
