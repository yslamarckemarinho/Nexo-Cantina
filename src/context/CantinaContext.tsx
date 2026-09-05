import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  CantinaTenant, 
  Product, 
  Customer, 
  Sale, 
  SaleItem, 
  DebtItem, 
  PaymentMethod, 
  CashMovement, 
  CashShift, 
  AuditSecurityLog,
  TestSuiteResponse,
  BackupSnapshot
} from '../types';
import { INITIAL_CANTINAS, INITIAL_SECURITY_LOGS, DEFAULT_STARTER_PRODUCTS } from '../data/initialData';
import confetti from 'canvas-confetti';
import { exportSnapshotSpreadsheet } from '../utils/exportHelpers';

interface CantinaContextType {
  cantinas: CantinaTenant[];
  activeCantina: CantinaTenant | null;
  activeCantinaId: string;
  isAuthenticated: boolean;
  operatorName: string;
  isMasterMode: boolean;
  activeTab: 'pdv' | 'fiados' | 'estoque' | 'caixa' | 'backup' | 'master';
  securityLogs: AuditSecurityLog[];
  masterPasswordConfigured: boolean;
  activeDeviceId: string;
  connectedDevicesCount: number;
  
  // Navigation & Auth
  setActiveTab: (tab: 'pdv' | 'fiados' | 'estoque' | 'caixa' | 'backup' | 'master') => void;
  smartLogin: (identifier: string, passwordOrPin: string) => { success: boolean; isMaster?: boolean; error?: string; cantina?: CantinaTenant };
  login: (subdomainOrId: string, pin: string, operator: string) => { success: boolean; error?: string };
  logout: () => void;
  enterMasterControlRoom: (password: string) => { success: boolean; error?: string };
  exitMasterControlRoom: () => void;
  updateMasterPassword: (currentPass: string, newPass: string) => { success: boolean; message: string };
  switchCantina: (cantinaId: string) => void;
  run10DevicesTestSuite: () => Promise<TestSuiteResponse>;
  
  // PDV & Sales
  processSale: (params: {
    paymentMethod: PaymentMethod;
    items: SaleItem[];
    customerId?: string;
    customerName?: string;
    amountReceived?: number;
    changeGiven?: number;
  }) => Sale;
  cancelSale: (saleId: string) => { success: boolean; message: string };
  
