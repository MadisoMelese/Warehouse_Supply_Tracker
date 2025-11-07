import { useEffect, useState } from 'react';
import { movementsAPI, itemsAPI } from '../services/api';

const Movements = () => {
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    itemId: '',
    type: '',
    from: '',
    to: '',
  });
  const [formData, setFormData] = useState({
    itemId: '',
    type: 'INBOUND',
    quantity: 1,
  });
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchMovements();
  }, [filters]);

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll();
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.itemId) params.itemId = filters.itemId;
      if (filters.type) params.type = filters.type;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const response = await movementsAPI.getAll(params);
      setMovements(response.data);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await movementsAPI.create(formData);
      setShowModal(false);
      setFormData({
        itemId: '',
        type: 'INBOUND',
        quantity: 1,
      });
      setSelectedItem(null);
      await Promise.all([fetchMovements(), fetchItems()]);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create movement');
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (e) => {
    const itemId = e.target.value;
    setFormData({ ...formData, itemId });
    const item = items.find((i) => i.id === Number(itemId));
    setSelectedItem(item);
  };

  const openModal = () => {
    setFormData({
      itemId: '',
      type: 'INBOUND',
      quantity: 1,
    });
    setSelectedItem(null);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
  };

  const clearFilters = () => {
    setFilters({
      itemId: '',
      type: '',
      from: '',
      to: '',
    });
  };

  if (loading && movements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Movements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track all inbound and outbound stock transactions
          </p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Movement
        </button>
      </div>

      <div className="bg-white shadow rounded-lg mb-6 p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Item</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={filters.itemId}
              onChange={(e) => setFilters({ ...filters, itemId: e.target.value })}
            >
              <option value="">All Items</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">From Date</label>
            <input
              type="date"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To Date</label>
            <input
              type="date"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{movement.item.name}</div>
                    <div className="text-sm text-gray-500">{movement.item.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        movement.type === 'INBOUND'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {movement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{movement.item.currentStock}</div>
                    {movement.item.currentStock < movement.item.lowStockThreshold && (
                      <div className="text-xs text-red-600">Low Stock</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(movement.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No movements found</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={closeModal}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Record Movement
                  </h3>
                  {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-800">{error}</div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Item *</label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.itemId}
                        onChange={handleItemChange}
                      >
                        <option value="">Select an item</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.sku}) - Stock: {item.currentStock}
                          </option>
                        ))}
                      </select>
                      {selectedItem && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Current Stock:</span> {selectedItem.currentStock}
                          </p>
                          <p className="text-sm text-gray-700 mt-1">
                            <span className="font-medium">After {formData.type}:</span>{' '}
                            <span className={formData.type === 'OUTBOUND' && selectedItem.currentStock - formData.quantity < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                              {formData.type === 'INBOUND'
                                ? selectedItem.currentStock + formData.quantity
                                : selectedItem.currentStock - formData.quantity}
                            </span>
                            {formData.type === 'OUTBOUND' && selectedItem.currentStock - formData.quantity < 0 && (
                              <span className="ml-2 text-red-600 text-xs">⚠️ Insufficient stock!</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type *</label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="INBOUND">Inbound (+)</option>
                        <option value="OUTBOUND">Outbound (-)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading || (selectedItem && formData.type === 'OUTBOUND' && selectedItem.currentStock - formData.quantity < 0)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Recording...' : 'Record'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Movements;

