import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { Order } from '../types';

interface ArrivalChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: Order[];
}

const ArrivalChecklistModal: React.FC<ArrivalChecklistModalProps> = ({
  isOpen,
  onClose,
  selectedOrders
}) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const totalParts = selectedOrders.reduce((sum, order) => sum + order.parts.length, 0);
  const printDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const printContent = (
    <div className="checklist-print-content">
        {/* Print Header */}
        <div className="checklist-print-header">
          <h1 className="text-4xl font-bold text-center mb-2">ARRIVAL CHECKLIST</h1>
          <p className="text-center text-lg mb-1">Goods Receiving Inspection</p>
          <p className="text-center text-gray-700">Date: {printDate}</p>
          <div className="mt-6 mb-8 border-2 border-gray-800 p-4">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm font-semibold mb-1">Total Orders</p>
                <p className="text-2xl font-bold">{selectedOrders.length}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Total Parts</p>
                <p className="text-2xl font-bold">{totalParts}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Document ID</p>
                <p className="text-lg font-mono">{`CHK-${Date.now().toString().slice(-8)}`}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Print Orders */}
        {selectedOrders.map((order, orderIndex) => (
          <div key={order.id} className="checklist-print-order">
            <div className="order-header">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Order #{order.orderNumber}</h2>
                <span className="text-sm bg-gray-200 px-3 py-1 rounded">
                  Order {orderIndex + 1} of {selectedOrders.length}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm border-2 border-gray-300 p-3 bg-gray-50">
                <div>
                  <p className="font-bold mb-1">Supplier:</p>
                  <p>{order.supplier.name}</p>
                </div>
                <div>
                  <p className="font-bold mb-1">Order Date:</p>
                  <p>{new Date(order.orderDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="font-bold mb-1">Expected Delivery:</p>
                  <p>{new Date(order.expectedDelivery).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="font-bold mb-1">Total Parts:</p>
                  <p>{order.parts.length} items</p>
                </div>
              </div>
            </div>

            <table className="checklist-print-table">
              <thead>
                <tr>
                  <th className="w-12">✓</th>
                  <th className="text-left">Part Number</th>
                  <th className="text-left">Part Name</th>
                  <th className="text-left">Description</th>
                  <th className="text-center w-16">Qty</th>
                  <th className="text-left w-48">Condition / Notes</th>
                </tr>
              </thead>
              <tbody>
                {order.parts.map((orderPart) => (
                  <tr key={orderPart.id}>
                    <td className="text-center">
                      <div className="print-checkbox"></div>
                    </td>
                    <td className="font-mono font-bold">{orderPart.part.partNumber}</td>
                    <td className="font-semibold">{orderPart.part.name}</td>
                    <td className="text-sm">
                      {orderPart.part.description.length > 100
                        ? `${orderPart.part.description.substring(0, 100)}...`
                        : orderPart.part.description}
                    </td>
                    <td className="text-center font-bold">{orderPart.quantity}</td>
                    <td>
                      <div className="print-notes-line"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {order.notes && (
              <div className="mt-4 border-2 border-yellow-600 bg-yellow-50 p-3">
                <p className="font-bold mb-1 text-sm">⚠ Order Notes:</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        ))}

        {/* Print Footer */}
        <div className="checklist-print-footer">
          <div className="border-t-4 border-gray-800 pt-6 mt-8">
            <div className="grid grid-cols-3 gap-8 mb-8">
              <div>
                <p className="font-bold mb-2">Received By:</p>
                <div className="print-signature-line"></div>
                <p className="text-xs text-gray-600 mt-1">Name (Print)</p>
              </div>
              <div>
                <p className="font-bold mb-2">Date & Time:</p>
                <div className="print-signature-line"></div>
                <p className="text-xs text-gray-600 mt-1">DD/MM/YYYY - HH:MM</p>
              </div>
              <div>
                <p className="font-bold mb-2">Signature:</p>
                <div className="print-signature-line"></div>
                <p className="text-xs text-gray-600 mt-1">Authorized Signature</p>
              </div>
            </div>

            <div className="border-2 border-gray-800 p-4 bg-gray-50">
              <p className="font-bold mb-3 text-sm">DISCREPANCIES / DAMAGE REPORT:</p>
              <div className="space-y-3">
                <div className="print-notes-line-thick"></div>
                <div className="print-notes-line-thick"></div>
                <div className="print-notes-line-thick"></div>
                <div className="print-notes-line-thick"></div>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Note: Report any missing, damaged, or incorrect items immediately to procurement department.
              </p>
            </div>

            <div className="text-center text-xs text-gray-500 mt-6">
              <p>Generated: {new Date().toLocaleString()} | Document ID: CHK-{Date.now().toString().slice(-8)}</p>
            </div>
          </div>
        </div>
    </div>
  );

  return (
    <>
      {/* Modal Overlay - Hidden during print */}
      <div
        className="checklist-modal-overlay screen-only fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50"
        onClick={onClose}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="min-h-screen px-4 py-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl mx-auto">
            {/* Modal Header - Hidden during print */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Arrival Checklist
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content - Visible both on screen and print */}
            <div className="p-8">
              <div className="mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedOrders.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Parts</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalParts}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrders.map((order, orderIndex) => (
                <div
                  key={order.id}
                  className="mb-8"
                >
                  <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 border-b-2 border-gray-300 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          Order #{order.orderNumber}
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {orderIndex + 1} of {selectedOrders.length}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 font-semibold">Supplier</p>
                          <p className="text-gray-900 dark:text-gray-100 font-medium">{order.supplier.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 font-semibold">Order Date</p>
                          <p className="text-gray-900 dark:text-gray-100">{new Date(order.orderDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 font-semibold">Expected Delivery</p>
                          <p className="text-gray-900 dark:text-gray-100">{new Date(order.expectedDelivery).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 font-semibold">Total Parts</p>
                          <p className="text-gray-900 dark:text-gray-100">{order.parts.length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full checklist-table">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-16">
                              ✓
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Part Number
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Part Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-48">
                              Condition / Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {order.parts.map((orderPart) => (
                            <tr
                              key={orderPart.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <td className="px-4 py-4 text-center">
                                <div className="checklist-checkbox"></div>
                              </td>
                              <td className="px-4 py-4 text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                                {orderPart.part.partNumber}
                              </td>
                              <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {orderPart.part.name}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                                {orderPart.part.description.length > 80
                                  ? `${orderPart.part.description.substring(0, 80)}...`
                                  : orderPart.part.description}
                              </td>
                              <td className="px-4 py-4 text-sm text-center font-bold text-gray-900 dark:text-gray-100">
                                {orderPart.quantity}
                              </td>
                              <td className="px-4 py-4">
                                <div className="checklist-notes-line"></div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Order Notes:</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.notes}</p>
                    </div>
                  )}
                </div>
              ))}

              <div className="mt-12 border-t-2 border-gray-300 dark:border-gray-600 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Checked By:</p>
                    <div className="signature-line"></div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date Checked:</p>
                    <div className="signature-line"></div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Signature:</p>
                    <div className="signature-line"></div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Additional Notes / Discrepancies:</p>
                  <div className="space-y-3">
                    <div className="notes-line"></div>
                    <div className="notes-line"></div>
                    <div className="notes-line"></div>
                    <div className="notes-line"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Render print content directly to document.body using portal */}
      {createPortal(printContent, document.body)}
    </>
  );
};

export default ArrivalChecklistModal;
