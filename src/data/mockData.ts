import { Order, Part, Supplier, OrderStatus, PriceHistory } from '../types';

export const suppliers: Supplier[] = [
  {
    id: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
    name: 'TechParts Inc.',
    contactPerson: 'John Smith',
    email: 'john.smith@techparts.com',
    phone: '+1 555 0101',
    address: '123 Industrial Ave, Tech City, TC 12345',
    rating: 4.8,
    deliveryTime: 3,
    paymentTerms: 'Net 30',
    isActive: true,
  },
  {
    id: 'b2c3d4e5-f6g7-4901-bcde-f23456789012',
    name: 'Global Components Ltd.',
    contactPerson: 'Sarah Johnson',
    email: 'sarah.j@globalcomp.com',
    phone: '+1 555 0202',
    address: '456 Supply Chain Blvd, Logistics, LG 67890',
    rating: 4.5,
    deliveryTime: 5,
    paymentTerms: 'Net 45',
    isActive: true,
  },
  {
    id: 'c3d4e5f6-g7h8-4012-cdef-345678901234',
    name: 'Precision Manufacturing',
    contactPerson: 'Mike Chen',
    email: 'mike.chen@precision.com',
    phone: '+1 555 0303',
    address: '789 Manufacturing St, Production, PR 11111',
    rating: 4.9,
    deliveryTime: 2,
    paymentTerms: 'Net 15',
    isActive: true,
  },
];

