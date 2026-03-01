'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { orderService } from '@/lib/api/order-service';
import { Order, OrderStatus } from '@/lib/types';
import { useAuthStore } from '@/lib/store/auth-store';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedToday, setCompletedToday] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    customers: 0,
    menuItems: 0,
    averageWaitTime: 0
  });

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!user?.branchId) return;
    
    try {
      setIsLoading(true);
      
      // Fetch active orders
      const active = await orderService.getActiveOrders();
      setActiveOrders(active);
      
      // Fetch completed orders today
      const today = format(new Date(), 'yyyy-MM-dd');
      const completed = await orderService.getOrders({
        status: 'COMPLETED' as OrderStatus,
        branchId: user.branchId,
        startDate: today,
        endDate: today
      });
      setCompletedToday(completed);
      
      // Calculate stats
      const allOrders = await orderService.getOrders({ branchId: user.branchId });
      const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const uniqueCustomers = new Set(allOrders.map(order => order.customerName || order.customerPhone)).size;
      
      // Calculate average wait time (time from order to completion)
      const completedOrdersWithTime = completed.filter(order => order.updatedAt && order.createdAt);
      const waitTimes = completedOrdersWithTime.map(order => {
        const created = new Date(order.createdAt).getTime();
        const completed = new Date(order.updatedAt).getTime();
        return (completed - created) / (1000 * 60); // Convert to minutes
      });
      const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length : 0;
      
      setStats({
        totalOrders: allOrders.length,
        revenue: totalRevenue,
        customers: uniqueCustomers,
        menuItems: 0, // This would come from menu service
        averageWaitTime: Math.round(avgWaitTime)
      });
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.branchId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [user?.branchId]);
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
      <div className="max-w-7xl mx-auto bg-white min-h-screen relative">
        
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 transition-all duration-300">
          <div className="flex items-center justify-between p-4">
            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <Link href="/staff" className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            </div>
            
            {/* Search Bar - Centered */}
            <div className="flex-1 max-w-md mx-auto">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search for dishes, restaurants..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                />
              </div>
            </div>
            
            {/* Action Icons */}
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group relative">
                <svg className="w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group">
                <svg className="w-6 h-6 text-gray-700 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row">
          {/* Main Content */}
          <main className="flex-1 lg:max-w-5xl">
            {/* Restaurant Info Card */}
            <section className="px-4 py-6 lg:px-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl overflow-hidden ring-2 ring-gray-100">
                    <img src="/api/placeholder/64/64" alt="Restaurant" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Jakarta Sans, sans-serif' }}>Name Of the restro</h2>
                    <div className="flex items-center text-sm text-gray-600 mt-2">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Location</span>
                      <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Navigation Tabs */}
            <section className="px-4 py-4 flex items-center justify-between lg:px-8">
              <div className="flex items-center space-x-3">
                <button className="px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all duration-200 hover:shadow-lg">
                  Menu
                </button>
                <button className="px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all duration-200 hover:shadow-lg">
                  Waffles
                </button>
                <button className="px-6 py-2.5 bg-gray-900 text-white rounded-full text-sm font-medium border-2 border-blue-500 hover:bg-gray-800 transition-all duration-200 hover:shadow-lg">
                  Live Orders
                </button>
              </div>
            </section>

            {/* Promocodes Banner */}
            <section className="px-4 py-2 lg:px-8">
              <div className="rounded-2xl p-4 border hover:shadow-md transition-all duration-300 cursor-pointer" style={{ backgroundColor: '#FEF0E3', borderColor: '#F5DEB3' }}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#DC2626' }}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: '#DC2626' }}>Dashboard Stats</span>
                    <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>Real-time business metrics</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats Cards */}
            <section className="px-4 py-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <span className="text-sm text-green-600 font-medium">Live</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      stats.totalOrders
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">Total Orders</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm text-green-600 font-medium">Rs</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      `Rs ${stats.revenue.toLocaleString()}`
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">Revenue</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="text-sm text-green-600 font-medium">Active</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      stats.customers
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">Customers</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-sm text-red-600 font-medium">Menu</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      stats.menuItems || '--'
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">Menu Items</p>
                </div>
              </div>
            </section>

            {/* Active Orders & Completed Today */}
            <section className="px-4 py-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Active Orders</h3>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {isLoading ? (
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      activeOrders.length
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">Orders currently being processed</p>
                </div>

                {/* Completed Today */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Completed Today</h3>
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {isLoading ? (
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      completedToday.length
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">Orders completed today</p>
                </div>
              </div>

              {/* Average Wait Time */}
              <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Average Wait Time</h3>
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {isLoading ? (
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {stats.averageWaitTime} <span className="text-lg font-normal text-gray-600">min</span>
                    </>
                  )}
                </div>
                <p className="text-gray-600 text-sm">Average time from order to completion</p>
              </div>
            </section>

            {/* Recent Orders */}
            <section className="px-4 pb-32 lg:px-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Orders</h2>
                
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((order) => (
                    <div key={order} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">#00{order}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900" style={{ fontFamily: 'Jakarta Sans, sans-serif' }}>Order #{order}</p>
                          <p className="text-sm text-gray-600">Table {order + 1}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${(order * 15.99).toFixed(2)}</p>
                        <p className="text-sm text-gray-600">2 min ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>

          {/* Desktop Sidebar - Quick Actions */}
          <aside className="hidden lg:block w-80 border-l border-gray-200 bg-gray-50">
            <div className="sticky top-24 p-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
                
                <div className="space-y-3">
                  <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200">
                    New Order
                  </button>
                  <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200">
                    View Reports
                  </button>
                  <button className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200">
                    Manage Menu
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-3">System Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Kitchen</span>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Orders</span>
                      <span className="text-green-600 font-medium">Normal</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Payment</span>
                      <span className="text-green-600 font-medium">Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
