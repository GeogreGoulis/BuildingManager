import React from 'react';
import { useAuth } from '../../app/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      label: 'Συνολικά Έξοδα (Τρέχων Μήνας)',
      value: '€2,450.00',
      change: '+12.5%',
      trend: 'up',
      icon: '💰',
    },
    {
      label: 'Εκκρεμείς Πληρωμές',
      value: '€3,200.00',
      change: '-5.2%',
      trend: 'down',
      icon: '⏳',
    },
    {
      label: 'Διαμερίσματα',
      value: '12',
      icon: '🏢',
    },
    {
      label: 'Ποσοστό Είσπραξης',
      value: '87%',
      change: '+3%',
      trend: 'up',
      icon: '📊',
    },
  ];

  const recentActivity = [
    { type: 'expense', description: 'Νέο έξοδο: Ηλεκτρικό ρεύμα', amount: '€320.50', date: '13/01/2026' },
    { type: 'payment', description: 'Πληρωμή από Διαμ. Α1', amount: '€150.00', date: '12/01/2026' },
    { type: 'announcement', description: 'Νέα ανακοίνωση: Συνέλευση ιδιοκτητών', date: '10/01/2026' },
    { type: 'expense', description: 'Νέο έξοδο: Καθαριότητα', amount: '€180.00', date: '08/01/2026' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Καλώς ήρθατε, {user?.firstName}!
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Τρέχουσα Περίοδος</p>
          <p className="text-lg font-semibold text-gray-900">Ιανουάριος 2026</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
              {stat.change && (
                <span
                  className={`text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Πρόσφατη Δραστηριότητα</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                  </div>
                  {activity.amount && (
                    <span className="text-sm font-semibold text-gray-900 ml-4">
                      {activity.amount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200">
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Προβολή όλων →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Γρήγορες Ενέργειες</h2>
          </div>
          <div className="p-6 space-y-3">
            <button className="w-full text-left px-4 py-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-xl mr-3">➕</span>
                <div>
                  <p className="font-medium text-gray-900">Νέο Έξοδο</p>
                  <p className="text-sm text-gray-600">Καταχώρηση νέου εξόδου</p>
                </div>
              </div>
            </button>
            
            <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-xl mr-3">🧾</span>
                <div>
                  <p className="font-medium text-gray-900">Υπολογισμός Κοινοχρήστων</p>
                  <p className="text-sm text-gray-600">Για την τρέχουσα περίοδο</p>
                </div>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-xl mr-3">💳</span>
                <div>
                  <p className="font-medium text-gray-900">Καταχώρηση Πληρωμής</p>
                  <p className="text-sm text-gray-600">Νέα πληρωμή διαμερίσματος</p>
                </div>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-xl mr-3">📢</span>
                <div>
                  <p className="font-medium text-gray-900">Νέα Ανακοίνωση</p>
                  <p className="text-sm text-gray-600">Ενημέρωση ιδιοκτητών</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Επερχόμενες Ενέργειες</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-xl mr-3">⚠️</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Κλείδωμα περιόδου Ιανουαρίου</p>
                <p className="text-sm text-gray-600">Προθεσμία: 31/01/2026</p>
              </div>
            </div>
            <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xl mr-3">📅</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Συνέλευση ιδιοκτητών</p>
                <p className="text-sm text-gray-600">25/01/2026 στις 18:00</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
