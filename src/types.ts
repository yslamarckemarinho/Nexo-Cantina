export type PaymentMethod = 'a_prazo' | 'fiado' | 'pix' | 'dinheiro';

export type ProductCategory = 
  | 'Lanches'
  | 'Salgadinhos'
  | 'Biscoitos'
  | 'Doces'
  | 'Balas & Doces'
  | 'Snacks'
  | 'Chocolates'
  | 'Bebidas'
  | 'Sobremesas'
  | 'Geral';

export interface Product {
  id: string;
  code: number; // e.g. 1, 2, 3, 32
  name: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStockAlert: number;
  unit: string;
  category: ProductCategory;
  active: boolean;
  totalSold?: number;
}

export interface SaleItem {
  productId?: string;
  code?: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice?: number;
  isCustomValue?: boolean;
}

export interface Sale {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string; // DD/MM/YYYY
  formattedTime: string; // HH:mm:ss
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  totalAmount: number;
  totalCost: number;
  operatorName: string;
  receiptNumber: string;
  amountReceived?: number;
  changeGiven?: number;
}

export interface DebtItem {
  id: string;
  saleId?: string;
  timestamp: string;
  formattedDate: string;
  formattedTime: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isMoneyAdvance?: boolean; // Pegou Dinheiro (Saque / Adiantamento / Empréstimo)
  isPartialPayment?: boolean; // Abatimento parcial de saldo
  paid: boolean;
  paidAt?: string;
}

export interface Customer {
  id: string;
  name: string; // e.g. "Lucas Santos (3º ano)"
  parentName?: string;
  studentName?: string;
  grade?: string;
  phone?: string;
  consultationCode: string; // Unique code (e.g. "NEXO-301")
  notes?: string;
  items: DebtItem[];
  createdAt: string;
}

export interface CashMovement {
  id: string;
  timestamp: string;
  formattedTime: string;
  type: 'entrada' | 'saida' | 'abertura' | 'sangria' | 'suprimento' | 'quitacao_prazo' | 'quitacao_fiado';
  amount: number;
  description: string;
  operatorName: string;
  paymentMethod?: PaymentMethod;
}

export interface CashShift {
  id: string;
  date: string; // YYYY-MM-DD
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  isOpen: boolean;
  operator: string;
  closedByOperator?: string;
  closingBalanceExpected?: number;
  closingBalanceActual?: number;
  cashDifference?: number; // 0 = exato, >0 = sobra, <0 = falta
  closingNotes?: string;
  sentToEmailAt?: string;
  sentToEmailAddress?: string;
  methodTotals?: {
    pix: number;
    dinheiro: number;
    a_prazo: number;
    totalVendas: number;
    totalLucro?: number;
    totalSuprimentos: number;
    totalSangrias: number;
    salesCount: number;
  };
  movements: CashMovement[];
}

export interface CantinaTenant {
  id: string;
  subdomain: string;
  name: string; // e.g. "Cantina Centro Educacional Evoluir"
  schoolName: string; // e.g. "Centro Educacional Evoluir"
  ownerName?: string;
  email?: string;
  loginUsername?: string;
  phone?: string;
  password?: string;
  googleEmail?: string;
  institutionEmail?: string; // Gmail ou e-mail da Instituição / Direção / Financeiro
  instagramHandle?: string; // e.g. "@colegioevoluirjp"
  logoText?: string;
  logoUrl?: string; // Foto ou logotipo personalizado da cantina (Base64 / URL)
  pixKey: string;
  pixKeyType: 'CPF' | 'CNPJ' | 'Celular' | 'E-mail' | 'Aleatória';
  pixReceiverName: string;
  pin: string;
  operatorName: string;
  monthlyFee?: number; // Valor da mensalidade cobrada pelo sistema para esta cantina
  monthlyFeeDueDay?: number; // Dia de vencimento (ex: 5, 10, 15)
  monthlyFeeStatus?: 'paid' | 'pending' | 'overdue';
  status: 'active' | 'suspended' | 'maintenance';
  lastBackupAt?: string;
  autoBackupEnabled?: boolean;
  autoBackupIntervalMinutes?: number;
  lastAutoBackupAt?: string;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  shifts: CashShift[];
  createdAt: string;
}

export type WhatsAppProfileType = 'amigavel' | 'extrato' | 'fechamento' | 'so_pix';

export interface AuditSecurityLog {
  id: string;
  timestamp: string;
  cantinaId: string;
  cantinaName: string;
  action: string;
  ip: string;
  status: 'sucesso' | 'alerta' | 'bloqueado';
}

export interface DeviceProfile {
  id: string;
  name: string;
  role: string;
  cantina: string;
  action: string;
  status?: 'online' | 'synced' | 'busy' | 'offline';
  latencyMs?: number;
  lastPing?: string;
}

export interface TestResultItem {
  testId: string;
  title: string;
  description: string;
  status: 'PASSED' | 'FAILED' | 'RUNNING' | 'PENDING';
  latencyMs: number;
  details: string;
}

export interface TestSuiteResponse {
  success: boolean;
  executedAt: string;
  executionDurationMs: number;
  devicesCount: number;
  devices: DeviceProfile[];
  totalTests: number;
  passedCount: number;
  failedCount: number;
  overallStatus: string;
  tests: TestResultItem[];
}

export interface BackupSnapshot {
  id: string;
  cantinaId: string;
  cantinaName: string;
  timestamp: string;
  formattedTime: string;
  formattedDate: string;
  trigger: 'automatico' | 'turno_11h' | 'turno_17h' | 'fechamento_caixa' | 'manual';
  productsCount: number;
  customersCount: number;
  salesCount: number;
  shiftsCount: number;
  totalPendingFiado: number;
  sizeBytes: number;
  data: CantinaTenant;
}

