import { useEffect, useState } from 'react';
import { trackingAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const Tracking = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    itemId: '',
    isReturned: '',
    status: '',
  });

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [activeTab, filters, isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'assignments') {
        const params = {};
        if (filters.userId) params.userId = filters.userId;
        if (filters.itemId) params.itemId = filters.itemId;
        if (filters.isReturned !== '') params.isReturned = filters.isReturned === 'true';
        if (filters.status) params.status = filters.status;
        
        const response = await trackingAPI.getAssignments(params);
        setAssignments(response.data.assignments || []);
      } else if (activeTab === 'activity') {
        const response = await trackingAPI.getUserActivity();
        setUserActivity(response.data.users || []);
      } else if (activeTab === 'pending') {
        const response = await trackingAPI.getPendingRequests();
        setPendingRequests(response.data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tracking & Monitoring</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor item assignments and user activity</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`${
              activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Item Assignments
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            User Activity
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div>
          <div className="bg-white shadow rounded-lg mb-6 p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Return Status</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filters.isReturned}
                  onChange={(e) => setFilters({ ...filters, isReturned: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="false">Not Returned</option>
                  <option value="true">Returned</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Item Status</label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="ISSUED">Issued</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No assignments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Approved By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{assignment.item.name}</div>
                          <div className="text-sm text-gray-500">Barcode: {assignment.item.barcode}</div>
                          <div className="text-sm text-gray-500">Category: {assignment.item.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assignment.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {assignment.requestedBy.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {assignment.approvedBy?.email || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignment.isReturned ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Returned
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Not Returned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(assignment.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Activity Tab */}
      {activeTab === 'activity' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : userActivity.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No user activity found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {userActivity.map((user) => (
                <div key={user.userId} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{user.email}</h3>
                      <p className="text-sm text-gray-500">Role: {user.role}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total Requests</div>
                      <div className="text-2xl font-bold text-gray-900">{user.stats.totalRequests}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-500">Approved</div>
                      <div className="text-lg font-semibold text-green-600">{user.stats.approved}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Pending</div>
                      <div className="text-lg font-semibold text-yellow-600">{user.stats.pending}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Rejected</div>
                      <div className="text-lg font-semibold text-red-600">{user.stats.rejected}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Returned</div>
                      <div className="text-lg font-semibold text-blue-600">{user.stats.returned}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Not Returned</div>
                      <div className="text-lg font-semibold text-orange-600">{user.stats.notReturned}</div>
                    </div>
                  </div>

                  {user.currentItems && user.currentItems.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Current Items:</h4>
                      <div className="space-y-2">
                        {user.currentItems.map((item) => (
                          <div key={item.movementId} className="bg-gray-50 rounded-md p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.item.name}</p>
                                <p className="text-xs text-gray-500">Barcode: {item.item.barcode}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-900">Qty: {item.quantity}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(item.takenAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Requests Tab */}
      {activeTab === 'pending' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No pending requests</p>
            </div>
          ) : (
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
                        Requested By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{request.item.name}</div>
                          <div className="text-sm text-gray-500">{request.item.sku}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              request.type === 'INBOUND'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {request.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.requestedBy.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <a
                            href="/movements"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Review →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tracking;