  // Fiados & Customers
  addCustomer: (data: {
    name: string;
    parentName?: string;
    studentName?: string;
    grade?: string;
    phone?: string;
  }) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  deleteCustomerDebtItem: (customerId: string, debtItemId: string) => { success: boolean; message: string };
  addDebtToCustomer: (customerId: string, items: { name: string; quantity: number; unitPrice: number }[]) => void;
  addMoneyAdvanceToCustomer: (customerId: string, amount: number, note?: string) => void;
  settleCustomerDebtItem: (customerId: string, debtItemId: string, paymentMethod?: PaymentMethod) => void;
  abateCustomerDebtPartial: (customerId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => void;
  settleCustomerAllDebts: (customerId: string, paymentMethod: PaymentMethod) => void;
  
  // Stock Management
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustProductStock: (id: string, delta: number) => void;
  loadStarterProductsToActiveCantina: () => void;
  
  // Cash Flow
  openCashShift: (openingBalance: number) => void;
  closeCurrentShift: (closingData?: {
    closingBalanceActual?: number;
    closingBalanceExpected?: number;
    closingNotes?: string;
    sentToEmailAddress?: string;
    methodTotals?: {
      pix: number;
      dinheiro: number;
      cartao: number;
      a_prazo: number;
      totalVendas: number;
      totalLucro?: number;
      totalSuprimentos: number;
      totalSangrias: number;
      salesCount: number;
    };
  }) => CashShift | null;
  markShiftEmailSent: (shiftId: string, emailAddress: string) => void;
  addCashMovement: (type: 'entrada' | 'saida' | 'sangria' | 'suprimento', amount: number, description: string, paymentMethod?: PaymentMethod) => void;
  
  // Cantina Settings & Backup
  updateCantinaSettings: (data: Partial<CantinaTenant>) => void;
  updateCurrentOperator: (name: string) => void;
  exportBackupJSON: () => void;
  exportSalesCSV: () => void;
  restoreFromJSON: (jsonContent: string) => { success: boolean; message: string };
  resetSystemToZero: () => void;

  // Auto Backup System
  autoBackupSnapshots: BackupSnapshot[];
  triggerManualBackup: (triggerLabel?: string) => Promise<BackupSnapshot | null>;
  restoreFromSnapshot: (snapshotId: string) => Promise<{ success: boolean; message: string }>;
  downloadSnapshotJSON: (snapshot: BackupSnapshot) => void;
  toggleAutoBackup: (enabled: boolean) => void;
  
  // Master Admin operations
  createCantinaTenant: (data: { 
    name: string; 
    schoolName: string; 
    subdomain?: string;
    ownerName?: string;
    email?: string;
    loginUsername?: string;
    phone?: string;
    password?: string;
    pin?: string; 
    pixKey?: string; 
    monthlyFee?: number;
    monthlyFeeDueDay?: number;
  }) => CantinaTenant;
  updateCantinaStatus: (cantinaId: string, status: 'active' | 'suspended' | 'maintenance') => void;
  deleteCantinaTenant: (cantinaId: string) => void;
  resetCantinaPassword: (cantinaId: string, newPasswordOrPin: string) => { success: boolean; message: string };
  updateCantinaFinancialPlan: (cantinaId: string, monthlyFee: number, dueDay?: number, status?: 'paid' | 'pending' | 'overdue') => void;
  impersonateCantina: (cantinaId: string) => void;
  lookupStudentByCode: (code: string) => { customer: Customer; cantina: CantinaTenant } | null;
}

const STORAGE_KEY_CANTINAS = 'nexo_cantinas_tenants_v2';
const STORAGE_KEY_MASTER_PASS = 'nexo_cantinas_master_pass_v1';
const SESSION_KEY_ACTIVE_ID = 'nexo_session_active_id_v2';
const SESSION_KEY_AUTH = 'nexo_session_auth_v2';
const SESSION_KEY_DEVICE_ID = 'nexo_session_device_id_v2';
const DEFAULT_MASTER_PASS = 'r88282810r';

const CantinaContext = createContext<CantinaContextType | undefined>(undefined);

export const CantinaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDeviceId] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY_DEVICE_ID);
      if (saved) return saved;
      const newId = `dev-${Math.random().toString(36).substring(2, 8)}-${Date.now().toString(36).slice(-4)}`;
      sessionStorage.setItem(SESSION_KEY_DEVICE_ID, newId);
      return newId;
    } catch (e) {
      return `dev-${Date.now()}`;
    }
  });

  const [connectedDevicesCount, setConnectedDevicesCount] = useState<number>(1);
  const syncLockRef = useRef<boolean>(false);

  const [masterPassword, setMasterPassword] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MASTER_PASS);
      if (saved && saved.trim().length >= 3) {
        return saved.trim();
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_MASTER_PASS;
  });

  const [cantinas, setCantinas] = useState<CantinaTenant[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CANTINAS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load cantinas from localStorage:', e);
    }
    return INITIAL_CANTINAS;
  });

  // Tab-isolated active cantina ID (sessionStorage ensures multiple tabs can run different canteens simultaneously)
  const [activeCantinaId, setActiveCantinaId] = useState<string>(() => {
    try {
      const sessionSaved = sessionStorage.getItem(SESSION_KEY_ACTIVE_ID);
      if (sessionSaved) return sessionSaved;
      const localSaved = localStorage.getItem('nexo_cantinas_active_id_v2');
      if (localSaved) return localSaved;
    } catch (e) {
      // ignore
    }
    return INITIAL_CANTINAS[0]?.id || 'cantina_nexo_matriz';
  });

  // Tab-isolated authentication state
  const [authData, setAuthData] = useState<{
    isAuthenticated: boolean;
    operatorName: string;
    isMasterMode: boolean;
  }>(() => {
    try {
      const sessionSaved = sessionStorage.getItem(SESSION_KEY_AUTH);
      if (sessionSaved) {
        const parsed = JSON.parse(sessionSaved);
        return {
          isAuthenticated: parsed.isAuthenticated || false,
          operatorName: parsed.operatorName || '',
          isMasterMode: parsed.isMasterMode || false,
        };
      }
      const localSaved = localStorage.getItem('nexo_cantinas_auth_v2');
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        return {
          isAuthenticated: parsed.isAuthenticated || false,
          operatorName: parsed.operatorName || '',
          isMasterMode: parsed.isMasterMode || false,
        };
      }
    } catch (e) {
      // ignore
    }
    return {
      isAuthenticated: false,
      operatorName: '',
      isMasterMode: false,
    };
  });

  const [activeTab, setActiveTab] = useState<'pdv' | 'fiados' | 'estoque' | 'caixa' | 'backup' | 'master'>('pdv');
  const [securityLogs, setSecurityLogs] = useState<AuditSecurityLog[]>(INITIAL_SECURITY_LOGS);

  // Auto-backup snapshots list
  const [autoBackupSnapshots, setAutoBackupSnapshots] = useState<BackupSnapshot[]>(() => {
    try {
      const stored = localStorage.getItem(`nexo_snapshots_${activeCantinaId}`);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore
    }
    return [];
  });

  // Load and refresh snapshots when active canteen changes
  useEffect(() => {
    if (!activeCantinaId) return;
    try {
      const stored = localStorage.getItem(`nexo_snapshots_${activeCantinaId}`);
      if (stored) {
        setAutoBackupSnapshots(JSON.parse(stored));
      } else {
        setAutoBackupSnapshots([]);
      }
    } catch (e) {
      setAutoBackupSnapshots([]);
    }

    // Also fetch server snapshots for this canteen
    fetch(`/api/backups?cantinaId=${activeCantinaId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.backups && Array.isArray(data.backups)) {
          setAutoBackupSnapshots(prev => {
            const map = new Map<string, BackupSnapshot>();
            data.backups.forEach((b: BackupSnapshot) => map.set(b.id, b));
            prev.forEach(b => map.set(b.id, b));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          });
        }
      })
      .catch(() => {});
  }, [activeCantinaId]);

  // Sync global database to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CANTINAS, JSON.stringify(cantinas));
    } catch (e) {
      console.error('Erro ao salvar cantinas:', e);
    }
  }, [cantinas]);

  // Sync tab session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY_ACTIVE_ID, activeCantinaId);
    } catch (e) {
      // ignore
    }
  }, [activeCantinaId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY_AUTH, JSON.stringify(authData));
    } catch (e) {
      // ignore
    }
  }, [authData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MASTER_PASS, masterPassword);
    } catch (e) {
      // ignore
    }
  }, [masterPassword]);

  // Sync to Cloud Server API for multi-device & multi-tab synchronization
  useEffect(() => {
    const syncToServer = async () => {
      try {
        const res = await fetch('/api/cantinas/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cantinas,
            deviceId: activeDeviceId,
            cantinaId: activeCantinaId,
            operatorName: authData.operatorName || 'Operador',
            role: authData.isMasterMode ? 'Master Admin' : 'PDV Caixa',
            deviceLabel: `Dispositivo (${activeDeviceId.slice(-4).toUpperCase()})`
          })
        });
        const data = await res.json();
        if (data && data.connectedDevicesCount) {
          setConnectedDevicesCount(data.connectedDevicesCount);
        }
      } catch (e) {
        // network sync failed silently in offline mode
      }
    };

    const timer = setTimeout(syncToServer, 300);
    return () => clearTimeout(timer);
  }, [cantinas, activeDeviceId, activeCantinaId, authData]);

  // Background polling from Cloud Server API for real-time changes across 10 devices
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (syncLockRef.current) return;
      try {
        const res = await fetch('/api/cantinas');
        const data = await res.json();
        if (data && data.cantinas && Array.isArray(data.cantinas) && data.cantinas.length > 0) {
          setCantinas(prev => {
            const currentStr = JSON.stringify(prev);
            const serverStr = JSON.stringify(data.cantinas);
            if (currentStr !== serverStr) {
              return data.cantinas;
            }
            return prev;
          });
        }
      } catch (e) {
        // offline or silent
      }
    }, 3500);

    return () => clearInterval(pollInterval);
  }, []);

  // Listen to storage events from other tabs to sync database without altering this tab's login session
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_CANTINAS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setCantinas(parsed);
          }
        } catch (err) {
          // ignore
        }
      }
      if (e.key === STORAGE_KEY_MASTER_PASS && e.newValue) {
        setMasterPassword(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const run10DevicesTestSuite = async (): Promise<TestSuiteResponse> => {
    try {
      const res = await fetch('/api/test-suite/run-10-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executedBy: authData.operatorName || 'Master Admin' })
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      throw new Error(e.message || 'Falha ao executar bateria de testes dos 10 aparelhos.');
    }
  };

  const activeCantina = cantinas.find(c => c.id === activeCantinaId) || cantinas[0] || null;

  const logSecurityAction = (action: string, cantinaName: string, status: 'sucesso' | 'alerta' | 'bloqueado' = 'sucesso') => {
    const newLog: AuditSecurityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      cantinaId: activeCantinaId,
      cantinaName,
      action,
      ip: '177.136.' + Math.floor(Math.random() * 200 + 10) + '.' + Math.floor(Math.random() * 200 + 10),
      status
    };
    setSecurityLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  const enterMasterControlRoom = (password: string) => {
    if (password.trim() === masterPassword) {
      setAuthData({
        isAuthenticated: true,
        operatorName: 'Master Admin',
        isMasterMode: true,
      });
      setActiveTab('master');
      logSecurityAction('Acesso Master concedido com sucesso', 'Sala de Controle Global', 'sucesso');
      return { success: true };
    }
    logSecurityAction('Tentativa não autorizada na Sala de Controle Master', 'Sala de Controle Global', 'bloqueado');
    return { success: false, error: 'Senha Master incorreta.' };
  };

  const updateMasterPassword = (currentPass: string, newPass: string) => {
    if (currentPass.trim() !== masterPassword) {
      logSecurityAction('Tentativa falha de alteração da Senha Master (senha atual incorreta)', 'Sala de Controle Global', 'bloqueado');
      return { success: false, message: 'A senha master atual informada está incorreta.' };
    }
    const cleanNew = newPass.trim();
    if (cleanNew.length < 4) {
      return { success: false, message: 'A nova senha master deve ter no mínimo 4 caracteres.' };
    }
    setMasterPassword(cleanNew);
    localStorage.setItem(STORAGE_KEY_MASTER_PASS, cleanNew);
    logSecurityAction('Senha Master do Administrador alterada com sucesso', 'Sala de Controle Global', 'sucesso');
    return { success: true, message: 'Senha Master atualizada com sucesso!' };
  };

  const smartLogin = (identifier: string, passwordOrPin: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passwordOrPin.trim();

    // 1. Check if user is trying to login as Master Admin directly
    if ((cleanId === 'master' || cleanId === 'admin' || cleanId === 'yslamarck@gmail.com') && cleanPass === masterPassword) {
      return enterMasterControlRoom(cleanPass);
    }
    if (cleanPass === masterPassword && cleanId === '') {
      return enterMasterControlRoom(cleanPass);
    }

    // 2. Look up canteen matching email, loginUsername, subdomain, or name
    const found = cantinas.find(c => {
      if (c.email && c.email.toLowerCase() === cleanId) return true;
      if (c.loginUsername && c.loginUsername.toLowerCase() === cleanId) return true;
      if (c.subdomain && c.subdomain.toLowerCase() === cleanId) return true;
      if (c.id && c.id.toLowerCase() === cleanId) return true;
      if (c.name && c.name.toLowerCase() === cleanId) return true;
      return false;
    });

    if (!found) {
      logSecurityAction(`Tentativa de login com identificador inexistente: ${identifier}`, 'Sistema', 'alerta');
      return { 
        success: false, 
        error: 'Nenhuma cantina encontrada com este usuário ou identificador. O cadastro é realizado exclusivamente pelo Administrador Master.' 
      };
    }

    if (found.status === 'suspended') {
      logSecurityAction(`Tentativa de login em cantina suspensa: ${found.name}`, found.name, 'bloqueado');
      return { 
        success: false, 
        error: 'Esta conta de cantina está temporariamente suspensa pelo Administrador Master.' 
      };
    }

    // 3. Verify password or PIN
    const isPasswordValid = 
      (found.password && found.password === cleanPass) ||
      (found.pin && found.pin === cleanPass);

    if (!isPasswordValid) {
      logSecurityAction(`Senha incorreta para a cantina: ${found.name}`, found.name, 'alerta');
      return { 
        success: false, 
        error: 'Senha de acesso incorreta. Caso tenha esquecido, solicite a redefinição ao Administrador Master.' 
      };
    }

    // 4. Successful login: switch context strictly to this canteen
    setActiveCantinaId(found.id);
    setAuthData({
      isAuthenticated: true,
      operatorName: found.ownerName || found.operatorName || 'Administrador',
      isMasterMode: false,
    });
    setActiveTab('pdv');
    logSecurityAction(`Login efetuado com sucesso na cantina: ${found.name}`, found.name, 'sucesso');
    return { success: true, cantina: found };
  };

  const login = (subdomainOrId: string, pin: string, _operator: string) => {
    return smartLogin(subdomainOrId, pin);
  };

  const logout = () => {
    setAuthData({
      isAuthenticated: false,
      operatorName: '',
      isMasterMode: false,
    });
    try {
      sessionStorage.removeItem(SESSION_KEY_AUTH);
      localStorage.removeItem('nexo_cantinas_auth_v2');
    } catch (e) {
      // ignore
    }
  };

  const exitMasterControlRoom = () => {
    setAuthData({
      isAuthenticated: false,
      operatorName: '',
      isMasterMode: false,
    });
    try {
      sessionStorage.removeItem(SESSION_KEY_AUTH);
      localStorage.removeItem('nexo_cantinas_auth_v2');
    } catch (e) {
      // ignore
    }
    setActiveTab('pdv');
  };

  const switchCantina = (cantinaId: string) => {
    const target = cantinas.find(c => c.id === cantinaId);
    if (target) {
      setActiveCantinaId(target.id);
      logSecurityAction(`Troca de contexto para ${target.name}`, target.name, 'sucesso');
    }
  };

  // Process a sale
  const processSale = (params: {
    paymentMethod: PaymentMethod;
    items: SaleItem[];
    customerId?: string;
    customerName?: string;
    amountReceived?: number;
    changeGiven?: number;
  }): Sale => {
    if (!activeCantina) throw new Error('Nenhuma cantina ativa.');

    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR');
    const receiptNumber = `${activeCantina.logoText || 'CANT'}-${Math.floor(1000 + Math.random() * 9000)}`;

    const totalAmount = params.items.reduce((acc, item) => acc + item.totalPrice, 0);
    const totalCost = params.items.reduce((acc, item) => acc + (item.costPrice || 0) * item.quantity, 0);

    const isPrazo = params.paymentMethod === 'fiado' || params.paymentMethod === 'a_prazo';
    
    // Resolve target customer for a_prazo: match by customerId or customerName
    const targetCustomer = isPrazo 
      ? activeCantina.customers.find(c => c.id === params.customerId || (params.customerName && c.name.toLowerCase() === params.customerName.toLowerCase()))
      : null;

    const newSale: Sale = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      formattedDate,
      formattedTime,
      paymentMethod: params.paymentMethod,
      customerId: targetCustomer ? targetCustomer.id : params.customerId,
      customerName: targetCustomer ? targetCustomer.name : params.customerName,
      items: params.items,
      totalAmount,
      totalCost,
      operatorName: authData.operatorName || activeCantina.operatorName || 'Operador',
      receiptNumber,
      amountReceived: params.amountReceived,
      changeGiven: params.changeGiven,
    };

    // Update active cantina state
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;

      // 1. Deduct stock for inventory products
      const updatedProducts = c.products.map(p => {
        const itemInSale = params.items.find(i => i.productId === p.id || i.code === p.code);
        if (itemInSale) {
          return {
            ...p,
            stock: Math.max(0, p.stock - itemInSale.quantity),
            totalSold: (p.totalSold || 0) + itemInSale.quantity
          };
        }
        return p;
      });

      // 2. If Fiado / A Prazo, append to customer debts
      let updatedCustomers = c.customers;
      if (isPrazo) {
        const resolvedCustId = targetCustomer?.id || params.customerId || (c.customers.length === 1 ? c.customers[0].id : undefined);
        if (resolvedCustId) {
          updatedCustomers = c.customers.map(cust => {
            if (cust.id !== resolvedCustId) return cust;

            const newDebtItems: DebtItem[] = params.items.map(item => ({
              id: `debt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              saleId: newSale.id,
              timestamp: now.toISOString(),
              formattedDate,
              formattedTime,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              paid: false,
            }));

            return {
              ...cust,
              items: [...cust.items, ...newDebtItems]
            };
          });
        }
      }

      // 3. Update shifts / cash movement if cash/pix/card
      const updatedShifts = [...c.shifts];
      if (updatedShifts.length > 0 && updatedShifts[0].isOpen && !isPrazo) {
        const currentShift = { ...updatedShifts[0] };
        const newMovement: CashMovement = {
          id: `mov-${Date.now()}`,
          timestamp: now.toISOString(),
          formattedTime,
          type: 'entrada',
          amount: totalAmount,
          description: `Venda ${receiptNumber} (${params.paymentMethod.toUpperCase()})`,
          operatorName: authData.operatorName,
          paymentMethod: params.paymentMethod
        };
        currentShift.movements = [newMovement, ...currentShift.movements];
        updatedShifts[0] = currentShift;
      }

      return {
        ...c,
        products: updatedProducts,
        customers: updatedCustomers,
        sales: [newSale, ...c.sales],
        shifts: updatedShifts
      };
    }));

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.85 }
      });
    } catch (e) {
      // confetti fallback
    }

    return newSale;
  };

  // Cancel or Reverse a completed sale
  const cancelSale = (saleId: string): { success: boolean; message: string } => {
    if (!activeCantina) return { success: false, message: 'Nenhuma cantina ativa.' };

    const saleToCancel = activeCantina.sales.find(s => s.id === saleId);
    if (!saleToCancel) {
      return { success: false, message: 'Venda não encontrada.' };
    }

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;

      // 1. Restore product stock
      const updatedProducts = c.products.map(p => {
        const itemInSale = saleToCancel.items.find(i => i.productId === p.id || i.code === p.code || i.name.toLowerCase() === p.name.toLowerCase());
        if (itemInSale) {
          return {
            ...p,
            stock: p.stock + itemInSale.quantity,
            totalSold: Math.max(0, (p.totalSold || 0) - itemInSale.quantity)
          };
        }
        return p;
      });

      // 2. Remove debt items from customer if it was a prazo
      const updatedCustomers = c.customers.map(cust => {
        if (saleToCancel.customerId && cust.id === saleToCancel.customerId) {
          return {
            ...cust,
            items: cust.items.filter(item => item.saleId !== saleId)
          };
        }
        return cust;
      });

      // 3. Reverse cash shift movement if it was cash/pix/card
      const updatedShifts = [...c.shifts];
      if (updatedShifts.length > 0 && updatedShifts[0].isOpen && saleToCancel.paymentMethod !== 'fiado' && saleToCancel.paymentMethod !== 'a_prazo') {
        const currentShift = { ...updatedShifts[0] };
        const reversalMovement: CashMovement = {
          id: `mov-rev-${Date.now()}`,
          timestamp: new Date().toISOString(),
          formattedTime: new Date().toLocaleTimeString('pt-BR'),
          type: 'saida',
          amount: saleToCancel.totalAmount,
          description: `Estorno de Venda #${saleToCancel.receiptNumber} (${saleToCancel.paymentMethod.toUpperCase()})`,
          operatorName: authData.operatorName,
          paymentMethod: saleToCancel.paymentMethod
        };
        currentShift.movements = [reversalMovement, ...currentShift.movements];
        updatedShifts[0] = currentShift;
      }

      // 4. Remove sale from sales list
      const updatedSales = c.sales.filter(s => s.id !== saleId);

      return {
        ...c,
        products: updatedProducts,
        customers: updatedCustomers,
        sales: updatedSales,
        shifts: updatedShifts
      };
    }));

    logSecurityAction(`Venda #${saleToCancel.receiptNumber} cancelada/estornada pela operadora`, activeCantina.name, 'sucesso');
    return { success: true, message: `Venda #${saleToCancel.receiptNumber} estornada com sucesso e estoque reajustado!` };
  };

  // Add customer
  const addCustomer = (data: {
    name: string;
    parentName?: string;
    studentName?: string;
    grade?: string;
    phone?: string;
  }): Customer => {
    if (!activeCantina) throw new Error('Nenhuma cantina ativa.');

    const prefix = (activeCantina.logoText || 'CANT').substring(0, 3).toUpperCase();
    const randomCode = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

    const newCustomer: Customer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name,
      parentName: data.parentName,
      studentName: data.studentName,
      grade: data.grade,
      phone: data.phone?.replace(/\D/g, ''),
      consultationCode: randomCode,
      createdAt: new Date().toISOString(),
      items: []
    };

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        customers: [newCustomer, ...c.customers]
      };
    }));

    return newCustomer;
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    if (!activeCantina) return;
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        customers: c.customers.map(cust => cust.id === id ? { ...cust, ...data } : cust)
      };
    }));
  };

  const deleteCustomer = (id: string) => {
    if (!activeCantina) return;
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        customers: c.customers.filter(cust => cust.id !== id)
      };
    }));
  };

  // Delete/Reverse an individual item annotated wrongly on a customer's debt
  const deleteCustomerDebtItem = (customerId: string, debtItemId: string): { success: boolean; message: string } => {
    if (!activeCantina) return { success: false, message: 'Nenhuma cantina ativa.' };

    const targetCustomer = activeCantina.customers.find(c => c.id === customerId);
    if (!targetCustomer) return { success: false, message: 'Cliente não encontrado.' };

    const itemToDelete = targetCustomer.items.find(i => i.id === debtItemId);
    if (!itemToDelete) return { success: false, message: 'Lançamento não encontrado.' };

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;

      // 1. If item corresponds to a product in inventory, restore stock
      const updatedProducts = c.products.map(p => {
        if (p.name.toLowerCase() === itemToDelete.name.toLowerCase()) {
          return {
            ...p,
            stock: p.stock + itemToDelete.quantity,
            totalSold: Math.max(0, (p.totalSold || 0) - itemToDelete.quantity)
          };
        }
        return p;
      });

      // 2. Remove the debt item from the customer
      const updatedCustomers = c.customers.map(cust => {
        if (cust.id !== customerId) return cust;
        return {
          ...cust,
          items: cust.items.filter(i => i.id !== debtItemId)
        };
      });

      // 3. If item was part of a registered Sale, update or clean that sale
      let updatedSales = c.sales;
      if (itemToDelete.saleId) {
        updatedSales = c.sales.map(s => {
          if (s.id !== itemToDelete.saleId) return s;
          const remainingItems = s.items.filter(i => i.name !== itemToDelete.name);
          const newTotalAmount = remainingItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
          const newTotalCost = remainingItems.reduce((acc, curr) => acc + (curr.costPrice || 0) * curr.quantity, 0);
          return {
            ...s,
            items: remainingItems,
            totalAmount: newTotalAmount,
            totalCost: newTotalCost
          };
        }).filter(s => s.items.length > 0);
      }

      return {
        ...c,
        products: updatedProducts,
        customers: updatedCustomers,
        sales: updatedSales
      };
    }));

    logSecurityAction(`Lançamento errado "${itemToDelete.name}" (R$ ${itemToDelete.totalPrice.toFixed(2)}) apagado da conta de ${targetCustomer.name}`, activeCantina.name, 'sucesso');
    return { success: true, message: `Lançamento de "${itemToDelete.name}" removido com sucesso e saldo corrigido!` };
  };

  const addDebtToCustomer = (customerId: string, items: { name: string; quantity: number; unitPrice: number }[]) => {
    if (!activeCantina) return;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR');

    const newDebtItems: DebtItem[] = items.map(item => ({
      id: `debt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      formattedDate,
      formattedTime,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      paid: false,
    }));

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        customers: c.customers.map(cust => {
          if (cust.id !== customerId) return cust;
          return {
            ...cust,
            items: [...cust.items, ...newDebtItems]
          };
        })
      };
    }));
  };

  // Money Advance / Saque / Pegou Dinheiro (without stock modification)
  const addMoneyAdvanceToCustomer = (customerId: string, amount: number, note?: string) => {
    if (!activeCantina) return;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR');

    const advanceDebt: DebtItem = {
      id: `debt-adv-${Date.now()}`,
      timestamp: now.toISOString(),
      formattedDate,
      formattedTime,
      name: note ? `Pegou em Dinheiro: ${note}` : 'Pegou em Dinheiro (Saque / Empréstimo)',
      quantity: 1,
      unitPrice: amount,
      totalPrice: amount,
      isMoneyAdvance: true,
      paid: false
    };

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        customers: c.customers.map(cust => {
          if (cust.id !== customerId) return cust;
          return {
            ...cust,
            items: [...cust.items, advanceDebt]
          };
        })
      };
    }));

    // Register cash withdrawal in active shift
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      const updatedShifts = [...c.shifts];
      if (updatedShifts.length > 0 && updatedShifts[0].isOpen) {
        const currentShift = { ...updatedShifts[0] };
        currentShift.movements = [
          {
            id: `mov-${Date.now()}`,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleTimeString('pt-BR'),
            type: 'sangria',
            amount: amount,
            description: `Saque / Empréstimo em Dinheiro a Prazo (${c.customers.find(cu => cu.id === customerId)?.name || 'Cliente'})`,
            operatorName: authData.operatorName,
            paymentMethod: 'dinheiro'
          },
          ...currentShift.movements
        ];
        updatedShifts[0] = currentShift;
      }
      return {
        ...c,
        shifts: updatedShifts
      };
    }));
  };

  // Settle individual debt item
  const settleCustomerDebtItem = (customerId: string, debtItemId: string, paymentMethod: PaymentMethod = 'dinheiro') => {
    if (!activeCantina) return;
    const now = new Date();

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;

      let settledAmount = 0;
      let settledItemName = '';
      let customerName = '';

      const updatedCustomers = c.customers.map(cust => {
        if (cust.id !== customerId) return cust;
        customerName = cust.name;
        return {
          ...cust,
          items: cust.items.map(item => {
            if (item.id === debtItemId) {
              settledAmount = item.totalPrice;
              settledItemName = item.name;
              return { ...item, paid: true, paidAt: now.toISOString() };
            }
            return item;
          })
        };
      });

      // Register cash inflow for the settlement
      const updatedShifts = [...c.shifts];
      if (updatedShifts.length > 0 && updatedShifts[0].isOpen && settledAmount > 0) {
        const currentShift = { ...updatedShifts[0] };
        currentShift.movements = [
          {
            id: `mov-${Date.now()}`,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleTimeString('pt-BR'),
            type: 'quitacao_fiado',
            amount: settledAmount,
            description: `Baixa Conta a Prazo: ${settledItemName} (${customerName}) - ${paymentMethod.toUpperCase()}`,
            operatorName: authData.operatorName,
            paymentMethod
          },
          ...currentShift.movements
        ];
        updatedShifts[0] = currentShift;
      }

      return {
        ...c,
        customers: updatedCustomers,
        shifts: updatedShifts
      };
    }));
  };

  // Abatimento parcial de saldo a prazo (ex: cliente deve 50 e paga 20)
  const abateCustomerDebtPartial = (customerId: string, amount: number, paymentMethod: PaymentMethod, note?: string) => {
    if (!activeCantina || amount <= 0) return;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR');

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;

      let remainingToAbate = amount;
      let customerName = '';

      const updatedCustomers = c.customers.map(cust => {
        if (cust.id !== customerId) return cust;
        customerName = cust.name;

        // Process unpaid items in chronological order to mark paid or partially split
        const newItems: DebtItem[] = [];
        for (const item of cust.items) {
          if (item.paid) {
            newItems.push(item);
            continue;
          }

          if (remainingToAbate >= item.totalPrice) {
            // Full item covered
            remainingToAbate -= item.totalPrice;
            newItems.push({
              ...item,
              paid: true,
              paidAt: now.toISOString()
            });
          } else if (remainingToAbate > 0) {
            // Partially covers this item: mark the covered part as paid and keep the rest unpaid
            const paidPortion = remainingToAbate;
            const remainingPortion = item.totalPrice - paidPortion;
            remainingToAbate = 0;

            newItems.push({
              ...item,
              totalPrice: paidPortion,
              name: `${item.name} (Abatimento Parcial)`,
              paid: true,
              paidAt: now.toISOString()
            });

            newItems.push({
              id: `debt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              timestamp: item.timestamp,
              formattedDate: item.formattedDate,
              formattedTime: item.formattedTime,
              name: `${item.name} (Saldo Restante)`,
              quantity: 1,
              unitPrice: remainingPortion,
              totalPrice: remainingPortion,
              isMoneyAdvance: item.isMoneyAdvance,
              paid: false
            });
          } else {
            newItems.push(item);
          }
        }

        return {
          ...cust,
          items: newItems
        };
      });

      // Register cash inflow for partial payment
      const updatedShifts = [...c.shifts];
      if (updatedShifts.length > 0 && updatedShifts[0].isOpen) {
        const currentShift = { ...updatedShifts[0] };
        currentShift.movements = [
          {
            id: `mov-${Date.now()}`,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleTimeString('pt-BR'),
            type: 'quitacao_fiado',
            amount: amount,
            description: `Abatimento Parcial a Prazo: ${customerName} (R$ ${amount.toFixed(2)})${note ? ` - ${note}` : ''} [${paymentMethod.toUpperCase()}]`,
            operatorName: authData.operatorName,
            paymentMethod
          },
          ...currentShift.movements
        ];
        updatedShifts[0] = currentShift;
      }

      return {
        ...c,
        customers: updatedCustomers,
        shifts: updatedShifts
      };
    }));

    try {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    } catch (e) {
      // ignore
    }
  };

  // Settle all debts for customer
  const settleCustomerAllDebts = (customerId: string, paymentMethod: PaymentMethod) => {
    if (!activeCantina) return;
    const now = new Date();

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;

      let totalSettled = 0;
      let customerName = '';

      const updatedCustomers = c.customers.map(cust => {
        if (cust.id !== customerId) return cust;
        customerName = cust.name;
        const unpaidItems = cust.items.filter(i => !i.paid);
        totalSettled = unpaidItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

        return {
          ...cust,
          items: cust.items.map(item => ({ ...item, paid: true, paidAt: now.toISOString() }))
        };
      });

      // Register cash inflow
      const updatedShifts = [...c.shifts];
      if (updatedShifts.length > 0 && updatedShifts[0].isOpen && totalSettled > 0) {
        const currentShift = { ...updatedShifts[0] };
        currentShift.movements = [
          {
            id: `mov-${Date.now()}`,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleTimeString('pt-BR'),
            type: 'quitacao_fiado',
            amount: totalSettled,
            description: `Quitação Total Fiado: ${customerName} (${paymentMethod.toUpperCase()})`,
            operatorName: authData.operatorName,
            paymentMethod
          },
          ...currentShift.movements
        ];
        updatedShifts[0] = currentShift;
      }

      return {
        ...c,
        customers: updatedCustomers,
        shifts: updatedShifts
      };
    }));

    try {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
    } catch (e) {
      // ignore
    }
  };

  // Product CRUD
  const addProduct = (product: Omit<Product, 'id'>): Product => {
    if (!activeCantina) throw new Error('Nenhuma cantina ativa.');
    const newProduct: Product = {
      ...product,
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      totalSold: 0
    };

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        products: [...c.products, newProduct]
      };
    }));

    return newProduct;
  };

  const updateProduct = (id: string, product: Partial<Product>) => {
    if (!activeCantina) return;
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        products: c.products.map(p => p.id === id ? { ...p, ...product } : p)
      };
    }));
  };

  const deleteProduct = (id: string) => {
    if (!activeCantina) return;
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        products: c.products.filter(p => p.id !== id)
      };
    }));
  };

  const adjustProductStock = (id: string, delta: number) => {
    if (!activeCantina) return;
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        products: c.products.map(p => {
          if (p.id === id) {
            return { ...p, stock: Math.max(0, p.stock + delta) };
          }
          return p;
        })
      };
    }));
  };

  const loadStarterProductsToActiveCantina = () => {
    if (!activeCantina) return;
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        products: [...DEFAULT_STARTER_PRODUCTS]
      };
    }));
    logSecurityAction(`Catálogo base de produtos carregado`, activeCantina.name, 'sucesso');
  };

  const resetSystemToZero = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_CANTINAS);
      localStorage.removeItem('nexo_cantinas_active_id_v2');
      localStorage.removeItem('nexo_cantinas_auth_v2');
      sessionStorage.removeItem(SESSION_KEY_ACTIVE_ID);
      sessionStorage.removeItem(SESSION_KEY_AUTH);
    } catch (e) {
      // ignore
    }
    setCantinas(INITIAL_CANTINAS);
    setActiveCantinaId(INITIAL_CANTINAS[0]?.id || 'cantina_nexo_matriz');
    setAuthData({
      isAuthenticated: true,
      operatorName: 'admin',
      isMasterMode: false,
    });
    setSecurityLogs(INITIAL_SECURITY_LOGS);
    setActiveTab('pdv');
  };

  // Cash Shifts
  const openCashShift = (openingBalance: number) => {
    if (!activeCantina) return;
    const now = new Date();
    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      date: now.toISOString().split('T')[0],
      openedAt: now.toISOString(),
      openingBalance,
      isOpen: true,
      operator: authData.operatorName || 'Operador',
      movements: [
        {
          id: `mov-${Date.now()}`,
          timestamp: now.toISOString(),
          formattedTime: now.toLocaleTimeString('pt-BR'),
          type: 'abertura',
          amount: openingBalance,
          description: 'Abertura de Caixa (Troco Inicial)',
          operatorName: authData.operatorName || 'Operador'
        }
      ]
    };

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        shifts: [newShift, ...c.shifts]
      };
    }));
  };

  const closeCurrentShift = (closingData?: {
    closingBalanceActual?: number;
    closingBalanceExpected?: number;
    closingNotes?: string;
    sentToEmailAddress?: string;
    methodTotals?: {
      pix: number;
      dinheiro: number;
      cartao: number;
      a_prazo: number;
      totalVendas: number;
      totalLucro?: number;
      totalSuprimentos: number;
      totalSangrias: number;
      salesCount: number;
    };
  }): CashShift | null => {
    if (!activeCantina) return null;
    const now = new Date();
    let closedShiftObj: CashShift | null = null;

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      const updatedShifts = c.shifts.map((shift, idx) => {
        if (idx === 0 && shift.isOpen) {
          const expected = closingData?.closingBalanceExpected !== undefined 
            ? closingData.closingBalanceExpected 
            : shift.openingBalance;
          const actual = closingData?.closingBalanceActual !== undefined 
            ? closingData.closingBalanceActual 
            : expected;
          const diff = Math.round((actual - expected) * 100) / 100;

          const updated: CashShift = {
            ...shift,
            isOpen: false,
            closedAt: now.toISOString(),
            closedByOperator: authData.operatorName || 'Operador',
            closingBalanceExpected: expected,
            closingBalanceActual: actual,
            cashDifference: diff,
            closingNotes: closingData?.closingNotes,
            sentToEmailAddress: closingData?.sentToEmailAddress,
            sentToEmailAt: closingData?.sentToEmailAddress ? now.toISOString() : undefined,
            methodTotals: closingData?.methodTotals
          };
          closedShiftObj = updated;
          return updated;
        }
        return shift;
      });

      return {
        ...c,
        shifts: updatedShifts
      };
    }));

    logSecurityAction(`Fechamento de Caixa do Turno realizado por ${authData.operatorName || 'Operador'}`, activeCantina.name, 'sucesso');
    
    // Automatic backup snapshot on shift close
    if (activeCantina) {
      createBackupSnapshot(activeCantina, 'fechamento_caixa');
    }

    return closedShiftObj;
  };

  const markShiftEmailSent = (shiftId: string, emailAddress: string) => {
    if (!activeCantina) return;
    const now = new Date();
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return {
        ...c,
        shifts: c.shifts.map(s => s.id === shiftId ? {
          ...s,
          sentToEmailAddress: emailAddress,
          sentToEmailAt: now.toISOString()
        } : s)
      };
    }));
    logSecurityAction(`Relatório de Fechamento de Caixa enviado para o Gmail/E-mail: ${emailAddress}`, activeCantina.name, 'sucesso');
  };

  const addCashMovement = (type: 'entrada' | 'saida' | 'sangria' | 'suprimento', amount: number, description: string, paymentMethod?: PaymentMethod) => {
    if (!activeCantina) return;
    const now = new Date();

    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      const updatedShifts = [...c.shifts];
      if (updatedShifts.length > 0 && updatedShifts[0].isOpen) {
        const currentShift = { ...updatedShifts[0] };
        currentShift.movements = [
          {
            id: `mov-${Date.now()}`,
            timestamp: now.toISOString(),
            formattedTime: now.toLocaleTimeString('pt-BR'),
            type,
            amount,
            description,
            operatorName: authData.operatorName,
            paymentMethod
          },
          ...currentShift.movements
        ];
        updatedShifts[0] = currentShift;
      }
      return {
        ...c,
        shifts: updatedShifts
      };
    }));
  };

  // Settings & Backups & Profile
  const updateCantinaSettings = (data: Partial<CantinaTenant>) => {
    if (!activeCantina) return;
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return { ...c, ...data };
    }));
    if (data.operatorName && data.operatorName.trim()) {
      setAuthData(prev => ({ ...prev, operatorName: data.operatorName!.trim() }));
    }
    logSecurityAction(`Configurações/Perfil da cantina "${data.name || activeCantina.name}" atualizados`, activeCantina.name, 'sucesso');
  };

  const updateCurrentOperator = (name: string) => {
    const clean = name.trim() || 'Operador';
    setAuthData(prev => ({ ...prev, operatorName: clean }));
    if (activeCantina) {
      setCantinas(prev => prev.map(c => c.id === activeCantina.id ? { ...c, operatorName: clean } : c));
      logSecurityAction(`Operador do caixa alterado para: ${clean}`, activeCantina.name, 'sucesso');
    }
  };

  const exportBackupJSON = () => {
    if (!activeCantina) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeCantina, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_${activeCantina.subdomain}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // update backup timestamp
    updateCantinaSettings({ lastBackupAt: new Date().toISOString() });
    logSecurityAction(`Backup JSON baixado com sucesso`, activeCantina.name, 'sucesso');
  };

  const exportSalesCSV = () => {
    if (!activeCantina) return;
    exportSnapshotSpreadsheet({
      data: activeCantina,
      trigger: 'manual',
      formattedDate: new Date().toLocaleDateString('pt-BR'),
      formattedTime: new Date().toLocaleTimeString('pt-BR')
    });
    logSecurityAction(`Planilha Excel da cantina baixada com sucesso`, activeCantina.name, 'sucesso');
  };

  const restoreFromJSON = (jsonContent: string) => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!parsed.id || !parsed.name || !Array.isArray(parsed.products)) {
        return { success: false, message: 'Arquivo JSON inválido. Estrutura não reconhecida.' };
      }

      setCantinas(prev => {
        const exists = prev.some(c => c.id === parsed.id);
        if (exists) {
          return prev.map(c => c.id === parsed.id ? parsed : c);
        }
        return [...prev, parsed];
      });

      setActiveCantinaId(parsed.id);
      logSecurityAction(`Backup restaurado com sucesso para ${parsed.name}`, parsed.name, 'sucesso');
      return { success: true, message: `Backup da cantina "${parsed.name}" restaurado com sucesso!` };
    } catch (e: any) {
      return { success: false, message: `Erro ao processar JSON: ${e.message}` };
    }
  };

  // --- Auto Backup Snapshots Implementation ---
  const createBackupSnapshot = async (
    cantinaToBackup: CantinaTenant, 
    trigger: 'automatico' | 'turno_11h' | 'turno_17h' | 'fechamento_caixa' | 'manual' = 'automatico'
  ): Promise<BackupSnapshot> => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    const jsonStr = JSON.stringify(cantinaToBackup);
    const sizeBytes = new Blob([jsonStr]).size;

    const totalPendingFiado = cantinaToBackup.customers.reduce((acc, c) => {
      return acc + c.items.filter(i => !i.paid).reduce((s, it) => s + it.totalPrice, 0);
    }, 0);

    const snapshot: BackupSnapshot = {
      id: `snap_${cantinaToBackup.id}_${Date.now()}`,
      cantinaId: cantinaToBackup.id,
      cantinaName: cantinaToBackup.name,
      timestamp: now.toISOString(),
      formattedDate: dateStr,
      formattedTime: timeStr,
      trigger,
      productsCount: cantinaToBackup.products.length,
      customersCount: cantinaToBackup.customers.length,
      salesCount: cantinaToBackup.sales.length,
      shiftsCount: cantinaToBackup.shifts.length,
      totalPendingFiado,
      sizeBytes,
      data: cantinaToBackup
    };

    // 1. Salva no LocalStorage da cantina (mantém os últimos 10)
    try {
      const key = `nexo_snapshots_${cantinaToBackup.id}`;
      const raw = localStorage.getItem(key);
      let existing: BackupSnapshot[] = raw ? JSON.parse(raw) : [];
      existing = [snapshot, ...existing.filter(s => s.id !== snapshot.id)].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(existing));
      setAutoBackupSnapshots(existing);
    } catch (err) {
      // quota or private mode
    }

    // 2. Salva no servidor de sincronização
    try {
      await fetch('/api/backups/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });
    } catch (e) {
      // offline
    }

    // 3. Atualiza timestamps na cantina
    setCantinas(prev => prev.map(c => {
      if (c.id !== cantinaToBackup.id) return c;
      return {
        ...c,
        lastAutoBackupAt: now.toISOString(),
        lastBackupAt: now.toISOString()
      };
    }));

    const triggerLabel = 
      trigger === 'turno_11h' ? 'Turno 11:00 (Manhã)' :
      trigger === 'turno_17h' ? 'Turno 17:00 (Tarde)' :
      trigger === 'fechamento_caixa' ? 'Fechamento de Caixa' :
      trigger === 'manual' ? 'Manual' : 'Automático';

    logSecurityAction(`Backup de Segurança (${triggerLabel}) gravado com sucesso [${(sizeBytes / 1024).toFixed(1)} KB]`, cantinaToBackup.name, 'sucesso');
    return snapshot;
  };

  const triggerManualBackup = async (triggerLabel: 'manual' | 'turno_11h' | 'turno_17h' | 'fechamento_caixa' = 'manual'): Promise<BackupSnapshot | null> => {
    if (!activeCantina) return null;
    const snap = await createBackupSnapshot(activeCantina, triggerLabel as any);
    logSecurityAction(`Backup (${triggerLabel}) acionado por ${authData.operatorName || 'Operador'}`, activeCantina.name, 'sucesso');
    return snap;
  };

  const restoreFromSnapshot = async (snapshotId: string): Promise<{ success: boolean; message: string }> => {
    let target = autoBackupSnapshots.find(s => s.id === snapshotId);
    if (!target || !target.data) {
      try {
        const res = await fetch(`/api/backups/${snapshotId}`);
        const json = await res.json();
        if (json && json.backup) target = json.backup;
      } catch (e) {
        // offline
      }
    }

    if (!target || !target.data) {
      return { success: false, message: 'Snapshot de backup não encontrado ou dados corrompidos.' };
    }

    const restored: CantinaTenant = target.data;
    setCantinas(prev => prev.map(c => c.id === restored.id ? restored : c));
    logSecurityAction(`Snapshot restaurado: ${target.formattedDate} ${target.formattedTime}`, restored.name, 'sucesso');
    return { success: true, message: `Cantina "${restored.name}" restaurada para o ponto de ${target.formattedDate} às ${target.formattedTime}!` };
  };

  const downloadSnapshotJSON = (snapshot: BackupSnapshot) => {
    const dataToExport = snapshot.data || activeCantina;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    const dateFormatted = snapshot.formattedDate.replace(/\//g, '-');
    const timeFormatted = snapshot.formattedTime.replace(/:/g, '-');
    link.setAttribute("download", `backup_${snapshot.cantinaId}_${dateFormatted}_${timeFormatted}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const toggleAutoBackup = (enabled: boolean) => {
    if (!activeCantina) return;
    updateCantinaSettings({ autoBackupEnabled: enabled });
  };

  // Timer de Backup Automático Programado por Turnos (às 11:00 e às 17:00)
  useEffect(() => {
    if (!activeCantina) return;
    const isEnabled = activeCantina.autoBackupEnabled !== false;
    if (!isEnabled) return;

    const checkShiftSchedule = () => {
      if (!activeCantina) return;
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const todayDateStr = now.toISOString().split('T')[0];

      // Turno 1: 11:00 (Janela de 11:00 a 11:04)
      if (currentHour === 11 && currentMinute <= 4) {
        const slotKey = `nexo_backup_shift_11h_${activeCantina.id}_${todayDateStr}`;
        if (!localStorage.getItem(slotKey)) {
          localStorage.setItem(slotKey, new Date().toISOString());
          createBackupSnapshot(activeCantina, 'turno_11h');
        }
      }

      // Turno 2: 17:00 (Janela de 17:00 a 17:04)
      if (currentHour === 17 && currentMinute <= 4) {
        const slotKey = `nexo_backup_shift_17h_${activeCantina.id}_${todayDateStr}`;
        if (!localStorage.getItem(slotKey)) {
          localStorage.setItem(slotKey, new Date().toISOString());
          createBackupSnapshot(activeCantina, 'turno_17h');
        }
      }
    };

    checkShiftSchedule();
    const interval = setInterval(checkShiftSchedule, 30000);

    return () => clearInterval(interval);
  }, [activeCantina]);

  // Master Tenant Operations
  const createCantinaTenant = (data: { 
    name: string; 
    schoolName: string; 
    subdomain?: string;
    ownerName?: string;
    email?: string;
    loginUsername?: string;
    phone?: string;
    password?: string;
    pin?: string; 
    pixKey?: string; 
    logoUrl?: string;
    monthlyFee?: number;
    monthlyFeeDueDay?: number;
  }): CantinaTenant => {
    const baseSub = (data.subdomain || data.name).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'cantina';
    let cleanSubdomain = baseSub;
    let counter = 1;
    while (cantinas.some(c => c.subdomain.toLowerCase() === cleanSubdomain.toLowerCase() || c.id === `cantina_${cleanSubdomain}`)) {
      cleanSubdomain = `${baseSub}_${counter++}`;
    }
    const newId = `cantina_${cleanSubdomain}`;
    const pass = data.password?.trim() || data.pin?.trim() || '1234';
    const emailLogin = data.email?.trim() || `${cleanSubdomain}@nexocantinas.com`;
    
    let userLogin = data.loginUsername?.trim() || cleanSubdomain;
    if (cantinas.some(c => c.loginUsername?.toLowerCase() === userLogin.toLowerCase() || c.email?.toLowerCase() === userLogin.toLowerCase())) {
      userLogin = `${userLogin}${counter > 1 ? counter : Math.floor(100 + Math.random() * 900)}`;
    }

    // Clone starter products with fresh isolated unique IDs so each canteen has independent inventory
    const clonedStarterProducts: Product[] = DEFAULT_STARTER_PRODUCTS.map((p, idx) => ({
      ...p,
      id: `p-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      totalSold: 0
    }));

    const newTenant: CantinaTenant = {
      id: newId,
      subdomain: cleanSubdomain,
      name: data.name.trim(),
      schoolName: data.schoolName.trim() || 'Nexo Cantinas',
      ownerName: data.ownerName?.trim() || 'Administrador',
      email: emailLogin,
      loginUsername: userLogin,
      phone: data.phone?.trim() || '',
      logoText: (data.schoolName || data.name).substring(0, 10).toUpperCase(),
      logoUrl: data.logoUrl || '',
      pixKey: data.pixKey?.trim() || '',
      pixKeyType: 'Celular',
      pixReceiverName: data.ownerName?.trim() || data.name.trim(),
      pin: pass,
      password: pass,
      operatorName: data.ownerName?.trim() || 'admin',
      monthlyFee: data.monthlyFee !== undefined ? Number(data.monthlyFee) : 149.00,
      monthlyFeeDueDay: Number(data.monthlyFeeDueDay) || 10,
      monthlyFeeStatus: 'paid',
      status: 'active',
      products: clonedStarterProducts,
      customers: [],
      sales: [],
      shifts: [],
      createdAt: new Date().toISOString()
    };

    setCantinas(prev => [...prev, newTenant]);
    logSecurityAction(`Nova cantina provisionada com segurança pelo Master: ${data.name} (Login: ${userLogin})`, data.name, 'sucesso');
    return newTenant;
  };

  const updateCantinaStatus = (cantinaId: string, status: 'active' | 'suspended' | 'maintenance') => {
    setCantinas(prev => prev.map(c => c.id === cantinaId ? { ...c, status } : c));
    const target = cantinas.find(c => c.id === cantinaId);
    logSecurityAction(`Status da cantina ${target?.name || cantinaId} alterado para: ${status.toUpperCase()}`, target?.name || 'Sistema', status === 'suspended' ? 'alerta' : 'sucesso');
  };

  const resetCantinaPassword = (cantinaId: string, newPasswordOrPin: string) => {
    const cleanPass = newPasswordOrPin.trim();
    if (!cleanPass) {
      return { success: false, message: 'Senha não pode ser vazia.' };
    }
    setCantinas(prev => prev.map(c => {
      if (c.id !== cantinaId) return c;
      return {
        ...c,
        password: cleanPass,
        pin: cleanPass
      };
    }));
    const target = cantinas.find(c => c.id === cantinaId);
    logSecurityAction(`Senha de acesso redefinida pelo Administrador Master para a cantina: ${target?.name || cantinaId}`, target?.name || 'Sistema', 'sucesso');
    return { success: true, message: `Senha da cantina ${target?.name} redefinida com sucesso!` };
  };

  const updateCantinaFinancialPlan = (cantinaId: string, monthlyFee: number, dueDay = 10, status: 'paid' | 'pending' | 'overdue' = 'paid') => {
    setCantinas(prev => prev.map(c => {
      if (c.id !== cantinaId) return c;
      return {
        ...c,
        monthlyFee: Math.max(0, monthlyFee),
        monthlyFeeDueDay: dueDay,
        monthlyFeeStatus: status
      };
    }));
    const target = cantinas.find(c => c.id === cantinaId);
    logSecurityAction(`Plano mensal ajustado para R$ ${monthlyFee.toFixed(2)} na cantina: ${target?.name || cantinaId}`, target?.name || 'Sistema', 'sucesso');
  };

  const impersonateCantina = (cantinaId: string) => {
    const target = cantinas.find(c => c.id === cantinaId);
    if (!target) return;
    setActiveCantinaId(cantinaId);
    setActiveTab('pdv');
    logSecurityAction(`Administrador Master acessou o PDV da cantina "${target.name}" em modo de suporte`, target.name, 'sucesso');
  };

  const deleteCantinaTenant = (cantinaId: string) => {
    if (cantinas.length <= 1) return;
    const target = cantinas.find(c => c.id === cantinaId);
    setCantinas(prev => prev.filter(c => c.id !== cantinaId));
    if (activeCantinaId === cantinaId) {
      const remaining = cantinas.filter(c => c.id !== cantinaId);
      setActiveCantinaId(remaining[0].id);
    }
    logSecurityAction(`Cantina excluída da infraestrutura: ${target?.name || cantinaId}`, target?.name || 'Sistema', 'alerta');
  };

  // Student portal lookup
  const lookupStudentByCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    for (const cantina of cantinas) {
      const customer = cantina.customers.find(
        c => c.consultationCode.toUpperCase() === cleanCode || c.id === cleanCode
      );
      if (customer) {
        return { customer, cantina };
      }
    }
    return null;
  };

  return (
    <CantinaContext.Provider
      value={{
        cantinas,
        activeCantina,
        activeCantinaId,
        isAuthenticated: authData.isAuthenticated,
        operatorName: authData.operatorName,
        isMasterMode: authData.isMasterMode,
        activeTab,
        securityLogs,
        masterPasswordConfigured: masterPassword !== DEFAULT_MASTER_PASS,
        activeDeviceId,
        connectedDevicesCount,
        setActiveTab,
        smartLogin,
        login,
        logout,
        enterMasterControlRoom,
        exitMasterControlRoom,
        updateMasterPassword,
        switchCantina,
        run10DevicesTestSuite,
        processSale,
        cancelSale,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        deleteCustomerDebtItem,
        addDebtToCustomer,
        addMoneyAdvanceToCustomer,
        settleCustomerDebtItem,
        abateCustomerDebtPartial,
        settleCustomerAllDebts,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustProductStock,
        loadStarterProductsToActiveCantina,
        openCashShift,
        closeCurrentShift,
        markShiftEmailSent,
        addCashMovement,
        updateCantinaSettings,
        updateCurrentOperator,
        exportBackupJSON,
        exportSalesCSV,
        restoreFromJSON,
        resetSystemToZero,
        autoBackupSnapshots,
        triggerManualBackup,
        restoreFromSnapshot,
        downloadSnapshotJSON,
        toggleAutoBackup,
        createCantinaTenant,
        updateCantinaStatus,
        deleteCantinaTenant,
        resetCantinaPassword,
        updateCantinaFinancialPlan,
        impersonateCantina,
        lookupStudentByCode,
      }}
    >
      {children}
    </CantinaContext.Provider>
  );
};

export const useCantina = () => {
  const context = useContext(CantinaContext);
  if (!context) {
    throw new Error('useCantina must be used within a CantinaProvider');
  }
  return context;
};