export const orders: Order[] = [
  {
    id: 'g7h8i9j0-k1l2-4456-9hij-789012345678',
    orderNumber: 'ORD-2024-001',
    parts: [
      {
        id: 'h8i9j0k1-l2m3-4567-9ijk-890123456789',
        part: {
          id: 'd4e5f6g7-h8i9-4123-9efg-456789012345',
          partNumber: 'CPU-001',
          name: 'High-Performance Processor',
          description: 'Advanced 8-core processor for industrial applications',
          category: 'Electronics',
          specifications: {
            'Clock Speed': '3.2 GHz',
            'Cores': '8',
            'Architecture': 'x86-64',
            'TDP': '65W',
          },
          priceHistory: [
            { date: '2024-01-15', price: 285.00, supplier: 'TechParts Inc.', quantity: 10 },
            { date: '2024-02-20', price: 275.00, supplier: 'TechParts Inc.', quantity: 25 },
            { date: '2024-03-10', price: 290.00, supplier: 'Global Components Ltd.', quantity: 15 },
          ],
          currentStock: 45,
          minStock: 20,
          preferredSuppliers: ['a1b2c3d4-e5f6-4890-abcd-ef1234567890', 'c3d4e5f6-g7h8-4012-cdef-345678901234'],
        },
        quantity: 10,
        unitPrice: 275.00,
        totalPrice: 2750.00,
      },
      {
        id: 'i9j0k1l2-m3n4-4678-9jkl-901234567890',
        part: {
          id: 'e5f6g7h8-i9j0-4234-9fgh-567890123456',
          partNumber: 'MEM-512',
          name: 'Memory Module 32GB',
          description: 'DDR4 32GB memory module for high-performance systems',
          category: 'Memory',
          specifications: {
            'Capacity': '32GB',
            'Type': 'DDR4',
            'Speed': '3200 MHz',
            'Voltage': '1.2V',
          },
          priceHistory: [
            { date: '2024-01-10', price: 145.00, supplier: 'Global Components Ltd.', quantity: 20 },
            { date: '2024-02-15', price: 140.00, supplier: 'TechParts Inc.', quantity: 30 },
            { date: '2024-03-05', price: 138.00, supplier: 'Precision Manufacturing', quantity: 40 },
          ],
          currentStock: 80,
          minStock: 30,
          preferredSuppliers: ['b2c3d4e5-f6g7-4901-bcde-f23456789012', 'c3d4e5f6-g7h8-4012-cdef-345678901234'],
        },
        quantity: 20,
        unitPrice: 140.00,
        totalPrice: 2800.00,
      },
    ],
    supplier: suppliers[0],
    status: 'in_transit',
    totalAmount: 5550.00,
    orderDate: '2024-03-15',
    expectedDelivery: '2024-03-18',
    createdBy: 'Alice Johnson',
    notes: 'Urgent order for production line upgrade',
  },
  {
    id: 'j0k1l2m3-n4o5-4789-9klm-012345678901',
    orderNumber: 'ORD-2024-002',
    parts: [
      {
        id: 'k1l2m3n4-o5p6-4890-9lmn-123456789012',
        part: {
          id: 'f6g7h8i9-j0k1-4345-9ghi-678901234567',
          partNumber: 'SSD-1TB',
          name: 'Solid State Drive 1TB',
          description: 'Enterprise-grade NVMe SSD with high durability',
          category: 'Storage',
          specifications: {
            'Capacity': '1TB',
            'Interface': 'NVMe PCIe 4.0',
            'Read Speed': '7000 MB/s',
            'Write Speed': '6000 MB/s',
          },
          priceHistory: [
            { date: '2024-01-20', price: 125.00, supplier: 'TechParts Inc.', quantity: 15 },
            { date: '2024-02-25', price: 118.00, supplier: 'Global Components Ltd.', quantity: 25 },
            { date: '2024-03-15', price: 115.00, supplier: 'Precision Manufacturing', quantity: 35 },
          ],
          currentStock: 60,
          minStock: 25,
          preferredSuppliers: ['a1b2c3d4-e5f6-4890-abcd-ef1234567890', 'b2c3d4e5-f6g7-4901-bcde-f23456789012'],
        },
        quantity: 25,
        unitPrice: 118.00,
        totalPrice: 2950.00,
      },
    ],
    supplier: suppliers[1],
    status: 'delivered',
    totalAmount: 2950.00,
    orderDate: '2024-03-10',
    expectedDelivery: '2024-03-15',
    actualDelivery: '2024-03-14',
    createdBy: 'Bob Smith',
  },
  {
    id: 'l2m3n4o5-p6q7-4901-9mno-234567890123',
    orderNumber: 'ORD-2024-003',
    parts: [
      {
        id: 'm3n4o5p6-q7r8-4012-9nop-345678901234',
        part: {
          id: 'd4e5f6g7-h8i9-4123-9efg-456789012345',
          partNumber: 'CPU-001',
          name: 'High-Performance Processor',
          description: 'Advanced 8-core processor for industrial applications',
          category: 'Electronics',
          specifications: {
            'Clock Speed': '3.2 GHz',
            'Cores': '8',
            'Architecture': 'x86-64',
            'TDP': '65W',
          },
          priceHistory: [
            { date: '2024-01-15', price: 285.00, supplier: 'TechParts Inc.', quantity: 10 },
            { date: '2024-02-20', price: 275.00, supplier: 'TechParts Inc.', quantity: 25 },
            { date: '2024-03-10', price: 290.00, supplier: 'Global Components Ltd.', quantity: 15 },
          ],
          currentStock: 45,
          minStock: 20,
          preferredSuppliers: ['a1b2c3d4-e5f6-4890-abcd-ef1234567890', 'c3d4e5f6-g7h8-4012-cdef-345678901234'],
        },
        quantity: 5,
        unitPrice: 285.00,
        totalPrice: 1425.00,
      },
      {
        id: 'n4o5p6q7-r8s9-4123-9opq-456789012345',
        part: {
          id: 'f6g7h8i9-j0k1-4345-9ghi-678901234567',
          partNumber: 'SSD-1TB',
          name: 'Solid State Drive 1TB',
          description: 'Enterprise-grade NVMe SSD with high durability',
          category: 'Storage',
          specifications: {
            'Capacity': '1TB',
            'Interface': 'NVMe PCIe 4.0',
            'Read Speed': '7000 MB/s',
            'Write Speed': '6000 MB/s',
          },
          priceHistory: [
            { date: '2024-01-20', price: 125.00, supplier: 'TechParts Inc.', quantity: 15 },
            { date: '2024-02-25', price: 118.00, supplier: 'Global Components Ltd.', quantity: 25 },
            { date: '2024-03-15', price: 115.00, supplier: 'Precision Manufacturing', quantity: 35 },
          ],
          currentStock: 60,
          minStock: 25,
          preferredSuppliers: ['a1b2c3d4-e5f6-4890-abcd-ef1234567890', 'b2c3d4e5-f6g7-4901-bcde-f23456789012'],
        },
        quantity: 10,
        unitPrice: 115.00,
        totalPrice: 1150.00,
      },
    ],
    supplier: suppliers[2],
    status: 'approved',
    totalAmount: 2575.00,
    orderDate: '2024-03-18',
    expectedDelivery: '2024-03-20',
    createdBy: 'Carol Williams',
  },
];

export const getStatusColor = (status: OrderStatus): string => {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    supplier_quoting: 'bg-indigo-100 text-indigo-800',
    pending_customer_approval: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    ordered: 'bg-purple-100 text-purple-800',
    in_transit: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status];
};

export const getStatusLabel = (status: OrderStatus): string => {
  const labels = {
    draft: 'Draft',
    supplier_quoting: 'Supplier Quoting',
    pending_customer_approval: 'Pending Customer Approval',
    approved: 'Approved',
    ordered: 'Ordered',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status];
};

// Global suppliers array that can be modified
let globalSuppliers = [...suppliers];

export const addSupplierToCatalog = (newSupplier: Supplier) => {
  globalSuppliers.push(newSupplier);
};

export const getGlobalSuppliers = () => globalSuppliers;

const updateSupplierInCatalog = (updatedSupplier: Supplier) => {
  const supplierIndex = globalSuppliers.findIndex(s => s.id === updatedSupplier.id);
  if (supplierIndex !== -1) {
    globalSuppliers[supplierIndex] = updatedSupplier;
  }
};