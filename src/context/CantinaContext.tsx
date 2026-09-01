import React, { createContext, useContext, useState, useEffect } from 'react';
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
  AuditSecurityLog 
} from '../types';
import { INITIAL_CANTINAS, INITIAL_SECURITY_LOGS, DEFAULT_STARTER_PRODUCTS } from '../data/initialData';
import confetti from 'canvas-confetti';

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
  
  // Navigation & Auth
  setActiveTab: (tab: 'pdv' | 'fiados' | 'estoque' | 'caixa' | 'backup' | 'master') => void;
  smartLogin: (identifier: string, passwordOrPin: string) => { success: boolean; isMaster?: boolean; error?: string; cantina?: CantinaTenant };
  login: (subdomainOrId: string, pin: string, operator: string) => { success: boolean; error?: string };
  logout: () => void;
  enterMasterControlRoom: (password: string) => { success: boolean; error?: string };
  exitMasterControlRoom: () => void;
  updateMasterPassword: (currentPass: string, newPass: string) => { success: boolean; message: string };
  switchCantina: (cantinaId: string) => void;
  
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
  exportBackupJSON: () => void;
  exportSalesCSV: () => void;
  restoreFromJSON: (jsonContent: string) => { success: boolean; message: string };
  resetSystemToZero: () => void;
  
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
const STORAGE_KEY_ACTIVE_ID = 'nexo_cantinas_active_id_v2';
const STORAGE_KEY_AUTH = 'nexo_cantinas_auth_v2';
const STORAGE_KEY_MASTER_PASS = 'nexo_cantinas_master_pass_v1';
const DEFAULT_MASTER_PASS = 'r88282810r';

const CantinaContext = createContext<CantinaContextType | undefined>(undefined);

export const CantinaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [activeCantinaId, setActiveCantinaId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      if (saved && INITIAL_CANTINAS.some(c => c.id === saved)) {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    return INITIAL_CANTINAS[0]?.id || 'cantina_nexo_matriz';
  });

  const [authData, setAuthData] = useState<{
    isAuthenticated: boolean;
    operatorName: string;
    isMasterMode: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) {
        const parsed = JSON.parse(saved);
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

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CANTINAS, JSON.stringify(cantinas));
  }, [cantinas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeCantinaId);
  }, [activeCantinaId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authData));
  }, [authData]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MASTER_PASS, masterPassword);
  }, [masterPassword]);

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
  };

  const exitMasterControlRoom = () => {
    setAuthData(prev => ({ ...prev, isMasterMode: false }));
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

    const newSale: Sale = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      formattedDate,
      formattedTime,
      paymentMethod: params.paymentMethod,
      customerId: params.customerId,
      customerName: params.customerName,
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
      const isPrazo = params.paymentMethod === 'fiado' || params.paymentMethod === 'a_prazo';
      if (isPrazo && params.customerId) {
        updatedCustomers = c.customers.map(cust => {
          if (cust.id !== params.customerId) return cust;

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
    localStorage.removeItem(STORAGE_KEY_CANTINAS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    localStorage.removeItem(STORAGE_KEY_AUTH);
    setCantinas(INITIAL_CANTINAS);
    setActiveCantinaId(INITIAL_CANTINAS[0]?.id || 'cantina_nexo_matriz');
    setAuthData({
      isAuthenticated: true,
      operatorName: 'admin',
      isGoogleAuth: false,
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

  // Settings & Backups
  const updateCantinaSettings = (data: Partial<CantinaTenant>) => {
    if (!activeCantina) return;
    setCantinas(prev => prev.map(c => {
      if (c.id !== activeCantina.id) return c;
      return { ...c, ...data };
    }));
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
    const headers = "Data,Hora,Tipo,Cliente,Itens,Total (R$),Custo (R$),Lucro (R$),Operador\n";
    const rows = activeCantina.sales.map(s => {
      const itemDesc = s.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
      const profit = (s.totalAmount - s.totalCost).toFixed(2);
      return `"${s.formattedDate}","${s.formattedTime}","${s.paymentMethod.toUpperCase()}","${s.customerName || 'Balcão / Anônimo'}","${itemDesc}","${s.totalAmount.toFixed(2)}","${s.totalCost.toFixed(2)}","${profit}","${s.operatorName}"`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vendas_${activeCantina.subdomain}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
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
    monthlyFee?: number;
    monthlyFeeDueDay?: number;
  }): CantinaTenant => {
    const rawSub = (data.subdomain || data.name).toLowerCase().replace(/[^a-z0-9]/g, '_');
    const cleanSubdomain = rawSub.replace(/^_+|_+$/g, '') || `cantina_${Date.now()}`;
    const newId = `cantina_${cleanSubdomain}`;
    const pass = data.password?.trim() || data.pin?.trim() || '1234';
    const emailLogin = data.email?.trim() || `${cleanSubdomain}@nexocantinas.com`;
    const userLogin = data.loginUsername?.trim() || cleanSubdomain;

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
      pixKey: data.pixKey?.trim() || '',
      pixKeyType: 'Celular',
      pixReceiverName: data.ownerName?.trim() || data.name.trim(),
      pin: pass,
      password: pass,
      operatorName: data.ownerName?.trim() || 'admin',
      monthlyFee: data.monthlyFee !== undefined ? data.monthlyFee : 149.00,
      monthlyFeeDueDay: data.monthlyFeeDueDay || 10,
      monthlyFeeStatus: 'paid',
      status: 'active',
      products: DEFAULT_STARTER_PRODUCTS,
      customers: [],
      sales: [],
      shifts: [],
      createdAt: new Date().toISOString()
    };

    setCantinas(prev => [...prev, newTenant]);
    logSecurityAction(`Nova cantina provisionada pelo Master: ${data.name} (Login: ${userLogin})`, data.name, 'sucesso');
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
        setActiveTab,
        smartLogin,
        login,
        logout,
        enterMasterControlRoom,
        exitMasterControlRoom,
        updateMasterPassword,
        switchCantina,
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
        exportBackupJSON,
        exportSalesCSV,
        restoreFromJSON,
        resetSystemToZero,
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
