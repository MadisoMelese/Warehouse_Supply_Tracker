import { useEffect, useState } from 'react';
import { movementsAPI, itemsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const Movements = () => {
  const { user, isAdmin } = useAuth();
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filters, setFilters] = useState({
    itemId: '',
    type: '',
    status: '',
    from: '',
    to: '',
  });
  const [formData, setFormData] = useState({
    itemId: '',
    type: 'OUTBOUND',
    quantity: 1,
    notes: '',
  });
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    fetchItems();
    fetchMovements();
  }, [filters]);

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll({ status: 'AVAILABLE' });
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
      if (filters.status) params.status = filters.status;
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

  const showBanner = (type, text) => {
    setBanner({
      type,
      text,
      id: Date.now()
    });
  };

  const dismissBanner = () => setBanner(null);

  const getBannerVariant = (type) => {
    const variants = {
      success: {
        wrapper: 'border-green-200 bg-green-50 text-green-900',
        icon: '✅'
      },
      info: {
        wrapper: 'border-blue-200 bg-blue-50 text-blue-900',
        icon: 'ℹ️'
      },
      error: {
        wrapper: 'border-red-200 bg-red-50 text-red-900',
        icon: '⚠️'
      }
    };
    return variants[type] || variants.info;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await movementsAPI.create(formData);
      showBanner('success', 'Request submitted! Admins received an email and in-app alert.');
      setShowModal(false);
      setFormData({
        itemId: '',
        type: 'OUTBOUND',
        quantity: 1,
        notes: '',
      });
      setSelectedItem(null);
      await Promise.all([fetchMovements(), fetchItems()]);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create movement request';
      setError(message);
      showBanner('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this request?')) return;

    try {
      await movementsAPI.approve(id);
      showBanner('success', 'Movement approved. The requester was emailed automatically.');
      await Promise.all([fetchMovements(), fetchItems()]);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to approve movement';
      showBanner('error', message);
    }
  };

  const handleReject = async () => {
    if (!selectedMovement) return;

    try {
      await movementsAPI.reject(selectedMovement.id, rejectReason);
      showBanner('info', 'Movement rejected. The requester was notified by email.');
      setShowRejectModal(false);
      setSelectedMovement(null);
      setRejectReason('');
      await Promise.all([fetchMovements(), fetchItems()]);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to reject movement';
      showBanner('error', message);
    }
  };

  const handleReturn = async (id) => {
    if (!window.confirm('Are you sure you want to return this item?')) return;

    try {
      await movementsAPI.returnItem(id);
      showBanner('info', 'Return recorded. Inventory was updated.');
      await Promise.all([fetchMovements(), fetchItems()]);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to return item';
      showBanner('error', message);
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
      type: 'OUTBOUND',
      quantity: 1,
      notes: '',
    });
    setSelectedItem(null);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
  };

  const openRejectModal = (movement) => {
    setSelectedMovement(movement);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedMovement(null);
    setRejectReason('');
  };

  const clearFilters = () => {
    setFilters({
      itemId: '',
      type: '',
      status: '',
      from: '',
      to: '',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading && movements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const bannerVariant = banner ? getBannerVariant(banner.type) : null;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Movement Requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? 'Manage all movement requests' : 'Request to take or return items'}
          </p>
        </div>
        {!isAdmin && (
          <button
            onClick={openModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Request Movement
          </button>
        )}
      </div>

      {banner && (
        <div className={`mb-6 rounded-lg border ${bannerVariant.wrapper} p-4`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <span className="text-xl">{bannerVariant.icon}</span>
              <div>
                <p className="text-sm font-medium">{banner.text}</p>
                <p className="text-xs mt-1">
                  Emails are delivered via Nodemailer plus real-time in-app notifications.
                </p>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="text-sm font-medium hover:text-gray-900 focus:outline-none"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6 p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
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
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
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

      {/* Movements List */}
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested By
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved By
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{movement.item?.name}</div>
                    <div className="text-sm text-gray-500">{movement.item?.sku}</div>
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
                    {getStatusBadge(movement.status)}
                    {movement.type === 'OUTBOUND' && movement.status === 'APPROVED' && (
                      <div className="mt-1">
                        {movement.isReturned ? (
                          <span className="text-xs text-green-600">✓ Returned</span>
                        ) : (
                          <span className="text-xs text-yellow-600">Not Returned</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.requestedBy?.email || 'N/A'}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.approvedBy?.email || '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(movement.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {isAdmin && movement.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(movement.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(movement)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {movement.type === 'OUTBOUND' && 
                       movement.status === 'APPROVED' && 
                       !movement.isReturned &&
                       (!isAdmin || movement.requestedById === user?.id) && (
                        <button
                          onClick={() => handleReturn(movement.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Return
                        </button>
                      )}
                      {movement.notes && (
                        <span className="text-gray-400" title={movement.notes}>
                          📝
                        </span>
                      )}
                    </div>
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

      {/* Request Modal */}
      {showModal && (
  <div className="fixed z-50 inset-0 overflow-y-auto">
  <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
    
    {/* Overlay */}
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>

    {/* Trick for centering */}
    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

    <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50 relative">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Request Movement
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
                      {selectedItem && formData.type === 'OUTBOUND' && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Available Stock:</span> {selectedItem.currentStock}
                          </p>
                          {selectedItem.currentStock < formData.quantity && (
                            <p className="text-sm text-red-600 mt-1">
                              ⚠️ Insufficient stock! Available: {selectedItem.currentStock}
                            </p>
                          )}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <textarea
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Reason for this request..."
                      />
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <p className="text-sm text-yellow-800">
                        ⓘ This request will be pending until an admin approves it.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading || (selectedItem && formData.type === 'OUTBOUND' && selectedItem.currentStock < formData.quantity)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
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

      {/* Reject Modal */}
      {showRejectModal && selectedMovement && (
        <div className="fixed z-50 inset-0 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeRejectModal}
              aria-hidden="true"
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50 relative">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Reject Movement Request
                </h3>
                <div className="mb-4 space-y-1">
                  <p className="text-sm text-gray-700">
                    Item: <span className="font-medium">{selectedMovement.item?.name}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    Type: <span className="font-medium">{selectedMovement.type}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    Quantity: <span className="font-medium">{selectedMovement.quantity}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    rows={4}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    autoFocus
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleReject}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Reject
                </button>
                <button
                  onClick={closeRejectModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Movements;
