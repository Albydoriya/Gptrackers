import React, { useEffect, useState } from 'react';
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

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 print:bg-white"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="min-h-screen px-4 py-8 print:p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl mx-auto print:shadow-none print:max-w-full print:rounded-none">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between print:hidden z-10">
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

          <div className="p-8 print:p-12">
            <div className="print:block hidden mb-8">
              <h1 className="text-3xl font-bold text-center mb-2">Arrival Checklist</h1>
              <p className="text-center text-gray-600">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="mb-6 print:mb-8">
              <div className="bg-blue-50 dark:bg-blue-900/20 print:bg-gray-100 border border-blue-200 dark:border-blue-800 print:border-black rounded-lg p-4 print:rounded-none">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">Total Orders</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-black">{selectedOrders.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">Total Parts</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 print:text-black">{totalParts}</p>
                  </div>
                </div>
              </div>
            </div>

            {selectedOrders.map((order, orderIndex) => (
              <div
                key={order.id}
                className="mb-8 print:mb-12 print:break-inside-avoid"
                style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
              >
                <div className="border-2 border-gray-300 dark:border-gray-600 print:border-black rounded-lg print:rounded-none overflow-hidden">
                  <div className="bg-gray-100 dark:bg-gray-700 print:bg-gray-200 px-6 py-4 border-b-2 border-gray-300 dark:border-gray-600 print:border-black">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 print:text-black">
                        Order #{order.orderNumber}
                      </h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400 print:text-black">
                        {orderIndex + 1} of {selectedOrders.length}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 print:text-black font-semibold">Supplier</p>
                        <p className="text-gray-900 dark:text-gray-100 print:text-black font-medium">{order.supplier.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 print:text-black font-semibold">Order Date</p>
                        <p className="text-gray-900 dark:text-gray-100 print:text-black">{new Date(order.orderDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 print:text-black font-semibold">Expected Delivery</p>
                        <p className="text-gray-900 dark:text-gray-100 print:text-black">{new Date(order.expectedDelivery).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 print:text-black font-semibold">Total Parts</p>
                        <p className="text-gray-900 dark:text-gray-100 print:text-black">{order.parts.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100 border-b border-gray-300 dark:border-gray-600 print:border-black">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 print:text-black uppercase tracking-wider w-16">
                            <input type="checkbox" disabled className="print:appearance-none print:border print:border-black print:w-4 print:h-4" />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 print:text-black uppercase tracking-wider">
                            Part Number
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 print:text-black uppercase tracking-wider">
                            Part Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 print:text-black uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 print:text-black uppercase tracking-wider w-24">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 print:text-black uppercase tracking-wider w-48">
                            Notes / Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 print:divide-black">
                        {order.parts.map((orderPart) => (
                          <tr
                            key={orderPart.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 print:hover:bg-white transition-colors"
                          >
                            <td className="px-4 py-4 text-center">
                              <input
                                type="checkbox"
                                className="h-5 w-5 rounded border-gray-300 dark:border-gray-600 print:appearance-none print:border-2 print:border-black print:w-5 print:h-5"
                                disabled
                              />
                            </td>
                            <td className="px-4 py-4 text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 print:text-black">
                              {orderPart.part.partNumber}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 print:text-black">
                              {orderPart.part.name}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 print:text-black">
                              {orderPart.part.description.length > 80
                                ? `${orderPart.part.description.substring(0, 80)}...`
                                : orderPart.part.description}
                            </td>
                            <td className="px-4 py-4 text-sm text-center font-bold text-gray-900 dark:text-gray-100 print:text-black">
                              {orderPart.quantity}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500 print:text-gray-300">
                              <div className="h-8 border-b border-dashed border-gray-300 dark:border-gray-600 print:border-black"></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {order.notes && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 print:bg-gray-100 border border-yellow-200 dark:border-yellow-800 print:border-black rounded print:rounded-none">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 print:text-black mb-1">Order Notes:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">{order.notes}</p>
                  </div>
                )}
              </div>
            ))}

            <div className="mt-12 print:mt-16 border-t-2 border-gray-300 dark:border-gray-600 print:border-black pt-8 print:break-inside-avoid">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 print:text-black mb-2">Checked By:</p>
                  <div className="border-b-2 border-gray-400 dark:border-gray-500 print:border-black h-10"></div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 print:text-black mb-2">Date Checked:</p>
                  <div className="border-b-2 border-gray-400 dark:border-gray-500 print:border-black h-10"></div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 print:text-black mb-2">Signature:</p>
                  <div className="border-b-2 border-gray-400 dark:border-gray-500 print:border-black h-10"></div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 print:bg-white border border-gray-300 dark:border-gray-600 print:border-black rounded print:rounded-none">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 print:text-black mb-2">Additional Notes:</p>
                <div className="space-y-2">
                  <div className="border-b border-gray-400 dark:border-gray-500 print:border-black h-6"></div>
                  <div className="border-b border-gray-400 dark:border-gray-500 print:border-black h-6"></div>
                  <div className="border-b border-gray-400 dark:border-gray-500 print:border-black h-6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArrivalChecklistModal;
